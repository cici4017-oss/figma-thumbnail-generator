import type { Product, ChannelPreset, LayoutDefinition, GenerationRequestItem } from '@thumbnail-generator/core';
import { composeChannelOutputs } from '@thumbnail-generator/core';
import type { BatchGenerationRequest, WorkOrder } from '@thumbnail-generator/core/import';
import { renderPlan } from './renderer';
import { FIGMA_TEMPLATE_BINDINGS, type FigmaTemplateBinding } from './templateMapper';
import { renderGeneratedPlan, GENERATED_RENDERER_SUPPORT, type GeneratedRendererSupport } from './generatedRenderer';
import { checkRenderabilityForPlan } from './renderPreflight';

/**
 * Excel(BatchGenerationRequest) -> composeChannelOutputs -> 실제 Figma 생성까지 한 번에
 * 처리하는 batch render 오케스트레이션. composeBatch.ts(composeBatchPreview)와 동일한 원칙
 * (parser 단계에서 이미 확정된 work order는 fan-out을 시도하지 않음, output은 서로 독립적으로
 * 판정됨)으로 composeChannelOutputs를 다시 호출한다 — composeBatchPreview는 화면 표시용
 * 요약(BatchPreviewOutput)만 남기고 실제 CompositionPlan(슬롯별 assetKey)은 버리기 때문에,
 * 렌더링에 필요한 plan을 다시 얻으려면 같은 순수 함수를 다시 부르는 것이 core를 건드리지 않는
 * 가장 단순한 방법이다(결과는 항상 동일 — composeChannelOutputs는 부작용이 없다).
 *
 * 실제 Figma 쓰기는 기존 renderer.ts(verified)/generatedRenderer.ts(generated)를 그대로
 * 재사용한다 — 이 파일은 "어떤 output을 생성할지 결정 + 생성된 frame을 정리"만 담당한다.
 */

export const AUTO_GENERATED_VERIFIED_PAGE_NAME = 'AUTO_GENERATED_VERIFIED';
export const AUTO_GENERATED_REVIEW_PAGE_NAME = 'AUTO_GENERATED_REVIEW';

export interface BatchRenderOptions {
  /**
   * true면 reviewRequired(=generated) plan도 generated renderer가 실제로 지원하는 범위 내에서
   * 생성을 시도한다. 기본값 false — reviewRequired는 기본적으로 생성하지 않는다.
   */
  includeReviewRequired?: boolean;
}

export type BatchRenderOutcome =
  | 'generated'
  | 'skippedReviewRequired'
  | 'skippedNotRenderable'
  | 'skippedError'
  | 'failed';

export interface BatchRenderOutputResult {
  workOrderId: string;
  channelPresetId: string;
  layoutKey: string | null;
  source: 'verified' | 'generated' | null;
  outcome: BatchRenderOutcome;
  nodeId?: string;
  frameName?: string;
  message?: string;
}

export interface BatchRenderSummary {
  totalWorkOrders: number;
  totalOutputs: number;
  generatedCount: number;
  skippedReviewRequiredCount: number;
  skippedNotRenderableCount: number;
  skippedErrorCount: number;
  failedCount: number;
}

export interface BatchRenderResult {
  summary: BatchRenderSummary;
  outputs: BatchRenderOutputResult[];
}

async function findOrCreatePage(name: string): Promise<PageNode> {
  const existing = figma.root.children.find((p) => p.type === 'PAGE' && p.name === name);
  const page = existing && existing.type === 'PAGE' ? existing : figma.createPage();
  if (!existing) page.name = name;
  await page.loadAsync();
  return page;
}

function buildFrameName(
  workOrderId: string,
  channelPresetId: string,
  layoutKey: string,
  source: 'verified' | 'generated',
): string {
  return `${workOrderId}__${channelPresetId}__${layoutKey}__${source === 'verified' ? 'VERIFIED' : 'GENERATED'}`;
}

function buildItems(wo: WorkOrder): GenerationRequestItem[] {
  return wo.lines.map((l) => ({ productId: l.productCode as string, quantity: l.quantity as number }));
}

