import type { ArrangementFamilyId } from '../domain/layoutSource';

/**
 * slotCount 구간별로 어떤 배치 family를 쓸지 정하는 정책. 3~5, 6~10 같은 경계값을 엔진
 * 코드에 고정하지 않고 데이터로 분리한다 — 실제 검증된 Layout 사례가 늘어나면 이 표만
 * 조정하면 된다.
 */
export interface ArrangementFamilyRange {
  familyId: ArrangementFamilyId;
  minSlotCount: number;
  maxSlotCount: number;
}

/** V1 generated fallback이 다룰 수 있는 최대 슬롯 수. 이보다 큰 요청은 fallback하지 않는다. */
export const MAX_GENERATED_SLOT_COUNT = 20;

export const ARRANGEMENT_FAMILY_POLICY: ArrangementFamilyRange[] = [
  { familyId: 'single-center', minSlotCount: 1, maxSlotCount: 1 },
  { familyId: 'row-linear', minSlotCount: 2, maxSlotCount: 3 },
  { familyId: 'diagonal-cascade', minSlotCount: 4, maxSlotCount: 5 },
  { familyId: 'pyramid-stack', minSlotCount: 6, maxSlotCount: 10 },
  { familyId: 'grid-cluster', minSlotCount: 11, maxSlotCount: MAX_GENERATED_SLOT_COUNT },
];

export function resolveArrangementFamily(slotCount: number): ArrangementFamilyRange | undefined {
  return ARRANGEMENT_FAMILY_POLICY.find(
    (r) => slotCount >= r.minSlotCount && slotCount <= r.maxSlotCount,
  );
}
