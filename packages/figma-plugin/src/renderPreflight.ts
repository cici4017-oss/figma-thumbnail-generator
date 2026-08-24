import type { CompositionPlan } from '@thumbnail-generator/core';
import { resolveTemplate, FIGMA_TEMPLATE_BINDINGS, type FigmaTemplateBinding } from './templateMapper';
import { VERIFIED_DERIVED_GENERATED_SUPPORT, type VerifiedDerivedSupport } from './verifiedDerivedGeneratedRenderer';
import { resolveProductAsset, type ResolveAssetResult } from './assetResolver';

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

export type RenderabilityReason =
  | 'NO_FIGMA_TEMPLATE_BINDING'
  | 'GENERATED_BASE_TEMPLATE_NOT_AVAILABLE'
  | 'PRODUCT_ASSET_NOT_RESOLVABLE';

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
  /**
   * generated일 때만 의미 있었던 필드(GeneratedLayoutParams.familyId) — Generated V2(verified-
   * template-derived)로 전환하면서 renderability 판정에는 더 이상 쓰지 않는다(대신 layoutKey
   * 끝의 슬롯 수로 판정한다). 기존 호출부(BatchPreview.tsx)와의 타입 호환을 위해 필드 자체는
   * 남겨둔다.
   */
  arrangementFamily: string | null;
  productGroup?: string;
  thumbnailType?: string;
}

/** core generateFallbackLayout이 만드는 layoutKey 형식(`GENERATED_<FAMILY>_<슬롯수>`)에서 슬롯 수를 뽑아낸다. */
function parseGeneratedSlotCount(layoutKey: string): number | null {
  const match = layoutKey.match(/_(\d+)$/);
  return match ? Number(match[1]) : null;
}

export function checkRenderability(
  input: RenderabilityInput,
  bindings: FigmaTemplateBinding[] = FIGMA_TEMPLATE_BINDINGS,
  verifiedDerivedSupport: VerifiedDerivedSupport[] = VERIFIED_DERIVED_GENERATED_SUPPORT,
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

  // Generated V2: 순수 공식이 아니라 verified frame에서 파생하므로, "이 채널+슬롯 수 조합에
  // 파생 가능한 base 템플릿이 있는가"로 판정한다(예전처럼 family/채널 지원 여부가 아니다).
  const slotCount = parseGeneratedSlotCount(input.layoutKey);
  const supported = verifiedDerivedSupport.some(
    (s) => s.channelPresetId === input.channelPresetId && s.targetSlotCount === slotCount,
  );
  if (!supported) {
    return {
      renderable: false,
      reason: 'GENERATED_BASE_TEMPLATE_NOT_AVAILABLE',
      message:
        `channelPresetId "${input.channelPresetId}"(슬롯 ${slotCount ?? '?'}개)에 대한 ` +
        `verified-derived 기본 템플릿이 아직 없어 generated로 생성할 수 없습니다.`,
    };
  }
  return { renderable: true };
}

/** 실제 렌더 호출 직전(renderer.ts/verifiedDerivedGeneratedRenderer.ts 호출부)에서 CompositionPlan으로 바로 확인할 때 쓴다. */
export function checkRenderabilityForPlan(
  plan: CompositionPlan,
  bindings: FigmaTemplateBinding[] = FIGMA_TEMPLATE_BINDINGS,
  verifiedDerivedSupport: VerifiedDerivedSupport[] = VERIFIED_DERIVED_GENERATED_SUPPORT,
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
    verifiedDerivedSupport,
  );
}

/**
 * checkRenderability/checkRenderabilityForPlan은 순수 함수라 figma 전역 없이도(Batch Preview
 * UI에서도) 호출할 수 있지만, 그만큼 "이 파일에서 지금 그 상품 asset을 실제로 찾을 수 있는지"는
 * 판단하지 못한다(ProductAssetBinding의 confirmedNodeId가 실제로 존재하는지는
 * figma.getNodeByIdAsync 없이는 알 수 없다). 이 함수가 그 마지막 단계를 담당한다 —
 * figma 전역이 있는 곳(code.ts/batchRenderer.ts, 실제 렌더 직전)에서만 호출해야 한다.
 * plan.slots를 전부 확인해서, 하나라도 resolve 실패하면 그 즉시 실패로 판정한다(부분
 * 렌더/추측 대체 없음).
 */
export async function checkAssetResolvability(
  plan: CompositionPlan,
  resolveAsset: (assetKey: string) => Promise<ResolveAssetResult> = resolveProductAsset,
): Promise<RenderabilityResult> {
  for (const slot of plan.slots) {
    const result = await resolveAsset(slot.assetKey);
    if (!result.ok) {
      return {
        renderable: false,
        reason: 'PRODUCT_ASSET_NOT_RESOLVABLE',
        message: `슬롯 "${slot.slotKey}"(assetKey "${slot.assetKey}")의 상품 asset을 찾을 수 없습니다: ${result.message}`,
      };
    }
  }
  return { renderable: true };
}