export async function renderBatch(
  batch: BatchGenerationRequest,
  deps: { products: Product[]; channelPresets: ChannelPreset[]; layouts: LayoutDefinition[] },
  options: BatchRenderOptions = {},
  /** 테스트에서 mock 바인딩/지원 목록을 주입하기 위함(assetMapping.test.ts 등과 동일한 패턴). 생략하면 실제 프로덕션 데이터를 쓴다. */
  rendererDeps: { bindings?: FigmaTemplateBinding[]; generatedSupport?: GeneratedRendererSupport[] } = {},
): Promise<BatchRenderResult> {
  const includeReviewRequired = options.includeReviewRequired ?? false;
  const bindings = rendererDeps.bindings ?? FIGMA_TEMPLATE_BINDINGS;
  const generatedSupport = rendererDeps.generatedSupport ?? GENERATED_RENDERER_SUPPORT;

  const verifiedPage = await findOrCreatePage(AUTO_GENERATED_VERIFIED_PAGE_NAME);
  const reviewPage = await findOrCreatePage(AUTO_GENERATED_REVIEW_PAGE_NAME);

  const outputs: BatchRenderOutputResult[] = [];

  for (const wo of batch.workOrders) {
    // parser 단계에서 이미 reviewRequired/error로 확정된 작업ID는 composeBatch.ts와 동일하게
    // fan-out 자체를 시도하지 않는다 — 이미 확정된 판정을 임의로 덮어쓰지 않기 위함이다.
    if (wo.status !== 'valid') continue;

    const fanout = composeChannelOutputs(
      {
        items: buildItems(wo),
        channelId: wo.channelId as string,
        options: wo.badge === null ? undefined : { badge: { enabled: wo.badge } },
      },
      deps,
    );
    if (!fanout.ok) continue; // CHANNEL_NOT_FOUND 등 — output 자체가 없으므로 생성/스킵 대상도 없음

    for (const output of fanout.outputs) {
      if (!output.result.ok) {
        // 이 시점의 실패는 plan 자체가 없다는 뜻(reviewRequired: staged/gift/verified-only 등,
        // 또는 error: 슬롯 수 초과 등) — 둘 다 렌더링을 시도할 대상이 없다.
        outputs.push({
          workOrderId: wo.workId,
          channelPresetId: output.channelPresetId,
          layoutKey: null,
          source: null,
          outcome: output.result.reviewRequired ? 'skippedReviewRequired' : 'skippedError',
          message: output.result.message,
        });
        continue;
      }

      const plan = output.result.plan;
      const source: 'verified' | 'generated' = plan.layoutSource.kind;

      if (plan.reviewRequired && !includeReviewRequired) {
        outputs.push({
          workOrderId: wo.workId,
          channelPresetId: output.channelPresetId,
          layoutKey: plan.layoutKey,
          source,
          outcome: 'skippedReviewRequired',
          message: 'reviewRequired(generated) plan — includeReviewRequired 옵션이 꺼져 있어 기본적으로 생성하지 않음',
        });
        continue;
      }

      const renderability = checkRenderabilityForPlan(plan, bindings, generatedSupport);
      if (!renderability.renderable) {
        outputs.push({
          workOrderId: wo.workId,
          channelPresetId: output.channelPresetId,
          layoutKey: plan.layoutKey,
          source,
          outcome: 'skippedNotRenderable',
          message: renderability.message,
        });
        continue;
      }

      const renderResult =
        source === 'verified' ? await renderPlan(plan, bindings) : await renderGeneratedPlan(plan, generatedSupport);
      if (!renderResult.ok) {
        outputs.push({
          workOrderId: wo.workId,
          channelPresetId: output.channelPresetId,
          layoutKey: plan.layoutKey,
          source,
          outcome: 'failed',
          message: renderResult.message,
        });
        continue;
      }

      const node = (await figma.getNodeByIdAsync(renderResult.nodeId)) as SceneNode | null;
      const frameName = buildFrameName(wo.workId, output.channelPresetId, plan.layoutKey, source);
      if (node) {
        node.name = frameName;
        const targetPage = source === 'verified' ? verifiedPage : reviewPage;
        targetPage.appendChild(node);
      }

      outputs.push({
        workOrderId: wo.workId,
        channelPresetId: output.channelPresetId,
        layoutKey: plan.layoutKey,
        source,
        outcome: 'generated',
        nodeId: renderResult.nodeId,
        frameName,
      });
    }
  }

  const summary: BatchRenderSummary = {
    totalWorkOrders: batch.workOrders.length,
    totalOutputs: outputs.length,
    generatedCount: outputs.filter((o) => o.outcome === 'generated').length,
    skippedReviewRequiredCount: outputs.filter((o) => o.outcome === 'skippedReviewRequired').length,
    skippedNotRenderableCount: outputs.filter((o) => o.outcome === 'skippedNotRenderable').length,
    skippedErrorCount: outputs.filter((o) => o.outcome === 'skippedError').length,
    failedCount: outputs.filter((o) => o.outcome === 'failed').length,
  };

  return { summary, outputs };
}
