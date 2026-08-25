import assert from 'node:assert/strict';
import { installMockFigma, uninstallMockFigma, MockNode } from '../src/mock/mockFigma';
import { resolveProductAsset, buildImageFill, PRODUCT_ASSETS_PAGE_NAME } from '../src/assetResolver';
import type { ProductAssetBinding } from '@thumbnail-generator/core';

/**
 * 실사용 진단으로 확인된 문제(PRODUCT_ASSETS 페이지가 아예 없어 모든 render가 asset lookup
 * 단계에서 실패)에 대한 수정 검증. resolveProductAsset이 이제:
 * 1) ProductAssetBinding의 confirmed source(confirmedNodeId)를 1차로 시도하고,
 * 2) 실패하면 legacy PRODUCT_ASSETS 페이지로 폴백하는지 확인한다.
 *
 * PRODUCT_ASSET_BINDINGS 실제 프로덕션 데이터에 의존하지 않도록, 여기서는 작은 mock binding
 * 목록을 직접 주입한다(resolveProductAsset의 두 번째 인자).
 */

const MOCK_BINDINGS: ProductAssetBinding[] = [
  {
    productCode: 'MOCK_CONFIRMED_WITH_IMAGE',
    variants: [
      {
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: 'mock-component', confirmedNodeId: 'node:confirmed-ok' },
        assetKey: 'MOCK_CONFIRMED_WITH_IMAGE',
        status: 'confirmed',
      },
    ],
  },
  {
    productCode: 'MOCK_CONFIRMED_NODE_MISSING',
    variants: [
      {
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: 'mock-component', confirmedNodeId: 'node:does-not-exist' },
        assetKey: 'MOCK_CONFIRMED_NODE_MISSING',
        status: 'confirmed',
      },
    ],
  },
  {
    productCode: 'MOCK_CONFIRMED_NO_IMAGE_FILL',
    variants: [
      {
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: 'mock-component', confirmedNodeId: 'node:no-image-fill' },
        assetKey: 'MOCK_CONFIRMED_NO_IMAGE_FILL',
        status: 'confirmed',
      },
    ],
  },
  {
    productCode: 'MOCK_CONFIRMED_DEEP_IMAGE',
    variants: [
      {
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: 'mock-component', confirmedNodeId: 'node:group-with-child-image' },
        assetKey: 'MOCK_CONFIRMED_DEEP_IMAGE',
        status: 'confirmed',
      },
    ],
  },
  {
    productCode: 'MOCK_NO_CONFIRMED_NODE_ID',
    variants: [
      {
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: 'mock-component' }, // confirmedNodeId 없음
        assetKey: 'MOCK_NO_CONFIRMED_NODE_ID',
        status: 'code-fallback',
      },
    ],
  },
  {
    productCode: 'MOCK_IMAGE_NODE_SOURCE',
    variants: [
      {
        assetKind: 'package',
        source: { kind: 'image-node', nodeId: 'node:image-node-source' },
        assetKey: 'MOCK_IMAGE_NODE_SOURCE',
        status: 'confirmed',
      },
    ],
  },
  {
    // 본도가니탕 asset 진단 회귀: screenshot으로 확인 결과 실제 package가 아님이 확정된
    // source. confirmedNodeId가 실제로 존재해도(=여기서는 존재하는 노드를 준비해 둠)
    // 조회를 시도조차 하지 않고 즉시 실패해야 한다(추측 대체 금지).
    productCode: 'MOCK_REJECTED_SOURCE',
    variants: [
      {
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: 'mock-component', confirmedNodeId: 'node:rejected-but-exists' },
        assetKey: 'MOCK_REJECTED_SOURCE',
        status: 'rejected',
        note: '조리 이미지+상품명이 포함된 상세페이지 카드로 확인됨 — package 아님',
      },
    ],
  },
  {
    productCode: 'MOCK_WITH_PRESENTATION',
    variants: [
      {
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: 'mock-component', confirmedNodeId: 'node:with-presentation' },
        assetKey: 'MOCK_WITH_PRESENTATION',
        status: 'confirmed',
        presentation: { visualScale: 1.22, offsetX: 0, offsetY: 0 },
      },
    ],
  },
];

