import type { CompositionPlan } from '@thumbnail-generator/core';
import { resolveTemplate, FIGMA_TEMPLATE_BINDINGS, type FigmaTemplateBinding } from './templateMapper';
import { resolveProductAsset, buildImageFill } from './assetResolver';

/**
 * Generated V2: 순수 좌표 공식(generatedLayoutGeometry.ts/mixedLayoutGeometry.ts, 이제
 * production 경로에서 쓰지 않음 — 실사용 테스트에서 "상품이 너무 작다"/"단순 나열처럼
 * 보인다"는 문제가 확인됨)이 아니라, 실제 verified frame을 clone해서 목표 수량보다 많은
 * 슬롯만 제거하는 방식으로 generated 결과를 만든다.
 *
 * 원칙:
 * - 슬롯 좌표/크기는 새로 계산하지 않는다 — 원본 verified 슬롯의 위치/크기/겹침을 그대로 쓴다.
 * - "어떤 슬롯을 제거할지"는 각 소스 템플릿(LAYOUT_02/03/04)의 실제 기하 구조를 보고 결정한
 *   고정 목록이다(VERIFIED_DERIVED_GENERATED_SUPPORT.keepLayerNames) — 매번 알고리즘으로
 *   재계산하지 않는다. 항상 "중앙/겹침이 많은 슬롯부터" 제거해서 남는 슬롯들의 무게중심이
 *   최대한 원본과 비슷하게 유지되도록 미리 확인해서 정했다.
 * - 그래도 결과가 심하게 한쪽으로 치우치면(프레임 크기 대비 8% 이상) 남은 슬롯 그룹 전체를
 *   같은 상대 배치를 유지한 채 평행이동만 해서 재중앙 정렬한다 — 개별 슬롯 크기/간격은
 *   건드리지 않는다.
 * - main/sub 구조가 있는 LAYOUT_04에서 파생할 때는 keepLayerNames[0]이 항상 main 레이어다.
 *   plan.slots는 이미 Excel 순번 오름차순으로 채워져 있으므로(core의 assignSlots), 그대로
 *   순서대로 채우면 순번 1번 상품이 자동으로 main에 들어간다(기존 정책 유지, 별도 처리 불필요).
 * - 혼합상품도 동일한 로직을 쓴다 — plan.slots가 이미 상품별로 연속 배치(seq 확장) 상태이므로
 *   keepLayerNames 순서대로 그대로 채우면 같은 상품이 자연히 인접 슬롯에 배정된다.
 *
 * V1 지원 범위: naver-1000x1000만(README/커밋 메시지 참고). 다른 채널은 아직 확장하지 않는다.
 * 지원하지 않는 channelPreset/슬롯 수 조합은 generic 대체 없이 명확히 실패를 반환한다 —
 * renderPreflight.ts가 이 실패를 사전에 걸러 reviewRequired(GENERATED_BASE_TEMPLATE_NOT_AVAILABLE)로
 * 분류한다.
 */

export interface VerifiedDerivedSupport {
  channelPresetId: string;
  targetSlotCount: number;
  /** 파생 원본이 되는 실제 verified LayoutDefinition(LAYOUT_02/03/04 등). */
  sourceLayoutKey: string;
  /**
   * source verified frame에서 "유지"할 슬롯의 실제 레이어 이름 — plan.slots 순서(Excel 순번
   * 순서)와 1:1 대응한다. 나머지(=목표 수량보다 많은 부분)는 제거한다. main이 있는 source는
   * 항상 [0]이 main 레이어여야 한다.
   */
  keepLayerNames: string[];
}

/**
 * naver-1000x1000 기준 실제 확인/합의된 파생 규칙:
 * - 2개 -> LAYOUT_02(3슬롯)에서 가운데 슬롯(image 409, 겹침이 가장 큰 중앙) 제거.
 * - 4개 -> LAYOUT_03(5슬롯)에서 상단 중앙 슬롯(image 412) 제거 -> 남은 4개가 대칭 다이아몬드.
 * - 6~9개 -> LAYOUT_04(10슬롯=main 1 + sub 9)에서 main은 항상 유지, sub는 main과 가장 많이
 *   겹치는 하단 행(row2: 314/317/320)부터, 그중에서도 중앙 열(317)부터 제거해서 좌우 대칭을
 *   최대한 유지한다. 9->8->7->6 순서로 remove 목록이 누적된다(상위 호환 부분집합).
 */
