import assert from 'node:assert/strict';
import type { ChannelPreset, LayoutDefinition, Product } from '@thumbnail-generator/core';
import type { BatchGenerationRequest, WorkOrder } from '@thumbnail-generator/core/import';
import { installMockFigma, uninstallMockFigma } from '../src/mock/mockFigma';
import { seedMockTemplate, MOCK_TEMPLATE_BINDING, MOCK_PRODUCTS } from '../src/mock/mockTemplate';
import { seedMockGeneratedShell, MOCK_GENERATED_SUPPORT } from '../src/mock/mockGeneratedShell';
import {
  renderBatch,
  AUTO_GENERATED_VERIFIED_PAGE_NAME,
  AUTO_GENERATED_REVIEW_PAGE_NAME,
} from '../src/batchRenderer';

/**
 * Excel -> composeChannelOutputs -> 실제 Figma 생성까지의 전체 batch render 흐름을 회사 Figma
 * 파일 없이 검증한다. 실제 렌더링(renderPlan/renderGeneratedPlan)은 이미 각자 테스트가 있으므로,
 * 여기서는 "어떤 output을 생성/스킵하는지 판정"과 "생성된 frame이 올바른 페이지/이름으로
 * 정리되는지"에 집중한다.
 */

const MOCK_CHANNEL_PRESET: ChannelPreset = {
  id: 'naver-1000x1000',
  channelId: 'naver',
  frameWidth: 1000,
  frameHeight: 1000,
  aspectRatioFamily: 'square',
  geometryFamily: 'square-1x1',
  fallbackPolicy: 'verified-or-generated',
  storageLabelSupported: false,
  badgeSupported: false,
};

const MOCK_LAYOUT_VERIFIED_3: LayoutDefinition = {
  layoutKey: 'LAYOUT_02',
  arrangementKind: 'triple-cascade',
  slots: [
    { slotKey: 'slot_1', role: 'sale' },
    { slotKey: 'slot_2', role: 'sale' },
    { slotKey: 'slot_3', role: 'sale' },
  ],
  match: {
    productGroups: ['simple-meal'],
    compositions: ['single', 'mixed'],
    aspectRatioFamilies: ['square'],
    geometryFamilies: ['square-1x1'],
    thumbnailTypes: ['basic'],
  },
  priority: 100,
  source: { kind: 'verified' },
};

function mockProducts(): Product[] {
  return MOCK_PRODUCTS.map((p, i) => ({ id: `mock-product-${i}`, name: p.key, productGroup: 'simple-meal', assetKey: p.key }));
}

function mockLine(productId: string, quantity: number, rowIndex: number): WorkOrder['lines'][number] {
  return {
    rowIndex,
    seq: rowIndex,
    productGroupLabel: '간편식',
    productGroup: 'simple-meal',
    channelLabel: '네이버',
    channelId: 'naver',
    productName: productId,
    productCode: productId,
    quantity,
    badge: null,
    note: null,
    issues: [],
  };
}

function mockWorkOrder(workId: string, lines: { productId: string; quantity: number }[]): WorkOrder {
  const woLines = lines.map((l, i) => mockLine(l.productId, l.quantity, i + 1));
  return {
    workId,
    status: 'valid',
    issues: [],
    productGroup: 'simple-meal',
    channelId: 'naver',
    channelLabel: '네이버',
    badge: null,
    composition: lines.length > 1 ? 'mixed' : 'single',
    totalQuantity: lines.reduce((sum, l) => sum + l.quantity, 0),
    note: null,
    lines: woLines,
  };
}

function makeBatch(workOrders: WorkOrder[]): BatchGenerationRequest {
  return {
    sourceFileName: 'mock.xlsx',
    parsedAt: new Date().toISOString(),
    workOrders,
    summary: {
      totalWorkOrders: workOrders.length,
      valid: workOrders.filter((w) => w.status === 'valid').length,
      reviewRequired: workOrders.filter((w) => w.status === 'reviewRequired').length,
      error: workOrders.filter((w) => w.status === 'error').length,
    },
  };
}

