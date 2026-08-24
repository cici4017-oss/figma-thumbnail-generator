import type { GeneratedSlotRect } from './generatedLayoutGeometry';

/**
 * 혼합상품(서로 다른 productCode가 2개 이상) 전용 generated 배치 공식.
 *
 * 단일상품 generated(generatedLayoutGeometry.ts의 row-linear/diagonal-cascade/pyramid-stack)는
 * 실사용 테스트에서 문제가 없다고 확인되어 그대로 유지한다 — 이 파일은 혼합상품에서만 쓴다.
 *
 * 혼합상품에서 발견된 문제(5+4 균등 그리드에 순번대로 단순 나열)는 "슬롯 수를 정확히 채우는 것"에만
 * 집중하고 "어떤 상품끼리 같은 그룹인지"를 전혀 반영하지 않아서 생긴다. 여기서는 대신:
 *
 * - 같은 productCode(assetKey)의 슬롯을 한 행(row)으로 묶는다 → 동일 상품이 하나의 시각적
 *   그룹으로 보인다.
 * - 행 순서는 Excel 순번상 해당 상품이 처음 등장하는 순서를 그대로 따른다(순번 유지, 임의 재정렬 없음).
 * - 행 내부/행 사이 모두 약간씩 겹치게 배치한다(기존 verified 5/10슬롯 템플릿의 실제 좌표를 참고한
 *   비율 — LAYOUT_04의 서브 3x3 그리드가 슬롯 크기 대비 약 25% 겹침으로 배치돼 있다) — 여백만
 *   차지하는 gap 대신 겹침을 쓰면 같은 프레임 안에서 슬롯을 훨씬 크게 그릴 수 있고, 전체가 하나의
 *   덩어리로 뭉쳐 보인다.
 * - 각 행은 프레임 가로 중심에 맞춰 개별적으로 정렬하고, 행 전체 묶음은 프레임 세로 중심에 맞춘다
 *   → 상단에 몰리지 않고 좌우/상하 모두 중심이 맞는다.
 */

export interface MixedSlotGroup {
  assetKey: string;
  /** 이 상품(assetKey)에 해당하는 슬롯키들 — plan.slots 순서(=Excel 순번×수량 펼침 순서) 그대로. */
  slotKeys: string[];
}

export interface MixedGeometryInput {
  /** Excel 순번상 각 상품이 처음 등장하는 순서 그대로의 상품별 그룹 목록. */
  groups: MixedSlotGroup[];
  frameWidth: number;
  frameHeight: number;
}

const MARGIN = 60;
/** 행(서로 다른 상품) 사이의 세로 겹침 비율. */
const ROW_OVERLAP = 0.2;
/** 같은 행(같은 상품) 안, 슬롯 사이의 가로 겹침 비율. */
const CELL_OVERLAP = 0.28;

function rowWidthFactor(count: number): number {
  return 1 + (count - 1) * (1 - CELL_OVERLAP);
}

export function computeMixedSlotRects(input: MixedGeometryInput): GeneratedSlotRect[] {
  const { groups, frameWidth, frameHeight } = input;
  if (groups.length === 0) {
    throw new Error('groups가 비어 있습니다.');
  }
  if (groups.some((g) => g.slotKeys.length === 0)) {
    throw new Error('빈 slotKeys를 가진 group이 있습니다.');
  }

  const maxRowWidthFactor = Math.max(...groups.map((g) => rowWidthFactor(g.slotKeys.length)));
  const totalHeightFactor = 1 + (groups.length - 1) * (1 - ROW_OVERLAP);

  const sizeByWidth = (frameWidth - MARGIN * 2) / maxRowWidthFactor;
  const sizeByHeight = (frameHeight - MARGIN * 2) / totalHeightFactor;
  const size = Math.min(sizeByWidth, sizeByHeight);

  const rowPitchY = size * (1 - ROW_OVERLAP);
  const totalHeight = size + (groups.length - 1) * rowPitchY;
  const startY = (frameHeight - totalHeight) / 2;

  const rects: GeneratedSlotRect[] = [];
  groups.forEach((group, rowIndex) => {
    const count = group.slotKeys.length;
    const cellPitchX = size * (1 - CELL_OVERLAP);
    const rowWidth = size + (count - 1) * cellPitchX;
    const startX = (frameWidth - rowWidth) / 2;
    const rowY = startY + rowIndex * rowPitchY;
    group.slotKeys.forEach((slotKey, i) => {
      rects.push({ slotKey, x: startX + i * cellPitchX, y: rowY, size });
    });
  });

  return rects;
}