export const VERIFIED_DERIVED_GENERATED_SUPPORT: VerifiedDerivedSupport[] = [
  {
    channelPresetId: 'naver-1000x1000',
    targetSlotCount: 2,
    sourceLayoutKey: 'LAYOUT_02',
    keepLayerNames: ['image 313', 'image 410'],
  },
  {
    channelPresetId: 'naver-1000x1000',
    targetSlotCount: 4,
    sourceLayoutKey: 'LAYOUT_03',
    keepLayerNames: ['image 411', 'image 413', 'image 414', 'image 415'],
  },
  {
    channelPresetId: 'naver-1000x1000',
    targetSlotCount: 6,
    sourceLayoutKey: 'LAYOUT_04',
    keepLayerNames: ['image 321', 'image 312', 'image 313', 'image 315', 'image 318', 'image 319'],
  },
  {
    channelPresetId: 'naver-1000x1000',
    targetSlotCount: 7,
    sourceLayoutKey: 'LAYOUT_04',
    keepLayerNames: ['image 321', 'image 312', 'image 313', 'image 315', 'image 316', 'image 318', 'image 319'],
  },
  {
    channelPresetId: 'naver-1000x1000',
    targetSlotCount: 8,
    sourceLayoutKey: 'LAYOUT_04',
    keepLayerNames: [
      'image 321',
      'image 312',
      'image 313',
      'image 315',
      'image 316',
      'image 318',
      'image 319',
      'image 320',
    ],
  },
  {
    channelPresetId: 'naver-1000x1000',
    targetSlotCount: 9,
    sourceLayoutKey: 'LAYOUT_04',
    keepLayerNames: [
      'image 321',
      'image 312',
      'image 313',
      'image 314',
      'image 315',
      'image 316',
      'image 318',
      'image 319',
      'image 320',
    ],
  },
];

export type VerifiedDerivedRenderResult =
  | { ok: true; nodeId: string; sourceLayoutKey: string; slotCount: number; recentered: boolean }
  | { ok: false; message: string };

const RESULT_GAP = 120;
/** bbox 중심이 프레임 중심에서 이 비율(프레임 폭/높이 기준) 이상 벗어나면 그룹 전체를 재중앙 정렬한다. */
const RECENTER_THRESHOLD_RATIO = 0.08;

function findVerifiedTemplateFrame(binding: FigmaTemplateBinding): FrameNode | null {
  if (binding.templateFrameNodeId) {
    const byId = figma.getNodeById(binding.templateFrameNodeId);
    if (byId && byId.type === 'FRAME') return byId;
  }
  const byName = figma.currentPage.findOne((n) => n.type === 'FRAME' && n.name === binding.templateFrameName);
  return byName && byName.type === 'FRAME' ? byName : null;
}

function findSupport(
  plan: CompositionPlan,
  support: VerifiedDerivedSupport[],
): VerifiedDerivedSupport | undefined {
  if (plan.layoutSource.kind !== 'generated') return undefined;
  return support.find((s) => s.channelPresetId === plan.channelPresetId && s.targetSlotCount === plan.slots.length);
}

/**
 * options.select(기본 true): renderer.ts/generatedRenderer.ts와 동일한 이유로, batchRenderer.ts
 * 처럼 생성 후 다른 페이지로 옮기는 흐름에서는 반드시 false로 넘겨야 한다.
 */
