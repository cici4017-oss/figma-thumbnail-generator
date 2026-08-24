import type { Product } from '../domain/product';
import type { AspectRatioFamily, ChannelPreset } from '../domain/channel';
import type { GenerationRequestItem } from '../domain/generation-request';
import type { LayoutDefinition } from '../domain/layout';
import { CHANNEL_PRESETS } from '../data/channelPresets';
import { LAYOUTS } from '../data/layouts';
import { DOMAIN_PRODUCTS } from '../data/products';
import { composeChannelOutputs } from '../engine/composeChannelOutputs';
import type { BatchGenerationRequest, WorkOrder } from './types';

/**
 * Excel batch validation 결과(WorkOrder)를 실제 core 생성 엔진(composeChannelOutputs ->
 * composePlan/resolveLayout)에 연결하는 단계.
 *
 * 표준 Excel에서는 작업자가 채널(예: "카카오")만 고르고 출력 규격은 고르지 않는다 — 한
 * 채널이 여러 ChannelPreset(예: 1000x1000 + 750x422)을 가지면 그 작업ID는 등록된 preset
 * 수만큼 output으로 fan-out된다(composeChannelOutputs가 담당, composePlan 자체는 여전히
 * preset 1개당 결과 1개만 책임진다).
 *
 * parser 단계(workOrderParser)에서 이미 reviewRequired/error로 판정된 작업ID는 fan-out을
 * 시도하지 않는다 — 이미 확정된 판정을 임의로 덮어쓰지 않기 위함이다(outputs는 빈 배열).
 * parser가 valid로 판정한 작업ID만 채널의 모든 preset에 대해 독립적으로 ready/reviewRequired/
 * error가 갈린다 — 한 preset이 generated fallback(reviewRequired)이 되어도 같은 작업ID의
 * 다른 preset 결과에는 영향을 주지 않는다(status는 output 단위로 관리).
 */

export type BatchPreviewStatus = 'ready' | 'reviewRequired' | 'error';

export interface BatchPreviewOutput {
  channelPresetId: string;
  aspectRatioFamily: AspectRatioFamily;
  frameWidth: number;
  frameHeight: number;
  status: BatchPreviewStatus;
  layoutKey: string | null;
  arrangementFamily: string | null;
  layoutSource: 'verified' | 'generated' | null;
  /** error/reviewRequired일 때의 사유. ready면 null. */
  reason: string | null;
}

export interface BatchPreviewRow {
  workId: string;
  channelId: string | null;
  channelLabel: string | null;
  /** "소고기장조림×2 + 메추리알 장조림×3" 형태의 상품 구성 요약 */
  productSummary: string;
  totalQuantity: number;
  badge: boolean | null;
  /**
   * 작업ID 전체를 대표하는 요약 상태(outputs 중 최악의 상태: error > reviewRequired > ready).
   * 필터/요약 UI 편의용이며, 개별 output의 실제 status/reason을 대체하지 않는다 — 실제 판단은
   * 항상 outputs 각각을 봐야 한다.
   */
  overallStatus: BatchPreviewStatus;
  /**
   * parser 단계에서 이미 reviewRequired/error로 확정되어 채널 fan-out을 시도하지 않은 경우의
   * 사유. 이 경우 outputs는 빈 배열이다.
   */
  parserReason: string | null;
  /** 채널에 등록된 preset 수만큼 생성되는 출력별 결과. parser 단계에서 걸러진 경우 빈 배열. */
  outputs: BatchPreviewOutput[];
}

export interface BatchStatusCounts {
  ready: number;
  reviewRequired: number;
  error: number;
}

/**
 * workOrder(작업ID) 단위 집계와 output(=fan-out 이후 실제 생성될 썸네일 단위) 집계는 서로
 * 다른 수치다 — 하나의 작업ID가 채널 preset 수만큼 여러 output으로 갈리기 때문에
 * totalWorkOrders와 totalOutputs가 다를 수 있고(예: 채널이 square+wide 둘 다면 작업ID 1개가
 * output 2개), workOrderStatusSummary(overallStatus 기준)와 outputStatusSummary(output별
 * status 기준)도 서로 다른 합계를 가질 수 있다. 실제로 생성될 썸네일 개수/상태를 보려면
 * totalOutputs/outputStatusSummary를 봐야 한다.
 */
export interface BatchPreviewSummary {
  totalWorkOrders: number;
  totalOutputs: number;
  workOrderStatusSummary: BatchStatusCounts;
  outputStatusSummary: BatchStatusCounts;
}

export interface BatchPreviewResult {
  sourceFileName: string;
  rows: BatchPreviewRow[];
  summary: BatchPreviewSummary;
}

