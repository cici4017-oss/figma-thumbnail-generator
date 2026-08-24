import type { CompositionPlan } from '@thumbnail-generator/core';
import type { ProductGroupId } from '@thumbnail-generator/core';
import type { ThumbnailType } from '@thumbnail-generator/core';
import { resolveProductAsset } from './assetResolver';
import { computeGeneratedSlotRects, SUPPORTED_GENERATED_FAMILIES } from './generatedLayoutGeometry';

/**
 * generated CompositionPlan(검증된 Layout이 없어 family 공식으로 자동 생성된 plan)을 실제
 * Figma 결과물로 그린다. renderer.ts(verified 전용)와 분리된 이유: generated plan은 실제
 * template frame이 없으므로, 대신 "이미 검증된 real frame 하나를 base shell로 clone해서
 * 로고/배경/고정 요소는 그대로 두고, 상품 슬롯만 새 좌표로 다시 배치"하는 다른 전략을 쓴다.
 *
 * 원본 shell frame은 renderer.ts와 동일하게 절대 수정하지 않는다 — clone에서만 작업한다.
 * generated 결과는 항상 reviewRequired(=core의 plan.reviewRequired가 이미 true)이므로,
 * 이 함수가 성공해도 "검토 없이 바로 사용 가능"을 의미하지 않는다.
 */

export interface GeneratedRendererSupport {
  channelPresetId: string;
  productGroup: ProductGroupId;
  thumbnailType: ThumbnailType;
  familyIds: string[];
  /** base shell로 쓸 실제 verified frame(로고/배경/고정 요소의 source of truth) */
  baseShellFrameName: string;
  baseShellFrameNodeId?: string;
  /**
   * shell 안에서 기존 상품 슬롯으로 쓰이던 레이어 이름 — clone 후 제거하고 새 슬롯으로
   * 교체한다. 나머지 레이어(로고/배경/고정 텍스트/보관 라벨 등)는 절대 건드리지 않는다.
   */
  existingSlotLayerNames: string[];
}

/**
 * ⚠ V1 지원 범위: naver-1000x1000 / simple-meal / basic 만. 다른 채널로 확장하기 전에
 * 이 범위에서 2/4/6/9개 슬롯 실제 렌더 테스트를 먼저 완료한다(README/커밋 메시지 참고).
 * base shell은 LAYOUT_01의 실제 frame(69:307, "네이버_소고기장조림130_1")을 쓴다 — naver
 * square 프레임 중 기존 상품 슬롯 레이어가 1개("image 312")뿐이라 제거할 것이 가장 적어서다.
 */
export const GENERATED_RENDERER_SUPPORT: GeneratedRendererSupport[] = [
  {
    channelPresetId: 'naver-1000x1000',
    productGroup: 'simple-meal',
    thumbnailType: 'basic',
    familyIds: SUPPORTED_GENERATED_FAMILIES,
    baseShellFrameName: '네이버_소고기장조림130_1',
    baseShellFrameNodeId: '69:307',
    existingSlotLayerNames: ['image 312'],
  },
];

export type GeneratedRenderResult =
  | { ok: true; nodeId: string; familyId: string; slotCount: number }
  | { ok: false; message: string };

const RESULT_GAP = 120;
const GENERATED_SLOT_LAYER_PREFIX = 'generated_slot_';

function findSupport(
  plan: CompositionPlan,
  support: GeneratedRendererSupport[],
): GeneratedRendererSupport | undefined {
  if (plan.layoutSource.kind !== 'generated') return undefined;
  const familyId = plan.layoutSource.params.familyId;
  return support.find(
    (s) =>
      s.channelPresetId === plan.channelPresetId &&
      s.productGroup === plan.productGroup &&
      s.thumbnailType === plan.thumbnailType &&
      s.familyIds.includes(familyId),
  );
}

