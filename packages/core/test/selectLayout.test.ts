import assert from 'node:assert/strict';
import { selectLayout, type LayoutDefinition, type LayoutSelectionCriteria } from '../src/index';

const layouts: LayoutDefinition[] = [
  {
    layoutKey: 'L_SINGLE_BASIC',
    arrangementKind: 'single-center',
    slots: [{ slotKey: 'slot_1', role: 'sale' }],
    match: { aspectRatioFamilies: ['square'], thumbnailTypes: ['basic'] },
    priority: 10,
  },
  {
    layoutKey: 'L_SINGLE_STAGED',
    arrangementKind: 'lifestyle-scene',
    slots: [{ slotKey: 'slot_1', role: 'sale' }],
    match: { aspectRatioFamilies: ['square'], thumbnailTypes: ['staged'] },
    priority: 10,
  },
  {
    layoutKey: 'L_TRIPLE',
    arrangementKind: 'triple-cascade',
    slots: [
      { slotKey: 'slot_1', role: 'sale' },
      { slotKey: 'slot_2', role: 'sale' },
      { slotKey: 'slot_3', role: 'sale' },
    ],
    match: { aspectRatioFamilies: ['square'] },
    priority: 10,
  },
  // L_TRIPLE과 동일한 슬롯 수·priority인 경쟁 레이아웃 (ambiguous 테스트용)
  {
    layoutKey: 'L_TRIPLE_ALT',
    arrangementKind: 'triple-row',
    slots: [
      { slotKey: 'slot_1', role: 'sale' },
      { slotKey: 'slot_2', role: 'sale' },
      { slotKey: 'slot_3', role: 'sale' },
    ],
    match: { aspectRatioFamilies: ['square'] },
    priority: 10,
  },
];

const baseCriteria: LayoutSelectionCriteria = {
  productGroup: 'simple-meal',
  composition: 'single',
  totalQuantity: 1,
  giftQuantity: 0,
  channelId: 'naver',
  aspectRatioFamily: 'square',
  thumbnailType: 'basic',
};

// 1) 정확히 슬롯 1개 + basic -> L_SINGLE_BASIC
{
  const result = selectLayout(baseCriteria, layouts);
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.layout.layoutKey, 'L_SINGLE_BASIC');
}

// 2) thumbnailType=staged면 L_SINGLE_STAGED가 선택되어야 함 (thumbnailType 축이 실제로 분기하는지 확인)
{
  const result = selectLayout({ ...baseCriteria, thumbnailType: 'staged' }, layouts);
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.layout.layoutKey, 'L_SINGLE_STAGED');
}

// 3) 슬롯 3개 요청인데 L_TRIPLE/L_TRIPLE_ALT가 동점 priority -> AMBIGUOUS_LAYOUT_MATCH
{
  const result = selectLayout({ ...baseCriteria, totalQuantity: 3, composition: 'mixed' }, layouts);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, 'AMBIGUOUS_LAYOUT_MATCH');
    assert.deepEqual(result.candidates?.slice().sort(), ['L_TRIPLE', 'L_TRIPLE_ALT']);
  }
}

// 4) 슬롯 수 7개는 매칭 레이아웃 자체가 없음 -> NO_LAYOUT_WITH_MATCHING_SLOT_COUNT (fallback/축소배치 없음)
{
  const result = selectLayout({ ...baseCriteria, totalQuantity: 7 }, layouts);
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.reason, 'NO_LAYOUT_WITH_MATCHING_SLOT_COUNT');
}

// 5) 슬롯 수는 맞지만 aspectRatioFamily가 안 맞으면 NO_MATCHING_LAYOUT
{
  const result = selectLayout({ ...baseCriteria, aspectRatioFamily: 'wide' }, layouts);
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.reason, 'NO_MATCHING_LAYOUT');
}

console.log('selectLayout.test.ts: 모든 검증 통과');
