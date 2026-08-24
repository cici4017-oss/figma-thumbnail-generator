import type { ArrangementFamilyId } from '@thumbnail-generator/core';

/**
 * generated Layout(core에는 슬롯 개수/역할만 있고 좌표가 없다 — CompositionPlan 참고)을
 * 실제로 그리기 위한 픽셀 배치 공식. core가 아니라 여기(figma-plugin)에만 있어야 한다 —
 * core는 렌더러 독립적인 "내용 계획"만 책임진다.
 *
 * V1에서는 세 family만 구현한다(naver-1000x1000 generated renderer 지원 범위와 일치):
 * row-linear(2~3), diagonal-cascade(4~5), pyramid-stack(6~10). single-center/grid-cluster는
 * 아직 실제 렌더 테스트로 검증되지 않았으므로 구현하지 않는다 — 지원하지 않는 family가 들어오면
 * 임의로 비슷한 걸 그리지 않고 명확히 에러를 던진다(generatedRenderer.ts가 그대로 실패로 반환).
 *
 * 모든 슬롯은 정사각형이다 — package 상품 이미지가 정사각형에 가까운 구도라, scaleMode:'FILL'을
 * 정사각형 슬롯에 적용하면 기존 verified 템플릿과 동일하게 비율 왜곡 없이 채워진다(실제 렌더
 * 테스트로 확인됨). 슬롯 순서는 plan.slots 순서(=상품 순번)를 그대로 따른다.
 */

export type SupportedGeneratedFamily = Extract<
  ArrangementFamilyId,
  'row-linear' | 'diagonal-cascade' | 'pyramid-stack'
>;

export const SUPPORTED_GENERATED_FAMILIES: SupportedGeneratedFamily[] = [
  'row-linear',
  'diagonal-cascade',
  'pyramid-stack',
];

export interface GeneratedSlotRect {
  slotKey: string;
  x: number;
  y: number;
  size: number;
}

export interface GeneratedGeometryInput {
  familyId: ArrangementFamilyId;
  /** plan.slots 순서 그대로 — 상품 순번을 유지하기 위해 이 배열의 순서를 그대로 배치 순서로 쓴다. */
  slotKeys: string[];
  frameWidth: number;
  frameHeight: number;
}

const MARGIN = 60;
const GAP = 20;

function rowLinear(slotKeys: string[], frameWidth: number, frameHeight: number): GeneratedSlotRect[] {
  const n = slotKeys.length;
  const available = frameWidth - MARGIN * 2;
  const size = (available - (n - 1) * GAP) / n;
  const y = (frameHeight - size) / 2;
  return slotKeys.map((slotKey, i) => ({ slotKey, x: MARGIN + i * (size + GAP), y, size }));
}

function diagonalCascade(slotKeys: string[], frameWidth: number, frameHeight: number): GeneratedSlotRect[] {
  const n = slotKeys.length;
  const span = Math.min(frameWidth, frameHeight) - MARGIN * 2;
  // 대각선으로 한 칸씩 내려가는 계단식 배치. step(=size+GAP)이 항상 size보다 커서 겹치지 않는다
  // (row-linear와 달리 가로/세로 둘 다 이동한다는 점만 다르다).
  // margin + (n-1)*step + size <= span + margin, 즉 n*size + (n-1)*GAP <= span.
  const size = (span - (n - 1) * GAP) / n;
  const step = size + GAP;
  return slotKeys.map((slotKey, i) => ({
    slotKey,
    x: MARGIN + i * step,
    y: MARGIN + i * step,
    size,
  }));
}

function pyramidStack(slotKeys: string[], frameWidth: number, frameHeight: number): GeneratedSlotRect[] {
  const n = slotKeys.length;
  const row1Count = Math.ceil(n / 2);
  const row2Count = n - row1Count;
  const sizeForRow = (count: number) => (frameWidth - MARGIN * 2 - (count - 1) * GAP) / count;
  const size = row2Count > 0 ? Math.min(sizeForRow(row1Count), sizeForRow(row2Count)) : sizeForRow(row1Count);
  const rowGapY = 30;
  const totalHeight = row2Count > 0 ? size * 2 + rowGapY : size;
  const topY = (frameHeight - totalHeight) / 2;

  function layoutRow(keys: string[], rowY: number): GeneratedSlotRect[] {
    const rowWidth = keys.length * size + (keys.length - 1) * GAP;
    const startX = (frameWidth - rowWidth) / 2;
    return keys.map((slotKey, i) => ({ slotKey, x: startX + i * (size + GAP), y: rowY, size }));
  }

  const row1Keys = slotKeys.slice(0, row1Count);
  const row2Keys = slotKeys.slice(row1Count);
  const row1 = layoutRow(row1Keys, topY);
  const row2 = row2Count > 0 ? layoutRow(row2Keys, topY + size + rowGapY) : [];
  return [...row1, ...row2];
}

export function computeGeneratedSlotRects(input: GeneratedGeometryInput): GeneratedSlotRect[] {
  if (input.slotKeys.length === 0) {
    throw new Error('slotKeys가 비어 있습니다.');
  }
  switch (input.familyId) {
    case 'row-linear':
      return rowLinear(input.slotKeys, input.frameWidth, input.frameHeight);
    case 'diagonal-cascade':
      return diagonalCascade(input.slotKeys, input.frameWidth, input.frameHeight);
    case 'pyramid-stack':
      return pyramidStack(input.slotKeys, input.frameWidth, input.frameHeight);
    default:
      throw new Error(
        `generated family "${input.familyId}"에 대한 배치 공식이 아직 구현되지 않았습니다(지원: ${SUPPORTED_GENERATED_FAMILIES.join(', ')}).`,
      );
  }
}