async function testKnownGoodResolvesViaConfirmedBindingWithoutProductAssetsPage() {
  const handle = installMockFigma();
  try {
    // PRODUCT_ASSETS 페이지를 아예 만들지 않는다 — 이게 실제 진단에서 확인된 상태다.
    const sourceNode = new MockNode('RECTANGLE', '소고기장조림130');
    sourceNode.id = 'node:confirmed-ok';
    sourceNode.fills = [{ type: 'IMAGE', imageHash: 'hash-confirmed-ok' }];
    handle.currentPage.appendChild(sourceNode);

    const result = await resolveProductAsset('MOCK_CONFIRMED_WITH_IMAGE', MOCK_BINDINGS);
    assert.equal(result.ok, true, 'PRODUCT_ASSETS 페이지 없이도 confirmed binding만으로 resolve되어야 함');
    if (result.ok) assert.equal(result.imageHash, 'hash-confirmed-ok');
    console.log('  ✓ PRODUCT_ASSETS 페이지가 없어도 ProductAssetBinding의 confirmedNodeId로 정상 resolve됨');
  } finally {
    uninstallMockFigma();
  }
}

async function testDeepImageFillOnDescendant() {
  const handle = installMockFigma();
  try {
    const group = new MockNode('FRAME', 'variant-group');
    group.id = 'node:group-with-child-image';
    const child = new MockNode('RECTANGLE', 'inner-image');
    child.fills = [{ type: 'IMAGE', imageHash: 'hash-deep' }];
    group.appendChild(child);
    handle.currentPage.appendChild(group);

    const result = await resolveProductAsset('MOCK_CONFIRMED_DEEP_IMAGE', MOCK_BINDINGS);
    assert.equal(result.ok, true, '자기 자신에 fill이 없어도 자손의 IMAGE fill을 찾아야 함');
    if (result.ok) assert.equal(result.imageHash, 'hash-deep');
    console.log('  ✓ source node 자신에 fill이 없어도 자손 노드의 IMAGE fill을 DFS로 찾아 resolve됨');
  } finally {
    uninstallMockFigma();
  }
}

async function testImageNodeSourceKind() {
  const handle = installMockFigma();
  try {
    const node = new MockNode('RECTANGLE', 'image-node-source');
    node.id = 'node:image-node-source';
    node.fills = [{ type: 'IMAGE', imageHash: 'hash-image-node' }];
    handle.currentPage.appendChild(node);

    const result = await resolveProductAsset('MOCK_IMAGE_NODE_SOURCE', MOCK_BINDINGS);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.imageHash, 'hash-image-node');
    console.log('  ✓ source.kind === "image-node"도 nodeId로 정상 resolve됨');
  } finally {
    uninstallMockFigma();
  }
}

async function testConfirmedNodeMissingFallsBackToLegacyPage() {
  const handle = installMockFigma();
  try {
    // confirmedNodeId가 가리키는 노드는 파일에 없지만, legacy PRODUCT_ASSETS 페이지에는 등록되어 있음.
    const legacyPage = handle.addPage(PRODUCT_ASSETS_PAGE_NAME);
    const legacyNode = new MockNode('RECTANGLE', 'MOCK_CONFIRMED_NODE_MISSING');
    legacyNode.fills = [{ type: 'IMAGE', imageHash: 'hash-legacy-fallback' }];
    legacyPage.appendChild(legacyNode);

    const result = await resolveProductAsset('MOCK_CONFIRMED_NODE_MISSING', MOCK_BINDINGS);
    assert.equal(result.ok, true, 'binding node를 못 찾으면 legacy PRODUCT_ASSETS로 폴백해야 함');
    if (result.ok) assert.equal(result.imageHash, 'hash-legacy-fallback');
    console.log('  ✓ confirmedNodeId 노드를 못 찾으면 legacy PRODUCT_ASSETS 페이지로 폴백됨');
  } finally {
    uninstallMockFigma();
  }
}

async function testNoConfirmedNodeIdFallsBackToLegacyPage() {
  const handle = installMockFigma();
  try {
    const legacyPage = handle.addPage(PRODUCT_ASSETS_PAGE_NAME);
    const legacyNode = new MockNode('RECTANGLE', 'MOCK_NO_CONFIRMED_NODE_ID');
    legacyNode.fills = [{ type: 'IMAGE', imageHash: 'hash-legacy-no-node-id' }];
    legacyPage.appendChild(legacyNode);

    const result = await resolveProductAsset('MOCK_NO_CONFIRMED_NODE_ID', MOCK_BINDINGS);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.imageHash, 'hash-legacy-no-node-id');
    console.log('  ✓ binding에 confirmedNodeId가 없으면 legacy PRODUCT_ASSETS 페이지로 폴백됨');
  } finally {
    uninstallMockFigma();
  }
}

