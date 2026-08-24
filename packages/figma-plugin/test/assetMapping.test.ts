import assert from 'node:assert/strict';
import { composePlan, CHANNEL_PRESETS, LAYOUTS, type Product } from '@thumbnail-generator/core';
import { installMockFigma, uninstallMockFigma, MockNode } from '../src/mock/mockFigma';
import { seedMockTemplate, MOCK_TEMPLATE_BINDING, MOCK_PRODUCTS } from '../src/mock/mockTemplate';
import { renderPlan } from '../src/renderer';
import type { FigmaTemplateBinding } from '../src/templateMapper';

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

async function testLayerIndexResolvesDuplicateNamedSlots() {
  // 채널 확장 조사에서 발견된 실제 사례: 일부 채널 프레임은 슬롯마다 고유 레이어 이름을 쓰지
  // 않고 전부 같은 이름(예: "메추리알장조림1808")을 재사용한다. layerIndex가 없으면
  // findOne이 항상 같은(첫 번째) 노드를 반환해서 슬롯끼리 서로 덮어써 버리므로, layerIndex로
  // 정확히 구분되는지 확인한다.
  const handle = installMockFigma();
  try {
    const template = new MockNode('FRAME', 'MOCK_DUP_NAME_TEMPLATE');
    template.width = 1000;
    template.height = 1000;
    for (let i = 0; i < 3; i++) {
      const slot = new MockNode('RECTANGLE', 'dup_slot'); // 3개 모두 이름이 동일
      slot.width = 300;
      slot.height = 300;
      slot.fills = [{ type: 'SOLID' }];
      template.appendChild(slot);
    }
    handle.currentPage.appendChild(template);

    const productAssetsPage = handle.addPage('PRODUCT_ASSETS');
    for (const p of MOCK_PRODUCTS) {
      const node = new MockNode('RECTANGLE', p.key);
      node.fills = [{ type: 'IMAGE', imageHash: p.imageHash, scaleMode: 'FILL' }];
      productAssetsPage.appendChild(node);
    }

    const dupBinding: FigmaTemplateBinding = {
      layoutKey: 'LAYOUT_02',
      channelPresetId: 'naver-1000x1000',
      templateFrameName: 'MOCK_DUP_NAME_TEMPLATE',
      slotBindings: [
        { slotKey: 'slot_1', layerName: 'dup_slot', layerIndex: 0 },
        { slotKey: 'slot_2', layerName: 'dup_slot', layerIndex: 1 },
        { slotKey: 'slot_3', layerName: 'dup_slot', layerIndex: 2 },
      ],
    };

    const products = mockProductsAsCoreProducts();
    const composeResult = composeMockPlan(products);
    assert.equal(composeResult.ok, true);
    if (!composeResult.ok) return;

    const renderResult = await renderPlan(composeResult.plan, [dupBinding]);
    assert.equal(renderResult.ok, true, `renderPlan 실패: ${!renderResult.ok ? renderResult.message : ''}`);

    const clone = handle.currentPage.children.find((n) => n.name.includes('(자동생성 결과)'))!;
    assert.ok(clone, '결과 clone이 있어야 함');
    const dupSlots = clone.children.filter((n) => n.name === 'dup_slot');
    assert.equal(dupSlots.length, 3);

    // 3개 슬롯이 서로 다른(첫 번째로 전부 덮어써지지 않은) 이미지를 가리켜야 한다.
    const imageHashes = dupSlots.map((n) => (n.fills as { imageHash?: string }[])[0]?.imageHash);
    assert.deepEqual(
      imageHashes,
      MOCK_PRODUCTS.map((p) => p.imageHash),
      'layerIndex 순서대로 각기 다른 상품 이미지가 정확히 배정되어야 함(전부 같은 이미지로 덮어써지면 안 됨)',
    );

    console.log('  ✓ layerIndex: 같은 이름을 가진 슬롯 레이어끼리도 순번으로 정확히 구분되어 각기 다른 이미지로 채워짐');
  } finally {
    uninstallMockFigma();
  }
}

async function testLayerIndexMissingReturnsClearFailure() {
  const handle = installMockFigma();
  try {
    const template = new MockNode('FRAME', 'MOCK_DUP_NAME_TEMPLATE_2');
    template.width = 1000;
    template.height = 1000;
    const slot = new MockNode('RECTANGLE', 'dup_slot');
    slot.fills = [{ type: 'SOLID' }];
    template.appendChild(slot); // 딱 1개만 존재
    handle.currentPage.appendChild(template);

    const productAssetsPage = handle.addPage('PRODUCT_ASSETS');
    for (const p of MOCK_PRODUCTS) {
      const node = new MockNode('RECTANGLE', p.key);
      node.fills = [{ type: 'IMAGE', imageHash: p.imageHash, scaleMode: 'FILL' }];
      productAssetsPage.appendChild(node);
    }

    // layerIndex=1을 요구하지만 실제로는 1개(index 0)만 존재 -> 명확히 실패해야 함(임의 대체 금지)
    const dupBinding: FigmaTemplateBinding = {
      layoutKey: 'LAYOUT_01',
      channelPresetId: 'naver-1000x1000',
      templateFrameName: 'MOCK_DUP_NAME_TEMPLATE_2',
      slotBindings: [{ slotKey: 'slot_1', layerName: 'dup_slot', layerIndex: 1 }],
    };

    const products = [
      { id: 'p1', name: MOCK_PRODUCTS[0].key, productGroup: 'simple-meal' as const, assetKey: MOCK_PRODUCTS[0].key },
    ];
    const composeResult = composePlan(
      { items: [{ productId: 'p1', quantity: 1 }], channelPresetId: 'naver-1000x1000' },
      { products, channelPresets: CHANNEL_PRESETS, layouts: LAYOUTS },
    );
    assert.equal(composeResult.ok, true);
    if (!composeResult.ok) return;

    const renderResult = await renderPlan(composeResult.plan, [dupBinding]);
    assert.equal(renderResult.ok, false, 'layerIndex에 해당하는 노드가 없으면 실패해야 함');

    const leftoverClones = handle.currentPage.children.filter((n) => n.name.includes('(자동생성 결과)'));
    assert.equal(leftoverClones.length, 0, '실패 시 clone이 남아있으면 안 됨');

    console.log('  ✓ layerIndex: 지정한 순번의 노드가 실제로 없으면 명확히 실패함(임의 대체 금지)');
  } finally {
    uninstallMockFigma();
  }
}

async function main() {
  await testSuccessCase();
  await testMissingLayerFailure();
  await testUnregisteredAssetFailure();
  await testLayerIndexResolvesDuplicateNamedSlots();
  await testLayerIndexMissingReturnsClearFailure();
  console.log('assetMapping.test.ts: 모든 검증 통과');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
