import type { CompositionPlan } from '@thumbnail-generator/core';
import { resolveTemplate, type FigmaTemplateBinding } from './templateMapper';

export type RenderPlanResult = { ok: true; nodeId: string } | { ok: false; message: string };

/** 원본 옆에 결과물을 놓기 위한 여백 */
const RESULT_GAP = 120;

function findTemplateFrame(binding: FigmaTemplateBinding): FrameNode | null {
  if (binding.templateFrameNodeId) {
    const byId = figma.getNodeById(binding.templateFrameNodeId);
    if (byId && byId.type === 'FRAME') return byId;
  }
  const byName = figma.currentPage.findOne(
    (n) => n.type === 'FRAME' && n.name === binding.templateFrameName,
  );
  return byName && byName.type === 'FRAME' ? byName : null;
}

/**
 * CompositionPlan을 실제 Figma 결과물로 그린다.
 * - 원본 프레임(source of truth)은 절대 수정하지 않는다.
 * - 원본을 clone()해서 만든 새 프레임에만 이미지 슬롯을 교체한다.
 * - 슬롯 레이어/이미지 asset을 찾지 못하면 임의로 진행하지 않고 즉시 실패를 반환한다.
 */
export async function renderPlan(plan: CompositionPlan): Promise<RenderPlanResult> {
  const binding = resolveTemplate(plan.layoutKey, plan.channelPresetId);
  if (!binding) {
    return {
      ok: false,
      message: `layoutKey "${plan.layoutKey}" + channelPresetId "${plan.channelPresetId}"에 대한 템플릿 매핑이 없습니다.`,
    };
  }

  const templateFrame = findTemplateFrame(binding);
  if (!templateFrame) {
    return {
      ok: false,
      message: `원본 프레임 "${binding.templateFrameName}"을(를) 현재 파일에서 찾을 수 없습니다.`,
    };
  }

  // 렌더링을 시작하기 전에 모든 슬롯의 바인딩이 존재하는지 먼저 검증한다 (부분 실패 방지).
  for (const slot of plan.slots) {
    if (!binding.slotBindings.some((b) => b.slotKey === slot.slotKey)) {
      return { ok: false, message: `슬롯 "${slot.slotKey}"에 대한 레이어 매핑이 없습니다.` };
    }
  }

  const clone = templateFrame.clone();
  clone.name = `${templateFrame.name} (자동생성 결과)`;
  clone.x = templateFrame.x + templateFrame.width + RESULT_GAP;
  clone.y = templateFrame.y;
  templateFrame.parent?.appendChild(clone);

  for (const slot of plan.slots) {
    const slotBinding = binding.slotBindings.find((b) => b.slotKey === slot.slotKey)!;
    const layer = clone.findOne((n) => n.name === slotBinding.layerName);

    if (!layer) {
      clone.remove();
      return {
        ok: false,
        message: `복제된 프레임에서 레이어 "${slotBinding.layerName}"을(를) 찾을 수 없습니다.`,
      };
    }
    if (!('fills' in layer)) {
      clone.remove();
      return {
        ok: false,
        message: `레이어 "${slotBinding.layerName}"은(는) 이미지 채우기를 지원하지 않는 노드입니다.`,
      };
    }

    const image = figma.getImageByHash(slot.assetKey);
    if (!image) {
      clone.remove();
      return { ok: false, message: `assetKey "${slot.assetKey}"에 해당하는 이미지를 찾을 수 없습니다.` };
    }

    (layer as GeometryMixin & MinimalFillsMixin).fills = [
      { type: 'IMAGE', imageHash: image.hash, scaleMode: 'FILL' },
    ];
  }

  figma.currentPage.selection = [clone];
  figma.viewport.scrollAndZoomIntoView([clone]);

  return { ok: true, nodeId: clone.id };
}
