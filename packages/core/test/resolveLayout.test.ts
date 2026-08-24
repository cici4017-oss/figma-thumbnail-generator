import assert from 'node:assert/strict';
import {
  resolveLayout,
  type LayoutDefinition,
  type LayoutSelectionCriteria,
} from '../src/index';

const baseCriteria: LayoutSelectionCriteria = {
  productGroup: 'simple-meal',
  composition: 'single',
  totalQuantity: 1,
  giftQuantity: 0,
  channelId: 'naver',
  aspectRatioFamily: 'square',
  geometryFamily: 'square-1x1',
  thumbnailType: 'basic',
  fallbackPolicy: 'verified-or-generated',
};

function slotKeys(layout: LayoutDefinition): string[] {
  return layout.slots.map((s) => s.slotKey);
}

// 1) 검증된(verified) Layout이 전혀 없을 때 -> family 공식으로 generated fallback
//    1, 2, 3, 5, 8, 10, 20개 슬롯 각각이 정책 데이터의 경계값대로 올바른 family로 매핑되는지 확인.
{
  const cases: Array<{ slotCount: number; expectedFamily: string }> = [
    { slotCount: 1, expectedFamily: 'single-center' },
    { slotCount: 2, expectedFamily: 'row-linear' },
    { slotCount: 3, expectedFamily: 'row-linear' },
    { slotCount: 5, expectedFamily: 'diagonal-cascade' },
    { slotCount: 8, expectedFamily: 'pyramid-stack' },
    { slotCount: 10, expectedFamily: 'pyramid-stack' },
    { slotCount: 20, expectedFamily: 'grid-cluster' },
  ];

  for (const { slotCount, expectedFamily } of cases) {
    const result = resolveLayout({ ...baseCriteria, totalQuantity: slotCount }, []);
    assert.equal(result.status, 'resolved', `slotCount=${slotCount}는 generated fallback으로 resolved되어야 함`);
    if (result.status !== 'resolved') continue;

    assert.equal(result.layout.source.kind, 'generated');
    if (result.layout.source.kind === 'generated') {
      assert.equal(
        result.layout.source.params.familyId,
        expectedFamily,
        `slotCount=${slotCount} -> family "${expectedFamily}"이어야 함`,
      );
      assert.equal(result.layout.source.params.slotCount, slotCount);
    }
    assert.equal(result.layout.slots.length, slotCount);
    assert.ok(result.layout.slots.every((s) => s.role === 'sale'));
    assert.deepEqual(
      slotKeys(result.layout),
      Array.from({ length: slotCount }, (_, i) => `slot_${i + 1}`),
    );
  }
  console.log('  ✓ generated fallback: 1/2/3/5/8/10/20개 슬롯 모두 정책대로 family 매핑됨');
}

// 2) 검증된 Layout이 있으면 generated fallback을 시도하지 않고 그것을 그대로 쓴다.
{
  const verifiedThree: LayoutDefinition = {
    layoutKey: 'V_TRIPLE',
    arrangementKind: 'triple-cascade',
    slots: [
      { slotKey: 'slot_1', role: 'sale' },
      { slotKey: 'slot_2', role: 'sale' },
      { slotKey: 'slot_3', role: 'sale' },
    ],
    match: { aspectRatioFamilies: ['square'] },
    priority: 100,
    source: { kind: 'verified' },
  };

  const result = resolveLayout({ ...baseCriteria, totalQuantity: 3 }, [verifiedThree]);
  assert.equal(result.status, 'resolved');
  if (result.status === 'resolved') {
    assert.equal(result.layout.layoutKey, 'V_TRIPLE');
    assert.equal(result.layout.source.kind, 'verified');
  }
  console.log('  ✓ 검증된 Layout이 있으면 generated fallback보다 우선함');
}

