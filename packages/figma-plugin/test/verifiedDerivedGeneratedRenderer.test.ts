import assert from 'node:assert/strict';
import type { CompositionPlan } from '@thumbnail-generator/core';
import { installMockFigma, uninstallMockFigma, MockNode } from '../src/mock/mockFigma';
import type { FigmaTemplateBinding } from '../src/templateMapper';
import { renderVerifiedDerivedGeneratedPlan, type VerifiedDerivedSupport } from '../src/verifiedDerivedGeneratedRenderer';

/**
 * Generated V2(verified-template-derived) 검증: 순수 공식으로 슬롯 좌표를 새로 계산하는 대신,
 * verified frame을 clone해서 "목표 수량보다 많은 슬롯만 제거"하고 나머지는 원본 좌표/크기를
 * 그대로 유지하는지 확인한다. mixedLayoutGeometry.ts/generatedLayoutGeometry.ts(구 방식)는
 * 건드리지 않았으므로 여기서 다루지 않는다.
 */

const PRODUCT_ASSETS_PAGE = 'PRODUCT_ASSETS';

function seedAssets(handle: ReturnType<typeof installMockFigma>, keys: { key: string; hash: string }[]) {
  const page = handle.addPage(PRODUCT_ASSETS_PAGE);
  for (const { key, hash } of keys) {
    const node = new MockNode('RECTANGLE', key);
    node.fills = [{ type: 'IMAGE', imageHash: hash }];
    page.appendChild(node);
  }
}

/** 5슬롯 verified source(LAYOUT_TEST_5): 겹치지 않는 5칸을 가로로 배치, 중앙(slot_c)만 다른 y로 살짝 어긋나게. */
function seedFiveSlotSource(handle: ReturnType<typeof installMockFigma>) {
  const frame = new MockNode('FRAME', 'MOCK_SOURCE_5');
  frame.width = 1000;
  frame.height = 1000;
  const names = ['slot_a', 'slot_b', 'slot_c', 'slot_d', 'slot_e'];
  names.forEach((name, i) => {
    const slot = new MockNode('RECTANGLE', name);
    slot.width = 180;
    slot.height = 180;
    slot.x = 20 + i * 190; // 20,210,400,590,780 -> bbox: minX20,maxX=780+180=960, center=490 (frame center 500)
    slot.y = 410;
    slot.fills = [{ type: 'SOLID' }];
    frame.appendChild(slot);
  });
  handle.currentPage.appendChild(frame);
  return names;
}

const SOURCE_BINDING: FigmaTemplateBinding = {
  layoutKey: 'LAYOUT_TEST_5',
  channelPresetId: 'naver-1000x1000',
  templateFrameName: 'MOCK_SOURCE_5',
  slotBindings: ['slot_a', 'slot_b', 'slot_c', 'slot_d', 'slot_e'].map((n) => ({ slotKey: `slot_${n}`, layerName: n })),
};

function planFor(assetKeys: string[]): CompositionPlan {
  return {
    layoutKey: `GENERATED_TEST_${assetKeys.length}`,
    channelPresetId: 'naver-1000x1000',
    productGroup: 'simple-meal',
    thumbnailType: 'basic',
    slots: assetKeys.map((k, i) => ({ slotKey: `slot_${i + 1}`, assetKey: k, role: 'sale' as const })),
    layoutSource: { kind: 'generated', params: { familyId: 'row-linear', slotCount: assetKeys.length } },
    generatedLayout: true,
    reviewRequired: true,
    options: { logoVariant: 'red' },
  };
}