async function testUnregisteredAssetKeyFallsBackToLegacyPage() {
  const handle = installMockFigma();
  try {
    // MOCK_BINDINGS에 아예 없는 assetKey — binding 경로는 시도조차 되지 않고 바로 legacy로.
    const legacyPage = handle.addPage(PRODUCT_ASSETS_PAGE_NAME);
    const legacyNode = new MockNode('RECTANGLE', 'NOT_IN_BINDINGS');
    legacyNode.fills = [{ type: 'IMAGE', imageHash: 'hash-legacy-only' }];
    legacyPage.appendChild(legacyNode);

    const result = await resolveProductAsset('NOT_IN_BINDINGS', MOCK_BINDINGS);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.imageHash, 'hash-legacy-only');
    console.log('  ✓ binding에 등록되지 않은 assetKey는 legacy PRODUCT_ASSETS 페이지만으로도 정상 resolve됨(기존 동작 유지)');
  } finally {
    uninstallMockFigma();
  }
}

async function testBothPathsFailReturnsCombinedMessage() {
  const handle = installMockFigma();
  try {
    // binding은 있지만 노드가 없고, legacy 페이지 자체도 없음(진단에서 확인된 실제 상황).
    const result = await resolveProductAsset('MOCK_CONFIRMED_NODE_MISSING', MOCK_BINDINGS);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.message, /ProductAssetBinding 기반 조회 실패/);
      assert.match(result.message, /legacy PRODUCT_ASSETS 조회도 실패/);
      assert.match(result.message, /node:does-not-exist/);
    }
    console.log('  ✓ binding/legacy 둘 다 실패하면 두 시도의 실패 사유가 모두 담긴 메시지로 명확히 실패함');
  } finally {
    uninstallMockFigma();
  }
}

async function testConfirmedNodeWithoutImageFillFallsBackAndReportsBoth() {
  const handle = installMockFigma();
  try {
    const node = new MockNode('RECTANGLE', 'no-image-fill-node');
    node.id = 'node:no-image-fill';
    node.fills = [{ type: 'SOLID' }]; // IMAGE가 아님
    handle.currentPage.appendChild(node);
    // legacy 페이지도 없음 -> 완전 실패, 메시지에 "IMAGE fill을 찾을 수 없습니다" 포함되어야 함

    const result = await resolveProductAsset('MOCK_CONFIRMED_NO_IMAGE_FILL', MOCK_BINDINGS);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.message, /IMAGE fill을 찾을 수 없습니다/);
    }
    console.log('  ✓ confirmedNodeId 노드는 찾았지만 IMAGE fill이 없으면 정확한 사유로 실패함');
  } finally {
    uninstallMockFigma();
  }
}

async function testRejectedStatusFailsWithoutAttemptingNodeLookup() {
  const handle = installMockFigma();
  try {
    // confirmedNodeId가 가리키는 노드는 실제로 존재하고 이미지 fill도 있지만(=조회했다면
    // "성공"했을 상황), status가 'rejected'이므로 조회 자체를 시도하지 않고 즉시 실패해야 한다.
    const node = new MockNode('RECTANGLE', 'rejected-source-node');
    node.id = 'node:rejected-but-exists';
    node.fills = [{ type: 'IMAGE', imageHash: 'hash-should-never-be-used' }];
    handle.currentPage.appendChild(node);

    const result = await resolveProductAsset('MOCK_REJECTED_SOURCE', MOCK_BINDINGS);
    assert.equal(result.ok, false, "status:'rejected'인 variant는 노드가 실제로 존재해도 사용하면 안 됨");
    if (!result.ok) {
      assert.match(result.message, /사용할 수 없는 것으로 판정/);
      assert.match(result.message, /package 아님/);
    }
    console.log("  ✓ status:'rejected' variant는 confirmedNodeId가 실제로 유효해도 조회를 시도하지 않고 명확히 실패함(추측 대체 금지)");
  } finally {
    uninstallMockFigma();
  }
}

