import assert from 'node:assert/strict';
import { installMockFigma, uninstallMockFigma, MockNode } from '../src/mock/mockFigma';
import { resolveProductAsset, PRODUCT_ASSETS_PAGE_NAME } from '../src/assetResolver';
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

async function main() {
  await testKnownGoodResolvesViaConfirmedBindingWithoutProductAssetsPage();
  await testDeepImageFillOnDescendant();
  await testImageNodeSourceKind();
  await testConfirmedNodeMissingFallsBackToLegacyPage();
  await testNoConfirmedNodeIdFallsBackToLegacyPage();
  await testUnregisteredAssetKeyFallsBackToLegacyPage();
  await testBothPathsFailReturnsCombinedMessage();
  await testConfirmedNodeWithoutImageFillFallsBackAndReportsBoth();
  console.log('assetResolver.test.ts: 모든 검증 통과');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