async function testKeepsOriginalGeometryAndRemovesOnlyExcess() {
  const handle = installMockFigma();
  try {
    seedFiveSlotSource(handle);
    seedAssets(handle, [
      { key: 'P1', hash: 'hash-1' },
      { key: 'P2', hash: 'hash-2' },
      { key: 'P3', hash: 'hash-3' },
    ]);

    const support: VerifiedDerivedSupport = {
      channelPresetId: 'naver-1000x1000',
      targetSlotCount: 3,
      sourceLayoutKey: 'LAYOUT_TEST_5',
      keepLayerNames: ['slot_a', 'slot_c', 'slot_e'], // 가운데부터 남기고 b,d 제거(대칭 유지 예시와 반대로 테스트에서는 skip 패턴 확인용)
    };

    const plan = planFor(['P1', 'P2', 'P3']);
    const result = await renderVerifiedDerivedGeneratedPlan(plan, [support], [SOURCE_BINDING], { select: false });
    assert.equal(result.ok, true, `실패: ${!result.ok ? result.message : ''}`);
    if (!result.ok) return;

    const clone = handle.currentPage.children.find((n) => n.id === result.nodeId)!;
    assert.ok(clone, '결과 clone이 있어야 함');

    // 제거된 슬롯(b, d)은 clone에 없어야 한다.
    assert.equal(clone.children.some((n) => n.name === 'slot_b'), false, '목표 수량보다 많은 슬롯(slot_b)은 제거되어야 함');
    assert.equal(clone.children.some((n) => n.name === 'slot_d'), false, '목표 수량보다 많은 슬롯(slot_d)은 제거되어야 함');

    // 유지된 슬롯(a,c,e)은 원본 좌표/크기를 그대로 유지해야 한다(공식으로 재계산하지 않음).
    const a = clone.children.find((n) => n.name === 'slot_a')!;
    const c = clone.children.find((n) => n.name === 'slot_c')!;
    const e = clone.children.find((n) => n.name === 'slot_e')!;
    assert.equal(a.width, 180);
    assert.equal(a.height, 180);
    assert.equal(c.width, 180);
    assert.equal(e.width, 180);
    // a,c,e의 bbox 중심(20~960 -> 490)이 프레임 중심(500)에서 8% 미만이므로 재중앙 정렬은 없어야
    // 하고, 그러면 slot_a의 x는 원본 20 그대로여야 한다.
    assert.equal(a.x, 20, '재중앙 정렬 임계값 미만이면 원본 좌표를 그대로 유지해야 함(새 공식으로 재계산 금지)');
    assert.equal(e.x, 780);

    // 각 슬롯이 plan.slots 순서(P1,P2,P3)대로 정확히 채워져야 한다.
    assert.equal((a.fills as { imageHash?: string }[])[0].imageHash, 'hash-1');
    assert.equal((c.fills as { imageHash?: string }[])[0].imageHash, 'hash-2');
    assert.equal((e.fills as { imageHash?: string }[])[0].imageHash, 'hash-3');

    // 원본 소스 프레임은 수정되지 않아야 한다(5슬롯 그대로).
    const source = handle.currentPage.children.find((n) => n.name === 'MOCK_SOURCE_5')!;
    assert.equal(source.children.length, 5, '원본 verified 프레임은 절대 수정되면 안 됨');

    console.log('  ✓ 목표 수량보다 많은 슬롯만 제거되고, 남은 슬롯의 좌표/크기는 원본 그대로 유지됨(새 공식 재계산 없음)');
  } finally {
    uninstallMockFigma();
  }
}

async function testRecentersOnlyWhenSeverelyLopsided() {
  const handle = installMockFigma();
  try {
    seedFiveSlotSource(handle);
    seedAssets(handle, [
      { key: 'P1', hash: 'hash-1' },
      { key: 'P2', hash: 'hash-2' },
    ]);

    // slot_a(x20)+slot_b(x210)만 유지 -> bbox center = (20+210+180)/2 = 205, frame center 500,
    // 차이 295 >> 1000*0.08=80 -> 재중앙 정렬 대상.
    const support: VerifiedDerivedSupport = {
      channelPresetId: 'naver-1000x1000',
      targetSlotCount: 2,
      sourceLayoutKey: 'LAYOUT_TEST_5',
      keepLayerNames: ['slot_a', 'slot_b'],
    };

    const plan = planFor(['P1', 'P2']);
    const result = await renderVerifiedDerivedGeneratedPlan(plan, [support], [SOURCE_BINDING], { select: false });
    assert.equal(result.ok, true, `실패: ${!result.ok ? result.message : ''}`);
    if (!result.ok) return;
    assert.equal(result.recentered, true, '심하게 치우친 경우 recentered=true로 보고되어야 함');

    const clone = handle.currentPage.children.find((n) => n.id === result.nodeId)!;
    const a = clone.children.find((n) => n.name === 'slot_a')!;
    const b = clone.children.find((n) => n.name === 'slot_b')!;

    // 원본 상대 간격(190px)은 그대로 유지되어야 한다(개별 슬롯 크기/간격은 건드리지 않음).
    assert.equal(b.x - a.x, 190, '재중앙 정렬은 그룹을 평행이동만 해야 한다 — 슬롯 간 상대 간격은 원본 그대로 유지되어야 함');

    // 재중앙 정렬 후 bbox 중심이 프레임 중심(500)과 거의 일치해야 한다.
    const newBboxCenterX = (a.x + (b.x + b.width)) / 2;
    assert.ok(Math.abs(newBboxCenterX - 500) < 1, `재중앙 정렬 후 bbox 중심(${newBboxCenterX})이 프레임 중심과 일치해야 함`);

    console.log('  ✓ 제거 후 심하게 치우친 경우에만 그룹 전체를 평행이동으로 재중앙 정렬(상대 간격/크기는 유지)');
  } finally {
    uninstallMockFigma();
  }
}