async function testPresentationIsReturnedOnSuccess() {
  const handle = installMockFigma();
  try {
    const node = new MockNode('RECTANGLE', 'presentation-source');
    node.id = 'node:with-presentation';
    node.fills = [{ type: 'IMAGE', imageHash: 'hash-with-presentation' }];
    handle.currentPage.appendChild(node);

    const result = await resolveProductAsset('MOCK_WITH_PRESENTATION', MOCK_BINDINGS);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.presentation, { visualScale: 1.22, offsetX: 0, offsetY: 0 });
    }
    console.log('  ✓ ProductAssetVariant.presentation이 resolveProductAsset 결과에 그대로 전달됨');
  } finally {
    uninstallMockFigma();
  }
}

function testBuildImageFillNoPresentationMatchesExistingFillBehavior() {
  // presentation 없음 -> Layout slot 크기/모양에 전혀 영향 없던 기존 동작(scaleMode:'FILL')과
  // 완전히 동일해야 한다(다른 모든 상품에 대해 시각적 회귀가 없음을 보장).
  const fills = buildImageFill('hash-x');
  assert.deepEqual(fills, [{ type: 'IMAGE', imageHash: 'hash-x', scaleMode: 'FILL' }]);

  const fillsExplicitDefault = buildImageFill('hash-y', { visualScale: 1, offsetX: 0, offsetY: 0 });
  assert.deepEqual(fillsExplicitDefault, [{ type: 'IMAGE', imageHash: 'hash-y', scaleMode: 'FILL' }]);
  console.log('  ✓ buildImageFill: presentation 없음/기본값이면 기존과 동일하게 scaleMode:FILL(시각적 회귀 없음)');
}

function testBuildImageFillAppliesCropTransformForScale() {
  // 소고기장조림/메추리알장조림 실제 보정값: visualScale=1.22, offset 없음(중앙 기준 확대).
  const fills = buildImageFill('hash-beef', { visualScale: 1.22, offsetX: 0, offsetY: 0 });
  assert.equal(fills.length, 1);
  const fill = fills[0] as { type: string; scaleMode: string; imageTransform: number[][] };
  assert.equal(fill.type, 'IMAGE');
  assert.equal(fill.scaleMode, 'CROP');
  const s = 1 / 1.22;
  const expectedTx = (1 - s) / 2;
  assert.ok(Math.abs(fill.imageTransform[0][0] - s) < 1e-9, 'imageTransform의 스케일 성분이 1/visualScale이어야 함');
  assert.ok(Math.abs(fill.imageTransform[1][1] - s) < 1e-9);
  assert.ok(Math.abs(fill.imageTransform[0][2] - expectedTx) < 1e-9, '중앙 정렬(offset 없음)이면 tx=(1-s)/2여야 함');
  assert.ok(Math.abs(fill.imageTransform[1][2] - expectedTx) < 1e-9);
  console.log('  ✓ buildImageFill: visualScale이 1이 아니면 scaleMode:CROP + imageTransform(확대+중앙정렬)을 사용함');
}

function testBuildImageFillAppliesOffset() {
  const fills = buildImageFill('hash-x', { visualScale: 1.22, offsetX: 0.05, offsetY: -0.03 });
  const fill = fills[0] as { imageTransform: number[][] };
  const s = 1 / 1.22;
  const base = (1 - s) / 2;
  assert.ok(Math.abs(fill.imageTransform[0][2] - (base + 0.05)) < 1e-9, 'offsetX만큼 tx가 이동해야 함');
  assert.ok(Math.abs(fill.imageTransform[1][2] - (base - 0.03)) < 1e-9, 'offsetY만큼 ty가 이동해야 함');
  console.log('  ✓ buildImageFill: offsetX/offsetY가 imageTransform의 이동량에 정확히 반영됨');
}

async function main() {
  testBuildImageFillNoPresentationMatchesExistingFillBehavior();
  testBuildImageFillAppliesCropTransformForScale();
  testBuildImageFillAppliesOffset();
  await testKnownGoodResolvesViaConfirmedBindingWithoutProductAssetsPage();
  await testDeepImageFillOnDescendant();
  await testImageNodeSourceKind();
  await testConfirmedNodeMissingFallsBackToLegacyPage();
  await testNoConfirmedNodeIdFallsBackToLegacyPage();
  await testUnregisteredAssetKeyFallsBackToLegacyPage();
  await testBothPathsFailReturnsCombinedMessage();
  await testConfirmedNodeWithoutImageFillFallsBackAndReportsBoth();
  await testRejectedStatusFailsWithoutAttemptingNodeLookup();
  await testPresentationIsReturnedOnSuccess();
  console.log('assetResolver.test.ts: 모든 검증 통과');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
