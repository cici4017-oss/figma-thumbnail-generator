import assert from 'node:assert/strict';
import { composePlan, CHANNEL_PRESETS, LAYOUTS, type Product } from '@thumbnail-generator/core';
import { installMockFigma, uninstallMockFigma } from '../src/mock/mockFigma';
import { seedMockTemplate, MOCK_TEMPLATE_BINDING, MOCK_PRODUCTS } from '../src/mock/mockTemplate';
import { renderPlan } from '../src/renderer';

/**
 * templateMapper/renderer/assetResolver(=asset mapping 구조)를 회사 Figma 파일 없이 검증한다.
 * renderer.ts/assetResolver.ts는 이 테스트를 위해 코드를 전혀 바꾸지 않는다 — mockFigma가
 * globalThis.figma를 대신하고, mock 바인딩을 renderPlan에 명시적으로 넘길 뿐이다.
 */

function mockProductsAsCoreProducts(): Product[] {
  return MOCK_PRODUCTS.map((p, i) => ({
    id: `mock-product-${i}`,
    name: p.key,
    productGroup: 'simple-meal',
    assetKey: p.key,
  }));
}

function composeMockPlan(products: Product[]) {
  return composePlan(
    {
      items: products.map((p) => ({ productId: p.id, quantity: 1 })),
      channelPresetId: 'naver-1000x1000',
    },
    { products, channelPresets: CHANNEL_PRESETS, layouts: LAYOUTS },
  );
}

async function testSuccessCase() {
  const handle = installMockFigma();
  try {
    seedMockTemplate(handle);

    const originalFrame = handle.currentPage.findOne((n) => n.name === 'MOCK_썸네일_3종');
    assert.ok(originalFrame, 'mock 템플릿 프레임이 있어야 함');
    const fillsBefore = originalFrame!.children.map((c) => JSON.stringify(c.fills));

    const products = mockProductsAsCoreProducts();
    const composeResult = composeMockPlan(products);
    assert.equal(composeResult.ok, true, 'composePlan이 성공해야 함');
    if (!composeResult.ok) return;

    const renderResult = await renderPlan(composeResult.plan, [MOCK_TEMPLATE_BINDING]);
    assert.equal(
      renderResult.ok,
      true,
      `renderPlan 실패: ${!renderResult.ok ? renderResult.message : ''}`,
    );

    // 원본 프레임은 절대 수정되지 않아야 한다.
    const fillsAfter = originalFrame!.children.map((c) => JSON.stringify(c.fills));
    assert.deepEqual(fillsAfter, fillsBefore, '원본 프레임의 fill이 바뀌면 안 됨');

    // 결과 clone이 정확히 1개 생기고, 3개 슬롯 모두 올바른 이미지로 채워졌는지 확인.
    const clones = handle.currentPage.children.filter((n) => n.name.includes('(자동생성 결과)'));
    assert.equal(clones.length, 1, '결과 프레임이 정확히 1개 생겨야 함');

    const clone = clones[0];
    const slotLayerNames = ['mock_slot_1', 'mock_slot_2', 'mock_slot_3'];
    for (let i = 0; i < slotLayerNames.length; i++) {
      const layer = clone.findOne((n) => n.name === slotLayerNames[i]);
      assert.ok(layer, `clone 안에 레이어 "${slotLayerNames[i]}"가 있어야 함`);
      const fills = layer!.fills;
      assert.ok(Array.isArray(fills));
      const fill = (fills as { type: string; imageHash?: string }[])[0];
      assert.equal(fill.type, 'IMAGE');
      assert.equal(fill.imageHash, MOCK_PRODUCTS[i].imageHash, `슬롯 ${i + 1}이 올바른 상품 이미지를 가리켜야 함`);
    }

    console.log('  ✓ 정상 케이스: 3슬롯 모두 채워지고 원본은 그대로 유지됨');
  } finally {
    uninstallMockFigma();
  }
}

async function testMissingLayerFailure() {
  const handle = installMockFigma();
  try {
    seedMockTemplate(handle);

    const brokenBinding = {
      ...MOCK_TEMPLATE_BINDING,
      slotBindings: [
        { slotKey: 'slot_1', layerName: 'mock_slot_1' },
        { slotKey: 'slot_2', layerName: '존재하지않는레이어' },
        { slotKey: 'slot_3', layerName: 'mock_slot_3' },
      ],
    };

    const products = mockProductsAsCoreProducts();
    const composeResult = composeMockPlan(products);
    assert.equal(composeResult.ok, true);
    if (!composeResult.ok) return;

    const renderResult = await renderPlan(composeResult.plan, [brokenBinding]);
    assert.equal(renderResult.ok, false, '레이어를 못 찾으면 실패해야 함(임의 진행 금지)');

    const leftoverClones = handle.currentPage.children.filter((n) => n.name.includes('(자동생성 결과)'));
    assert.equal(leftoverClones.length, 0, '실패 시 clone이 남아 있으면 안 됨(부분 실패 상태 금지)');

    console.log('  ✓ 실패 케이스(레이어 없음): clone 안 남기고 오류 반환');
  } finally {
    uninstallMockFigma();
  }
}

async function testUnregisteredAssetFailure() {
  const handle = installMockFigma();
  try {
    seedMockTemplate(handle);

    const products: Product[] = [
      { id: 'p1', name: 'unknown', productGroup: 'simple-meal', assetKey: 'NOT_REGISTERED_IN_PRODUCT_ASSETS' },
      { id: 'p2', name: MOCK_PRODUCTS[1].key, productGroup: 'simple-meal', assetKey: MOCK_PRODUCTS[1].key },
      { id: 'p3', name: MOCK_PRODUCTS[2].key, productGroup: 'simple-meal', assetKey: MOCK_PRODUCTS[2].key },
    ];

    const composeResult = composeMockPlan(products);
    assert.equal(composeResult.ok, true);
    if (!composeResult.ok) return;

    const renderResult = await renderPlan(composeResult.plan, [MOCK_TEMPLATE_BINDING]);
    assert.equal(renderResult.ok, false, 'PRODUCT_ASSETS에 없는 상품이면 실패해야 함');

    const leftoverClones = handle.currentPage.children.filter((n) => n.name.includes('(자동생성 결과)'));
    assert.equal(leftoverClones.length, 0);

    console.log('  ✓ 실패 케이스(미등록 asset): clone 안 남기고 오류 반환');
  } finally {
    uninstallMockFigma();
  }
}

async function main() {
  await testSuccessCase();
  await testMissingLayerFailure();
  await testUnregisteredAssetFailure();
  console.log('assetMapping.test.ts: 모든 검증 통과');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
