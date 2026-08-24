import type { CompositionPlan } from '@thumbnail-generator/core';
import { resolveTemplate, FIGMA_TEMPLATE_BINDINGS, type FigmaTemplateBinding } from './templateMapper';
import { GENERATED_RENDERER_SUPPORT, type GeneratedRendererSupport } from './generatedRenderer';

/**
 * "logical Layout이 verified/generated로 정해졌다"는 것과 "실제 Figma에서 지금 이걸 생성할 수
 * 있다"는 것은 별개다 — verified plan이어도 그 channelPreset의 physical template binding이
 * 아직 없을 수 있고, generated plan은 generated renderer가 그 채널/family를 아직 지원하지
 * 않을 수 있다. core의 composePlan/selectLayout/resolveLayout은 이 사실을 전혀 모른다(알 필요가
 * 없다 — core는 렌더러 독립적이어야 한다). 이 preflight는 그 사이의 간극을 명시적으로 확인하는
 * 순수 함수다(figma 전역에 의존하지 않는다 — Batch Preview UI에서도, 실제 렌더 호출 직전에도
 * 둘 다 쓸 수 있다).
 *
 * toss-600x240의 verified-only 정책은 여기서 다루지 않는다 — core의 resolveLayout이 이미
 * "검증된 Layout이 없으면 reviewRequired(VERIFIED_ONLY_NO_VERIFIED_LAYOUT)"로 처리해서
 * plan 자체가 만들어지지 않으므로, 이 preflight까지 오는 시점에는 이미 반영되어 있다.
 */

export type RenderabilityReason = 'NO_FIGMA_TEMPLATE_BINDING' | 'GENERATED_RENDERER_NOT_SUPPORTED';

export type RenderabilityResult =
  | { renderable: true }
  | { renderable: false; reason: RenderabilityReason; message: string };

/**
 * CompositionPlan 전체와, composeBatchPreview가 이미 노출하는 BatchPreviewOutput의 요약
 * 필드(layoutKey/channelPresetId/layoutSource/arrangementFamily)만으로도 판정할 수 있게
 * 최소 입력만 받는다 — Batch Preview UI는 BatchPreviewOutput에 productGroup/thumbnailType을
 * 새로 추가하지 않고(구조 확장 최소화) 이 두 필드를 생략해서 채널+family 기준으로만 판정한다.
 */
export interface RenderabilityInput {
  layoutKey: string;
  channelPresetId: string;
  layoutSource: 'verified' | 'generated';
  /** generated일 때만 의미 있음 — GeneratedLayoutParams.familyId. verified면 무시된다. */
  arrangementFamily: string | null;
  productGroup?: string;
  thumbnailType?: string;
}

export function checkRenderability(
  input: RenderabilityInput,
  bindings: FigmaTemplateBinding[] = FIGMA_TEMPLATE_BINDINGS,
  generatedSupport: GeneratedRendererSupport[] = GENERATED_RENDERER_SUPPORT,
): RenderabilityResult {
  if (input.layoutSource === 'verified') {
    const binding = resolveTemplate(input.layoutKey, input.channelPresetId, bindings);
    if (!binding) {
      return {
        renderable: false,
        reason: 'NO_FIGMA_TEMPLATE_BINDING',
        message:
          `layoutKey "${input.layoutKey}" + channelPresetId "${input.channelPresetId}"에 대한 ` +
          `실제 Figma template binding이 없어 지금은 생성할 수 없습니다.`,
      };
    }
    return { renderable: true };
  }

  const supported = generatedSupport.some(
    (s) =>
      s.channelPresetId === input.channelPresetId &&
      s.familyIds.includes(input.arrangementFamily ?? '') &&
      (input.productGroup === undefined || s.productGroup === input.productGroup) &&
      (input.thumbnailType === undefined || s.thumbnailType === input.thumbnailType),
  );
  if (!supported) {
    return {
      renderable: false,
      reason: 'GENERATED_RENDERER_NOT_SUPPORTED',
      message:
        `channelPresetId "${input.channelPresetId}"(family "${input.arrangementFamily}")는 ` +
        `generated renderer가 아직 지원하지 않습니다.`,
    };
  }
  return { renderable: true };
}

/** 실제 렌더 호출 직전(renderer.ts/generatedRenderer.ts 호출부)에서 CompositionPlan으로 바로 확인할 때 쓴다. */
export function checkRenderabilityForPlan(
  plan: CompositionPlan,
  bindings: FigmaTemplateBinding[] = FIGMA_TEMPLATE_BINDINGS,
  generatedSupport: GeneratedRendererSupport[] = GENERATED_RENDERER_SUPPORT,
): RenderabilityResult {
  return checkRenderability(
    {
      layoutKey: plan.layoutKey,
      channelPresetId: plan.channelPresetId,
      layoutSource: plan.layoutSource.kind,
      arrangementFamily: plan.layoutSource.kind === 'generated' ? plan.layoutSource.params.familyId : null,
      productGroup: plan.productGroup,
      thumbnailType: plan.thumbnailType,
    },
    bindings,
    generatedSupport,
  );
}