function productSummary(wo: WorkOrder): string {
  return wo.lines.map((l) => `${l.productName || '(상품명 없음)'}×${l.quantity ?? '?'}`).join(' + ');
}

function arrangementLabelForLayoutKey(layoutKey: string, layouts: LayoutDefinition[]): string | null {
  return layouts.find((l) => l.layoutKey === layoutKey)?.arrangementKind ?? null;
}

function worstStatus(statuses: BatchPreviewStatus[]): BatchPreviewStatus {
  if (statuses.some((s) => s === 'error')) return 'error';
  if (statuses.some((s) => s === 'reviewRequired')) return 'reviewRequired';
  return 'ready';
}

function countByStatus(statuses: BatchPreviewStatus[]): BatchStatusCounts {
  return {
    ready: statuses.filter((s) => s === 'ready').length,
    reviewRequired: statuses.filter((s) => s === 'reviewRequired').length,
    error: statuses.filter((s) => s === 'error').length,
  };
}

function composeRow(
  wo: WorkOrder,
  products: Product[],
  channelPresets: ChannelPreset[],
  layouts: LayoutDefinition[],
): BatchPreviewRow {
  const base = {
    workId: wo.workId,
    channelId: wo.channelId,
    channelLabel: wo.channelLabel,
    productSummary: productSummary(wo),
    totalQuantity: wo.totalQuantity,
    badge: wo.badge,
  };

  // parser 단계에서 이미 reviewRequired/error로 확정된 작업ID는 fan-out을 시도하지 않는다
  // (예: 비고가 있거나 수량/상품코드가 잘못된 경우 — 임의로 생성을 시도하지 않는다).
  if (wo.status !== 'valid') {
    return {
      ...base,
      overallStatus: wo.status,
      parserReason: wo.issues.map((i) => i.message).join(' / ') || null,
      outputs: [],
    };
  }

  const items: GenerationRequestItem[] = wo.lines.map((l) => ({
    productId: l.productCode as string,
    quantity: l.quantity as number,
  }));

  const fanout = composeChannelOutputs(
    {
      items,
      channelId: wo.channelId as string,
      options: wo.badge === null ? undefined : { badge: { enabled: wo.badge } },
    },
    { products, channelPresets, layouts },
  );

  if (!fanout.ok) {
    return { ...base, overallStatus: 'error', parserReason: fanout.message, outputs: [] };
  }

  const outputs: BatchPreviewOutput[] = fanout.outputs.map((output) => {
    const shared = {
      channelPresetId: output.channelPresetId,
      aspectRatioFamily: output.aspectRatioFamily,
      frameWidth: output.frameWidth,
      frameHeight: output.frameHeight,
    };

    if (output.result.ok) {
      const { plan } = output.result;
      const arrangementFamily =
        plan.layoutSource.kind === 'generated'
          ? plan.layoutSource.params.familyId
          : arrangementLabelForLayoutKey(plan.layoutKey, layouts);
      return {
        ...shared,
        status: plan.reviewRequired ? 'reviewRequired' : 'ready',
        layoutKey: plan.layoutKey,
        arrangementFamily,
        layoutSource: plan.layoutSource.kind,
        reason: plan.reviewRequired
          ? '검증된(verified) Layout이 없어 배치 family 공식으로 자동 생성되었습니다. 실제 사용 전 검토가 필요합니다.'
          : null,
      };
    }

    return {
      ...shared,
      status: output.result.reviewRequired ? 'reviewRequired' : 'error',
      layoutKey: null,
      arrangementFamily: null,
      layoutSource: null,
      reason: output.result.message,
    };
  });

  return {
    ...base,
    overallStatus: worstStatus(outputs.map((o) => o.status)),
    parserReason: null,
    outputs,
  };
}

export function composeBatchPreview(
  batch: BatchGenerationRequest,
  deps: { products?: Product[]; channelPresets?: ChannelPreset[]; layouts?: LayoutDefinition[] } = {},
): BatchPreviewResult {
  const products = deps.products ?? DOMAIN_PRODUCTS;
  const channelPresets = deps.channelPresets ?? CHANNEL_PRESETS;
  const layouts = deps.layouts ?? LAYOUTS;
  const rows = batch.workOrders.map((wo) => composeRow(wo, products, channelPresets, layouts));
  const allOutputs = rows.flatMap((r) => r.outputs);

  return {
    sourceFileName: batch.sourceFileName,
    rows,
    summary: {
      totalWorkOrders: rows.length,
      totalOutputs: allOutputs.length,
      workOrderStatusSummary: countByStatus(rows.map((r) => r.overallStatus)),
      outputStatusSummary: countByStatus(allOutputs.map((o) => o.status)),
    },
  };
}