export async function renderVerifiedDerivedGeneratedPlan(
  plan: CompositionPlan,
  support: VerifiedDerivedSupport[] = VERIFIED_DERIVED_GENERATED_SUPPORT,
  bindings: FigmaTemplateBinding[] = FIGMA_TEMPLATE_BINDINGS,
  options: { select?: boolean } = {},
): Promise<VerifiedDerivedRenderResult> {
  if (plan.layoutSource.kind !== 'generated') {
    return { ok: false, message: 'generated plan이 아닙니다(verified plan은 renderer.ts를 쓰세요).' };
  }

  const matched = findSupport(plan, support);
  if (!matched) {
    return {
      ok: false,
      message:
        `channelPresetId "${plan.channelPresetId}"(슬롯 ${plan.slots.length}개)에 대한 ` +
        `verified-derived 기본 템플릿이 아직 없습니다(GENERATED_BASE_TEMPLATE_NOT_AVAILABLE).`,
    };
  }

  if (matched.keepLayerNames.length !== plan.slots.length) {
    return {
      ok: false,
      message:
        `설정 오류: keepLayerNames 개수(${matched.keepLayerNames.length})와 ` +
        `plan.slots 개수(${plan.slots.length})가 일치하지 않습니다.`,
    };
  }

  const sourceBinding = resolveTemplate(matched.sourceLayoutKey, matched.channelPresetId, bindings);
  if (!sourceBinding) {
    return {
      ok: false,
      message:
        `파생 원본 layoutKey "${matched.sourceLayoutKey}" + channelPresetId "${matched.channelPresetId}"의 ` +
        `verified template binding이 없습니다.`,
    };
  }

  const sourceFrame = findVerifiedTemplateFrame(sourceBinding);
  if (!sourceFrame) {
    return { ok: false, message: `원본 verified 프레임 "${sourceBinding.templateFrameName}"을(를) 찾을 수 없습니다.` };
  }

  const clone = sourceFrame.clone();
  clone.name = `${sourceFrame.name} (generated-v2 ${plan.slots.length} 자동생성 결과)`;
  clone.x = sourceFrame.x + sourceFrame.width + RESULT_GAP;
  clone.y = sourceFrame.y;
  sourceFrame.parent?.appendChild(clone);

  // 1) 목표 수량보다 많은 부분(keepLayerNames에 없는 원본 슬롯 레이어)만 제거한다. 로고/배경/
  //    고정 요소, 그리고 유지되는 슬롯은 절대 건드리지 않는다.
  const keepSet = new Set(matched.keepLayerNames);
  for (const b of sourceBinding.slotBindings) {
    if (!keepSet.has(b.layerName)) {
      clone.findOne((n) => n.name === b.layerName)?.remove();
    }
  }

  // 2) 유지되는 슬롯을 plan.slots 순서(=Excel 순번 순서, 혼합상품도 상품별로 이미 연속 배치된
  //    상태)대로 그대로 채운다 — 좌표/크기는 원본 그대로, 새 공식으로 재계산하지 않는다.
  const keptLayers: SceneNode[] = [];
  for (let i = 0; i < matched.keepLayerNames.length; i++) {
    const layerName = matched.keepLayerNames[i];
    const layer = clone.findOne((n) => n.name === layerName);
    if (!layer || !('fills' in layer)) {
      clone.remove();
      return { ok: false, message: `유지 대상 레이어 "${layerName}"을(를) 복제된 프레임에서 찾을 수 없습니다.` };
    }

    const resolved = await resolveProductAsset(plan.slots[i].assetKey);
    if (!resolved.ok) {
      clone.remove();
      return { ok: false, message: resolved.message };
    }

    (layer as GeometryMixin & MinimalFillsMixin).fills = buildImageFill(resolved.imageHash, resolved.presentation);
    keptLayers.push(layer);
  }

  // 3) 제거 후 남은 슬롯 그룹의 무게중심이 프레임 중심에서 심하게 벗어난 경우에만, 상대
  //    배치(간격/겹침/크기)는 그대로 둔 채 그룹 전체를 평행이동해서 재중앙 정렬한다.
  const minX = Math.min(...keptLayers.map((n) => n.x));
  const minY = Math.min(...keptLayers.map((n) => n.y));
  const maxX = Math.max(...keptLayers.map((n) => n.x + n.width));
  const maxY = Math.max(...keptLayers.map((n) => n.y + n.height));
  const bboxCenterX = (minX + maxX) / 2;
  const bboxCenterY = (minY + maxY) / 2;
  const frameCenterX = clone.width / 2;
  const frameCenterY = clone.height / 2;
  const dx = frameCenterX - bboxCenterX;
  const dy = frameCenterY - bboxCenterY;
  const lopsided =
    Math.abs(dx) > clone.width * RECENTER_THRESHOLD_RATIO || Math.abs(dy) > clone.height * RECENTER_THRESHOLD_RATIO;
  if (lopsided) {
    for (const layer of keptLayers) {
      layer.x += dx;
      layer.y += dy;
    }
  }

  if (options.select ?? true) {
    figma.currentPage.selection = [clone];
    figma.viewport.scrollAndZoomIntoView([clone]);
  }

  return { ok: true, nodeId: clone.id, sourceLayoutKey: matched.sourceLayoutKey, slotCount: plan.slots.length, recentered: lopsided };
}