async function testDefaultSkipsReviewRequiredAndError() {
  const handle = installMockFigma();
  try {
    seedMockTemplate(handle);
    seedMockGeneratedShell(handle);
    const products = mockProducts();
    const beef = products[0].id;

    const batch = makeBatch([
      mockWorkOrder('WO-001', [{ productId: beef, quantity: 3 }]), // verified -> generated
      mockWorkOrder('WO-002', [{ productId: beef, quantity: 2 }]), // generated(reviewRequired) -> 기본 스킵
      mockWorkOrder('WO-003', [{ productId: beef, quantity: 21 }]), // error -> 항상 스킵
    ]);

    const result = await renderBatch(
      batch,
      { products, channelPresets: [MOCK_CHANNEL_PRESET], layouts: [MOCK_LAYOUT_VERIFIED_3] },
      {}, // includeReviewRequired 생략 -> 기본값 false
      { bindings: [MOCK_TEMPLATE_BINDING], generatedSupport: [MOCK_GENERATED_SUPPORT] },
    );

    assert.equal(result.summary.totalWorkOrders, 3);
    assert.equal(result.summary.totalOutputs, 3);
    assert.equal(result.summary.generatedCount, 1, 'verified 1건만 기본적으로 생성되어야 함');
    assert.equal(result.summary.skippedReviewRequiredCount, 1, 'generated(reviewRequired)은 옵션 없이 기본 스킵');
    assert.equal(result.summary.skippedErrorCount, 1, 'error는 항상 스킵');
    assert.equal(result.summary.failedCount, 0);

    const generatedOutput = result.outputs.find((o) => o.outcome === 'generated')!;
    assert.equal(generatedOutput.workOrderId, 'WO-001');
    assert.equal(generatedOutput.source, 'verified');
    assert.equal(
      generatedOutput.frameName,
      `WO-001__naver-1000x1000__LAYOUT_02__VERIFIED`,
      'frame 이름에 workOrderId/channelPresetId/layoutKey/VERIFIED가 포함되어야 함',
    );

    // 실제로 AUTO_GENERATED_VERIFIED 페이지에 정리되어야 한다(원본 템플릿 페이지에 남으면 안 됨).
    const verifiedPage = handle.root.children.find((p) => p.name === AUTO_GENERATED_VERIFIED_PAGE_NAME)!;
    assert.ok(verifiedPage, 'AUTO_GENERATED_VERIFIED 페이지가 생성되어야 함');
    const framedNode = verifiedPage.children.find((n) => n.name === generatedOutput.frameName);
    assert.ok(framedNode, '생성된 frame이 AUTO_GENERATED_VERIFIED 페이지 아래로 이동되어야 함');

    console.log('  ✓ 기본값: verified만 생성, reviewRequired/error는 스킵, frame이 AUTO_GENERATED_VERIFIED로 정리됨');
  } finally {
    uninstallMockFigma();
  }
}

async function testIncludeReviewRequiredRendersSupportedGenerated() {
  const handle = installMockFigma();
  try {
    seedMockTemplate(handle);
    seedMockGeneratedShell(handle);
    const products = mockProducts();
    const beef = products[0].id;

    const batch = makeBatch([mockWorkOrder('WO-010', [{ productId: beef, quantity: 2 }])]);

    const result = await renderBatch(
      batch,
      { products, channelPresets: [MOCK_CHANNEL_PRESET], layouts: [MOCK_LAYOUT_VERIFIED_3] },
      { includeReviewRequired: true },
      { bindings: [MOCK_TEMPLATE_BINDING], generatedSupport: [MOCK_GENERATED_SUPPORT] },
    );

    assert.equal(result.summary.generatedCount, 1, 'includeReviewRequired=true면 지원되는 generated plan은 생성되어야 함');
    const output = result.outputs[0];
    assert.equal(output.source, 'generated');
    assert.equal(output.frameName, `WO-010__naver-1000x1000__GENERATED_ROW-LINEAR_2__GENERATED`);

    const reviewPage = handle.root.children.find((p) => p.name === AUTO_GENERATED_REVIEW_PAGE_NAME)!;
    assert.ok(reviewPage.children.find((n) => n.name === output.frameName), 'generated 결과는 AUTO_GENERATED_REVIEW로 정리되어야 함');

    console.log('  ✓ includeReviewRequired=true: 지원되는 naver generated plan이 실제로 생성되고 AUTO_GENERATED_REVIEW로 정리됨');
  } finally {
    uninstallMockFigma();
  }
}

async function testNotRenderableSkipsEvenWithOptionOn() {
  const handle = installMockFigma();
  try {
    seedMockTemplate(handle);
    // seedMockGeneratedShell을 호출하지 않음 -> generated renderer의 base shell이 없다.
    const products = mockProducts();
    const beef = products[0].id;

    const batch = makeBatch([mockWorkOrder('WO-020', [{ productId: beef, quantity: 2 }])]);

    const result = await renderBatch(
      batch,
      { products, channelPresets: [MOCK_CHANNEL_PRESET], layouts: [MOCK_LAYOUT_VERIFIED_3] },
      { includeReviewRequired: true },
    );

    // MOCK_GENERATED_SUPPORT 자체는 넘기지 않았으므로(기본 GENERATED_RENDERER_SUPPORT를
    // 사용) naver-1000x1000이 지원 목록에 있더라도 실제 shell frame이 이 mock 문서에는
    // 없다 — renderGeneratedPlan이 "base shell을 찾을 수 없음"으로 실패해야 한다.
    assert.equal(result.summary.generatedCount, 0);
    assert.equal(result.outputs[0].outcome, 'failed');

    console.log('  ✓ base shell이 없으면 옵션이 켜져 있어도 실제 렌더 단계에서 명확히 실패로 처리됨');
  } finally {
    uninstallMockFigma();
  }
}

async function main() {
  await testDefaultSkipsReviewRequiredAndError();
  await testIncludeReviewRequiredRendersSupportedGenerated();
  await testNotRenderableSkipsEvenWithOptionOn();
  console.log('batchRenderer.test.ts: 모든 검증 통과');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