// 3) AMBIGUOUS_LAYOUT_MATCH는 fallback하지 않고 명확한 error로 전파되어야 한다.
{
  const tieA: LayoutDefinition = {
    layoutKey: 'V_TIE_A',
    arrangementKind: 'triple-cascade',
    slots: [
      { slotKey: 'slot_1', role: 'sale' },
      { slotKey: 'slot_2', role: 'sale' },
      { slotKey: 'slot_3', role: 'sale' },
    ],
    match: { aspectRatioFamilies: ['square'] },
    priority: 10,
    source: { kind: 'verified' },
  };
  const tieB: LayoutDefinition = { ...tieA, layoutKey: 'V_TIE_B', arrangementKind: 'triple-row' };

  const result = resolveLayout({ ...baseCriteria, totalQuantity: 3 }, [tieA, tieB]);
  assert.equal(result.status, 'error');
  assert.equal(result.status === 'error' && result.reason, 'AMBIGUOUS_LAYOUT_MATCH');
  console.log('  ✓ AMBIGUOUS_LAYOUT_MATCH는 generated fallback 없이 error로 전파됨');
}

// 4) staged + 검증된 Layout 없음 -> generated 금지, reviewRequired (error 아님)
{
  const result = resolveLayout({ ...baseCriteria, totalQuantity: 4, thumbnailType: 'staged' }, []);
  assert.equal(result.status, 'reviewRequired');
  assert.equal(result.status === 'reviewRequired' && result.reason, 'STAGED_NO_VERIFIED_LAYOUT');
  console.log('  ✓ staged + 검증된 Layout 없음 -> reviewRequired (generated 금지)');
}

// 5) staged + 검증된 Layout 있음 -> 정상적으로 그 Layout을 사용
{
  const verifiedStaged: LayoutDefinition = {
    layoutKey: 'V_STAGED_4',
    arrangementKind: 'lifestyle-scene',
    slots: Array.from({ length: 4 }, (_, i) => ({ slotKey: `slot_${i + 1}`, role: 'sale' as const })),
    match: { thumbnailTypes: ['staged'] },
    priority: 10,
    source: { kind: 'verified' },
  };
  const result = resolveLayout(
    { ...baseCriteria, totalQuantity: 4, thumbnailType: 'staged' },
    [verifiedStaged],
  );
  assert.equal(result.status, 'resolved');
  assert.equal(result.status === 'resolved' && result.layout.layoutKey, 'V_STAGED_4');
  console.log('  ✓ staged + 검증된 Layout 있음 -> 정상 resolve');
}

// 6) gift 포함 + 검증된 Layout 없음 -> generated 금지, reviewRequired
{
  const result = resolveLayout({ ...baseCriteria, totalQuantity: 2, giftQuantity: 1 }, []);
  assert.equal(result.status, 'reviewRequired');
  assert.equal(result.status === 'reviewRequired' && result.reason, 'GIFT_NO_VERIFIED_LAYOUT');
  console.log('  ✓ gift 포함 + 검증된 Layout 없음 -> reviewRequired (generated 금지)');
}

// 7) V1 generated 최대 슬롯 수(20) 초과 -> fallback하지 않고 error
{
  const result = resolveLayout({ ...baseCriteria, totalQuantity: 21 }, []);
  assert.equal(result.status, 'error');
  assert.equal(result.status === 'error' && result.reason, 'SLOT_COUNT_EXCEEDS_GENERATED_LIMIT');
  console.log('  ✓ 슬롯 21개(20개 초과) -> SLOT_COUNT_EXCEEDS_GENERATED_LIMIT error');
}

// 8) 정책 데이터에 정의되지 않은 슬롯 수(0개) -> NO_ARRANGEMENT_FAMILY_FOR_SLOT_COUNT error
{
  const result = resolveLayout({ ...baseCriteria, totalQuantity: 0 }, []);
  assert.equal(result.status, 'error');
  assert.equal(result.status === 'error' && result.reason, 'NO_ARRANGEMENT_FAMILY_FOR_SLOT_COUNT');
  console.log('  ✓ 슬롯 0개(정책 미정의 구간) -> NO_ARRANGEMENT_FAMILY_FOR_SLOT_COUNT error');
}

console.log('resolveLayout.test.ts: 모든 검증 통과');
