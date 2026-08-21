import assert from 'node:assert/strict';
import { assignSlots, type LayoutDefinition } from '../src/index';

function layoutWithSaleSlots(count: number, extra: Partial<LayoutDefinition> = {}): LayoutDefinition {
  return {
    layoutKey: `L_SALE_${count}`,
    arrangementKind: 'single-center',
    slots: Array.from({ length: count }, (_, i) => ({ slotKey: `slot_${i + 1}`, role: 'sale' as const })),
    match: {},
    priority: 0,
    source: { kind: 'verified' },
    ...extra,
  };
}

// 1) 예시 그대로: A×2 + B×3 + C×4 -> slot_1~2=A, slot_3~5=B, slot_6~9=C
{
  const layout = layoutWithSaleSlots(9);
  const saleAssetKeys = [
    'A', 'A',
    'B', 'B', 'B',
    'C', 'C', 'C', 'C',
  ];
  const result = assignSlots({ layout, saleAssetKeys, giftAssetKeys: [] });
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.slots.length, 9);
  const expected = [
    ['slot_1', 'A'], ['slot_2', 'A'],
    ['slot_3', 'B'], ['slot_4', 'B'], ['slot_5', 'B'],
    ['slot_6', 'C'], ['slot_7', 'C'], ['slot_8', 'C'], ['slot_9', 'C'],
  ];
  if (result.ok) {
    assert.deepEqual(
      result.slots.map((s) => [s.slotKey, s.assetKey]),
      expected,
    );
    assert.ok(result.slots.every((s) => s.role === 'sale'));
  }
}

// 2) 판매 상품 수가 슬롯 수보다 적음 -> 생략/축소 없이 SALE_SLOT_COUNT_MISMATCH
{
  const layout = layoutWithSaleSlots(9);
  const result = assignSlots({ layout, saleAssetKeys: ['A', 'A', 'B', 'B', 'B'], giftAssetKeys: [] });
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.reason, 'SALE_SLOT_COUNT_MISMATCH');
}

// 3) 판매 상품 수가 슬롯 수보다 많음 -> 겹쳐 넣지 않고 SALE_SLOT_COUNT_MISMATCH
{
  const layout = layoutWithSaleSlots(3);
  const result = assignSlots({ layout, saleAssetKeys: ['A', 'B', 'C', 'D'], giftAssetKeys: [] });
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.reason, 'SALE_SLOT_COUNT_MISMATCH');
}

// 4) gift 슬롯은 별도 role로 판매 슬롯 계산에서 제외된다
{
  const layout: LayoutDefinition = {
    layoutKey: 'L_SALE2_GIFT1',
    arrangementKind: 'duo-gift-overlay',
    slots: [
      { slotKey: 'slot_1', role: 'sale' },
      { slotKey: 'slot_2', role: 'sale' },
      { slotKey: 'gift_1', role: 'gift' },
    ],
    match: {},
    priority: 0,
    source: { kind: 'verified' },
  };
  const result = assignSlots({ layout, saleAssetKeys: ['A', 'B'], giftAssetKeys: ['G'] });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(
      result.slots.map((s) => [s.slotKey, s.assetKey, s.role]),
      [
        ['slot_1', 'A', 'sale'],
        ['slot_2', 'B', 'sale'],
        ['gift_1', 'G', 'gift'],
      ],
    );
  }

  // gift 상품을 안 줬는데 gift 슬롯이 있으면 실패해야 함 (판매수량과 별개로 검증됨)
  const missingGift = assignSlots({ layout, saleAssetKeys: ['A', 'B'], giftAssetKeys: [] });
  assert.equal(missingGift.ok, false);
  assert.equal(!missingGift.ok && missingGift.reason, 'GIFT_SLOT_COUNT_MISMATCH');
}

// 5) layout.slots 배열 순서가 뒤섞여 있어도 slotKey의 숫자 기준으로 slot_1→slot_N 순서로 채운다
{
  const layout: LayoutDefinition = {
    layoutKey: 'L_OUT_OF_ORDER',
    arrangementKind: 'triple-cascade',
    slots: [
      { slotKey: 'slot_3', role: 'sale' },
      { slotKey: 'slot_1', role: 'sale' },
      { slotKey: 'slot_2', role: 'sale' },
    ],
    match: {},
    priority: 0,
    source: { kind: 'verified' },
  };
  const result = assignSlots({ layout, saleAssetKeys: ['first', 'second', 'third'], giftAssetKeys: [] });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(
      result.slots.map((s) => [s.slotKey, s.assetKey]),
      [
        ['slot_1', 'first'],
        ['slot_2', 'second'],
        ['slot_3', 'third'],
      ],
    );
  }
}

console.log('assignSlots.test.ts: 모든 검증 통과');