async function testMainAlwaysFirstKeptLayerForMainSubSource() {
  // main/sub 구조가 있는 source에서 파생할 때 keepLayerNames[0](=main)이 plan.slots[0]
  // (Excel 순번 1번 상품)로 채워지는지 확인 — "기존 정책 유지"의 핵심.
  const handle = installMockFigma();
  try {
    const frame = new MockNode('FRAME', 'MOCK_SOURCE_MAIN_SUB');
    frame.width = 1000;
    frame.height = 1000;
    const main = new MockNode('RECTANGLE', 'slot_main');
    main.width = 400;
    main.height = 400;
    main.x = 300;
    main.y = 300;
    main.fills = [{ type: 'SOLID' }];
    frame.appendChild(main);
    for (const name of ['slot_sub1', 'slot_sub2']) {
      const sub = new MockNode('RECTANGLE', name);
      sub.width = 150;
      sub.height = 150;
      sub.fills = [{ type: 'SOLID' }];
      frame.appendChild(sub);
    }
    handle.currentPage.appendChild(frame);

    seedAssets(handle, [
      { key: 'SEQ1_PRODUCT', hash: 'hash-main' },
      { key: 'SEQ2_PRODUCT', hash: 'hash-sub' },
    ]);

    const mainSubBinding: FigmaTemplateBinding = {
      layoutKey: 'LAYOUT_TEST_MAIN',
      channelPresetId: 'naver-1000x1000',
      templateFrameName: 'MOCK_SOURCE_MAIN_SUB',
      slotBindings: [
        { slotKey: 'slot_1', layerName: 'slot_main' },
        { slotKey: 'slot_2', layerName: 'slot_sub1' },
        { slotKey: 'slot_3', layerName: 'slot_sub2' },
      ],
    };
    const support: VerifiedDerivedSupport = {
      channelPresetId: 'naver-1000x1000',
      targetSlotCount: 2,
      sourceLayoutKey: 'LAYOUT_TEST_MAIN',
      keepLayerNames: ['slot_main', 'slot_sub1'], // main이 항상 [0]
    };

    // plan.slots는 core의 assignSlots처럼 이미 Excel 순번 오름차순으로 채워진 상태 —
    // 순번 1번 상품(SEQ1_PRODUCT)이 배열의 첫 번째다.
    const plan = planFor(['SEQ1_PRODUCT', 'SEQ2_PRODUCT']);
    const result = await renderVerifiedDerivedGeneratedPlan(plan, [support], [mainSubBinding], { select: false });
    assert.equal(result.ok, true, `실패: ${!result.ok ? result.message : ''}`);
    if (!result.ok) return;

    const clone = handle.currentPage.children.find((n) => n.id === result.nodeId)!;
    const mainLayer = clone.children.find((n) => n.name === 'slot_main')!;
    assert.equal(
      (mainLayer.fills as { imageHash?: string }[])[0].imageHash,
      'hash-main',
      'Excel 순번 1번 상품(SEQ1_PRODUCT)이 main 슬롯에 들어가야 함(기존 정책 유지)',
    );

    console.log('  ✓ main/sub 구조 source에서 파생 시 Excel 순번 1번 상품이 main에 그대로 배정됨(기존 정책 유지)');
  } finally {
    uninstallMockFigma();
  }
}

async function testNoSupportReturnsFailureMentioningBaseTemplate() {
  const handle = installMockFigma();
  try {
    seedFiveSlotSource(handle);
    const plan = planFor(['P1', 'P2']);
    const result = await renderVerifiedDerivedGeneratedPlan(plan, [], [SOURCE_BINDING], { select: false });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.message, /verified-derived 기본 템플릿/);
    }
    console.log('  ✓ 지원 목록에 없는 채널+슬롯 수 조합은 generic 대체 없이 명확히 실패함');
  } finally {
    uninstallMockFigma();
  }
}

async function main() {
  await testKeepsOriginalGeometryAndRemovesOnlyExcess();
  await testRecentersOnlyWhenSeverelyLopsided();
  await testMainAlwaysFirstKeptLayerForMainSubSource();
  await testNoSupportReturnsFailureMentioningBaseTemplate();
  console.log('verifiedDerivedGeneratedRenderer.test.ts: 모든 검증 통과');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
