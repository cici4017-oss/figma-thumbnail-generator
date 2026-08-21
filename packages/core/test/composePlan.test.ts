import assert from 'node:assert/strict';
import { composePlan, CHANNEL_PRESETS, LAYOUTS, type LayoutDefinition, type Product } from '../src/index';

const products: Product[] = [
  { id: 'p-beef', name: '소고기장조림', productGroup: 'simple-meal', assetKey: 'beef-asset' },
  { id: 'p-quail', name: '메추리알장조림', productGroup: 'simple-meal', assetKey: 'quail-asset' },
  { id: 'p-chive', name: '부추꼬막무침', productGroup: 'simple-meal', assetKey: 'chive-asset' },
  { id: 'p-baby', name: '이유식', productGroup: 'baby-food', assetKey: 'baby-asset' },
];

const deps = { products, channelPresets: CHANNEL_PRESETS, layouts: LAYOUTS };

// 1) 3종 혼합 -> LAYOUT_02, 슬롯 순서대로 assetKey가 매핑되어야 함
{
  const result = composePlan(
    {
      items: [
        { productId: 'p-beef', quantity: 1 },
        { productId: 'p-quail', quantity: 1 },
        { productId: 'p-chive', quantity: 1 },
      ],
      channelPresetId: 'naver-1000x1000',
    },
    deps,
  );
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.plan.layoutKey, 'LAYOUT_02');
  assert.deepEqual(
    result.ok ? result.plan.slots.map((s) => s.assetKey) : null,
    ['beef-asset', 'quail-asset', 'chive-asset'],
  );
  assert.equal(result.ok && result.plan.thumbnailType, 'basic', 'thumbnailType 생략 시 기본값 basic');
}

// 2) 서로 다른 productGroup이 섞이면 에러 (임의로 하나 골라서 진행하지 않음)
{
  const result = composePlan(
    {
      items: [
        { productId: 'p-beef', quantity: 1 },
        { productId: 'p-baby', quantity: 1 },
        { productId: 'p-chive', quantity: 1 },
      ],
      channelPresetId: 'naver-1000x1000',
    },
    deps,
  );
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.reason, 'INCONSISTENT_PRODUCT_GROUP');
}

// 3) 존재하지 않는 channelPresetId
{
  const result = composePlan(
    { items: [{ productId: 'p-beef', quantity: 3 }], channelPresetId: 'no-such-channel' },
    deps,
  );
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.reason, 'CHANNEL_PRESET_NOT_FOUND');
}

// 4) 증정품 슬롯이 없는 레이아웃에 giftItems를 넣으면 매칭 실패해야 함 (fallback으로 아무 레이아웃에나 끼워넣지 않음)
{
  const result = composePlan(
    {
      items: [
        { productId: 'p-beef', quantity: 1 },
        { productId: 'p-quail', quantity: 1 },
        { productId: 'p-chive', quantity: 1 },
      ],
      giftItems: [{ productId: 'p-beef', quantity: 1 }],
      channelPresetId: 'naver-1000x1000',
    },
    deps,
  );
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.reason, 'NO_LAYOUT_WITH_MATCHING_SLOT_COUNT');
}

// 5) end-to-end: A×2 + B×3 + C×4 (9종 혼합) -> 9슬롯 Layout, slot_1~2=A, slot_3~5=B, slot_6~9=C
//    (selectLayout은 Layout 선택만, 실제 순번×수량 펼치기/슬롯 배치는 assignSlots가 담당)
{
  const nineSlotLayout: LayoutDefinition = {
    layoutKey: 'L_NINE',
    arrangementKind: 'dense-grid-20',
    slots: Array.from({ length: 9 }, (_, i) => ({ slotKey: `slot_${i + 1}`, role: 'sale' as const })),
    match: {},
    priority: 100,
  };
  const nineSlotDeps = { products, channelPresets: CHANNEL_PRESETS, layouts: [...LAYOUTS, nineSlotLayout] };

  const result = composePlan(
    {
      // 작업ID 내 순번 오름차순으로 이미 정렬된 상태를 가정 (A -> B -> C 순서)
      items: [
        { productId: 'p-beef', quantity: 2 }, // A
        { productId: 'p-quail', quantity: 3 }, // B
        { productId: 'p-chive', quantity: 4 }, // C
      ],
      channelPresetId: 'naver-1000x1000',
    },
    nineSlotDeps,
  );

  assert.equal(result.ok, true);
  assert.equal(result.ok && result.plan.layoutKey, 'L_NINE');
  const expectedAssetKeys = [
    'beef-asset', 'beef-asset',
    'quail-asset', 'quail-asset', 'quail-asset',
    'chive-asset', 'chive-asset', 'chive-asset', 'chive-asset',
  ];
  assert.deepEqual(
    result.ok ? result.plan.slots.map((s) => [s.slotKey, s.assetKey]) : null,
    expectedAssetKeys.map((assetKey, i) => [`slot_${i + 1}`, assetKey]),
  );
}

console.log('composePlan.test.ts: 모든 검증 통과');
