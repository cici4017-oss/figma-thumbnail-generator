import type { CompositionPlan } from '@thumbnail-generator/core';
import { resolveTemplate, FIGMA_TEMPLATE_BINDINGS, type FigmaTemplateBinding, type FigmaSlotBinding } from './templateMapper';
import { resolveProductAsset, buildImageFill } from './assetResolver';

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

/** root의 전체 하위 트리(문서 트리 순회 순서, depth-first)에서 이름이 일치하는 노드를 전부 모은다. */
function collectLayersByName(root: BaseNode, name: string): SceneNode[] {
  const out: SceneNode[] = [];
  if ('children' in root) {
    for (const child of (root as unknown as ChildrenMixin).children) {
      if ((child as SceneNode).name === name) out.push(child as SceneNode);
      out.push(...collectLayersByName(child as BaseNode, name));
    }
  }
  return out;
}

/**
 * 실제 조사 결과, 일부 채널 프레임은 슬롯마다 고유 레이어 이름을 쓰지 않고 전부 같은 이름을
 * 재사용한다(templateMapper.ts의 채널 확장 바인딩 주석 참고). layerIndex가 지정되어 있으면
 * 같은 이름의 레이어 중 그 순번(0-based, 트리 순회 순서)을 쓰고, 없으면 기존과 동일하게
 * findOne(=첫 번째로 찾은 노드)을 쓴다(하위 호환).
 */
function findSlotLayer(clone: FrameNode, slotBinding: FigmaSlotBinding): SceneNode | null {
  if (slotBinding.layerIndex === undefined) {
    return clone.findOne((n) => n.name === slotBinding.layerName);
  }
  const matches = collectLayersByName(clone, slotBinding.layerName);
  return matches[slotBinding.layerIndex] ?? null;
}

/**
 * CompositionPlan을 실제 Figma 결과물로 그린다.
 * - 원본 프레임(source of truth)은 절대 수정하지 않는다.
 * - 원본을 clone()해서 만든 새 프레임에만 이미지 슬롯을 교체한다.
 * - 슬롯 레이어/이미지 asset(PRODUCT_ASSETS 기반)을 찾지 못하면 임의로 진행하지 않고 즉시 실패를 반환한다.
 *
 * bindings를 생략하면 실제 회사 파일용 FIGMA_TEMPLATE_BINDINGS를 쓴다. 테스트에서는 mock 바인딩을
 * 명시적으로 넘겨서, 회사 Figma 파일 없이도 이 함수를 그대로 검증할 수 있다(src/mock 참고).
 *
 * options.select(기본 true): 생성 직후 결과를 선택/화면 이동한다. batchRenderer.ts처럼 여러 개를
 * 연속 생성한 뒤 서로 다른 페이지(AUTO_GENERATED_VERIFIED/REVIEW)로 옮기는 흐름에서는 반드시
 * false로 넘겨야 한다 — 이 함수가 끝난 뒤 clone이 다른 페이지로 이동하면, 남아있던
 * "figma.currentPage.selection = [clone]"이 더 이상 currentPage에 속하지 않는 노드를 가리키게
 * 되어 "The selection of a page can only include nodes in that page" 오류로 이어진다.
 */
export async function renderPlan(
  plan: CompositionPlan,
  bindings: FigmaTemplateBinding[] = FIGMA_TEMPLATE_BINDINGS,
  options: { select?: boolean } = {},
): Promise<RenderPlanResult> {
  const binding = resolveTemplate(plan.layoutKey, plan.channelPresetId, bindings);
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
    const layer = findSlotLayer(clone, slotBinding);

    if (!layer) {
      clone.remove();
      const indexNote = slotBinding.layerIndex !== undefined ? `(layerIndex=${slotBinding.layerIndex})` : '';
      return {
        ok: false,
        message: `복제된 프레임에서 레이어 "${slotBinding.layerName}"${indexNote}을(를) 찾을 수 없습니다.`,
      };
    }
    if (!('fills' in layer)) {
      clone.remove();
      return {
        ok: false,
        message: `레이어 "${slotBinding.layerName}"은(는) 이미지 채우기를 지원하지 않는 노드입니다.`,
      };
    }

    const resolved = await resolveProductAsset(slot.assetKey);
    if (!resolved.ok) {
      clone.remove();
      return { ok: false, message: resolved.message };
    }

    (layer as GeometryMixin & MinimalFillsMixin).fills = buildImageFill(resolved.imageHash, resolved.presentation);
  }

  if (options.select ?? true) {
    figma.currentPage.selection = [clone];
    figma.viewport.scrollAndZoomIntoView([clone]);
  }

  return { ok: true, nodeId: clone.id };
}
