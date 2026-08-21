import type { Product } from '../domain/product';
import type { GenerationRequestItem } from '../domain/generation-request';
import type { LayoutDefinition } from '../domain/layout';
import { CHANNEL_PRESETS } from '../data/channelPresets';
import { LAYOUTS } from '../data/layouts';
import { DOMAIN_PRODUCTS } from '../data/products';
import { composePlan } from '../engine/composePlan';
import type { BatchGenerationRequest, WorkOrder } from './types';

/**
 * Excel batch validation 결과(WorkOrder)를 실제 core 생성 엔진(composePlan/resolveLayout)에
 * 연결하는 단계. WorkOrder -> GenerationRequest 변환 -> composePlan -> Batch Preview용 판정.
 *
 * 이미 parser 단계(workOrderParser)에서 reviewRequired/error로 판정된 작업ID는 여기서
 * composePlan을 다시 시도하지 않는다 — 이미 확정된 판정을 임의로 덮어쓰지 않기 위함이다.
 * parser가 valid로 판정한 작업ID만 composePlan을 거쳐 ready/reviewRequired/error가 다시
 * 갈릴 수 있다(예: 검증된 Layout이 없어 generated fallback되면 reviewRequired).
 */

export type BatchPreviewStatus = 'ready' | 'reviewRequired' | 'error';

export interface BatchPreviewRow {
  workId: string;
  channelId: string | null;
  channelLabel: string | null;
  /** "소고기장조림×2 + 메추리알 장조림×3" 형태의 상품 구성 요약 */
  productSummary: string;
  totalQuantity: number;
  badge: boolean | null;
  status: BatchPreviewStatus;
  layoutKey: string | null;
  arrangementFamily: string | null;
  layoutSource: 'verified' | 'generated' | null;
  /** error/reviewRequired일 때의 사유. ready면 null. */
  reason: string | null;
}

export interface BatchPreviewSummary {
  total: number;
  ready: number;
  reviewRequired: number;
  error: number;
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

function composeRow(wo: WorkOrder, products: Product[], layouts: LayoutDefinition[]): BatchPreviewRow {
  const base = {
    workId: wo.workId,
    channelId: wo.channelId,
    channelLabel: wo.channelLabel,
    productSummary: productSummary(wo),
    totalQuantity: wo.totalQuantity,
    badge: wo.badge,
  };

  // parser 단계에서 이미 reviewRequired/error로 확정된 작업ID는 composePlan을 시도하지 않는다
  // (예: 비고가 있거나 수량/상품코드가 잘못된 경우 — 임의로 생성을 시도하지 않는다).
  if (wo.status !== 'valid') {
    return {
      ...base,
      status: wo.status,
      layoutKey: null,
      arrangementFamily: null,
      layoutSource: null,
      reason: wo.issues.map((i) => i.message).join(' / ') || null,
    };
  }

  const channelPreset = CHANNEL_PRESETS.find((p) => p.channelId === wo.channelId);
  if (!channelPreset) {
    return {
      ...base,
      status: 'error',
      layoutKey: null,
      arrangementFamily: null,
      layoutSource: null,
      reason: `채널 "${wo.channelLabel ?? wo.channelId}"에 대한 출력 규격(channelPreset)이 아직 등록되어 있지 않습니다.`,
    };
  }

  const items: GenerationRequestItem[] = wo.lines.map((l) => ({
    productId: l.productCode as string,
    quantity: l.quantity as number,
  }));

  const result = composePlan(
    {
      items,
      channelPresetId: channelPreset.id,
      options: wo.badge === null ? undefined : { badge: { enabled: wo.badge } },
    },
    { products, channelPresets: CHANNEL_PRESETS, layouts },
  );

  if (result.ok) {
    const arrangementFamily =
      result.plan.layoutSource.kind === 'generated'
        ? result.plan.layoutSource.params.familyId
        : arrangementLabelForLayoutKey(result.plan.layoutKey, layouts);
    return {
      ...base,
      status: result.plan.reviewRequired ? 'reviewRequired' : 'ready',
      layoutKey: result.plan.layoutKey,
      arrangementFamily,
      layoutSource: result.plan.layoutSource.kind,
      reason: result.plan.reviewRequired
        ? '검증된(verified) Layout이 없어 배치 family 공식으로 자동 생성되었습니다. 실제 사용 전 검토가 필요합니다.'
        : null,
    };
  }

  return {
    ...base,
    status: result.reviewRequired ? 'reviewRequired' : 'error',
    layoutKey: null,
    arrangementFamily: null,
    layoutSource: null,
    reason: result.message,
  };
}

export function composeBatchPreview(
  batch: BatchGenerationRequest,
  deps: { products?: Product[]; layouts?: LayoutDefinition[] } = {},
): BatchPreviewResult {
  const products = deps.products ?? DOMAIN_PRODUCTS;
  const layouts = deps.layouts ?? LAYOUTS;
  const rows = batch.workOrders.map((wo) => composeRow(wo, products, layouts));

  return {
    sourceFileName: batch.sourceFileName,
    rows,
    summary: {
      total: rows.length,
      ready: rows.filter((r) => r.status === 'ready').length,
      reviewRequired: rows.filter((r) => r.status === 'reviewRequired').length,
      error: rows.filter((r) => r.status === 'error').length,
    },
  };
}