function findShellFrame(s: GeneratedRendererSupport): FrameNode | null {
  if (s.baseShellFrameNodeId) {
    const byId = figma.getNodeById(s.baseShellFrameNodeId);
    if (byId && byId.type === 'FRAME') return byId;
  }
  const byName = figma.currentPage.findOne((n) => n.type === 'FRAME' && n.name === s.baseShellFrameName);
  return byName && byName.type === 'FRAME' ? byName : null;
}

/**
 * options.select(기본 true): 생성 직후 결과를 선택/화면 이동한다. renderer.ts의 renderPlan과
 * 동일한 이유로, batchRenderer.ts처럼 생성 후 다른 페이지(AUTO_GENERATED_REVIEW)로 옮기는
 * 흐름에서는 반드시 false로 넘겨야 한다("The selection of a page can only include nodes in
 * that page" 오류 방지).
 */
export async function renderGeneratedPlan(
  plan: CompositionPlan,
  support: GeneratedRendererSupport[] = GENERATED_RENDERER_SUPPORT,
  options: { select?: boolean } = {},
): Promise<GeneratedRenderResult> {
  if (plan.layoutSource.kind !== 'generated') {
    return { ok: false, message: 'generated plan이 아닙니다(verified plan은 renderer.ts를 쓰세요).' };
  }

  const matched = findSupport(plan, support);
  if (!matched) {
    return {
      ok: false,
      message:
        `channelPresetId "${plan.channelPresetId}"(${plan.productGroup}/${plan.thumbnailType}, ` +
        `family "${plan.layoutSource.params.familyId}")는 generated renderer가 아직 지원하지 않습니다.`,
    };
  }

  const shellFrame = findShellFrame(matched);
  if (!shellFrame) {
    return {
      ok: false,
      message: `generated renderer의 base shell 프레임 "${matched.baseShellFrameName}"을(를) 찾을 수 없습니다.`,
    };
  }

  const { familyId, slotCount } = plan.layoutSource.params;
  if (slotCount !== plan.slots.length) {
    return {
      ok: false,
      message: `슬롯 수 불일치: layoutSource.params.slotCount=${slotCount}, plan.slots.length=${plan.slots.length}`,
    };
  }

  let rects;
  try {
    rects = computeGeneratedSlotRects({
      familyId,
      slotKeys: plan.slots.map((s) => s.slotKey),
      frameWidth: shellFrame.width,
      frameHeight: shellFrame.height,
    });
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }

  const clone = shellFrame.clone();
  clone.name = `${shellFrame.name} (generated ${familyId} ${slotCount} 자동생성 결과)`;
  clone.x = shellFrame.x + shellFrame.width + RESULT_GAP;
  clone.y = shellFrame.y;
  shellFrame.parent?.appendChild(clone);

  // 1) 기존 상품 슬롯 레이어만 제거 — 로고/배경/고정 요소는 절대 건드리지 않는다.
  for (const layerName of matched.existingSlotLayerNames) {
    const oldSlot = clone.findOne((n) => n.name === layerName);
    oldSlot?.remove();
  }

  // 2) family 공식으로 계산된 새 슬롯을 만들고 실제 상품 이미지로 채운다.
  for (const slot of plan.slots) {
    const rect = rects.find((r) => r.slotKey === slot.slotKey);
    if (!rect) {
      clone.remove();
      return { ok: false, message: `슬롯 "${slot.slotKey}"에 대한 generated geometry가 없습니다.` };
    }

    const resolved = await resolveProductAsset(slot.assetKey);
    if (!resolved.ok) {
      clone.remove();
      return { ok: false, message: resolved.message };
    }

    const node = figma.createRectangle();
    node.name = `${GENERATED_SLOT_LAYER_PREFIX}${slot.slotKey}`;
    node.resize(rect.size, rect.size);
    node.x = rect.x;
    node.y = rect.y;
    node.fills = [{ type: 'IMAGE', imageHash: resolved.imageHash, scaleMode: 'FILL' }];
    clone.appendChild(node);
  }

  if (options.select ?? true) {
    figma.currentPage.selection = [clone];
    figma.viewport.scrollAndZoomIntoView([clone]);
  }

  return { ok: true, nodeId: clone.id, familyId, slotCount };
}
