import assert from 'node:assert/strict';
import type { CompositionPlan } from '@thumbnail-generator/core';
import { installMockFigma, uninstallMockFigma } from '../src/mock/mockFigma';
import { seedMockTemplate, MOCK_PRODUCTS } from '../src/mock/mockTemplate';
import {
  seedMockGeneratedShell,
  MOCK_GENERATED_SUPPORT,
  MOCK_SHELL_FRAME_NAME,
  MOCK_SHELL_FIXED_LOGO_NAME,
  MOCK_SHELL_EXISTING_SLOT_NAME,
} from '../src/mock/mockGeneratedShell';
import { renderGeneratedPlan } from '../src/generatedRenderer';

/**
 * generatedRenderer.ts(base shell clone -> 기존 슬롯 제거 -> family 공식으로 새 슬롯 배치)를
 * 회사 Figma 파일 없이 검증한다. 요청서의 확인 항목 중 "로고/배경/고정 요소 보존"과 "원본은
 * 수정하지 않음"은 실제 회사 파일에서 screenshot으로도 확인했지만, 여기서는 그걸 코드 레벨
 * 회귀 테스트로 고정한다.
 */

function makeGeneratedPlan(slotCount: number, familyId: 'row-linear' | 'diagonal-cascade' | 'pyramid-stack'): CompositionPlan {
  const assetKeys = [MOCK_PRODUCTS[0].key, MOCK_PRODUCTS[1].key, MOCK_PRODUCTS[2].key];
  return {
    layoutKey: `GENERATED_${familyId.toUpperCase()}_${slotCount}`,
    channelPresetId: 'naver-1000x1000',
    productGroup: 'simple-meal',
    thumbnailType: 'basic',
    slots: Array.from({ length: slotCount }, (_, i) => ({
      slotKey: `slot_${i + 1}`,
      assetKey: assetKeys[i % assetKeys.length],
      role: 'sale' as const,
    })),
    layoutSource: { kind: 'generated', params: { familyId, slotCount } },
    generatedLayout: true,
    reviewRequired: true,
    options: { logoVariant: 'red' },
  };
}

async function testSuccessCase() {
  const handle = installMockFigma();
  try {
    seedMockTemplate(handle); // PRODUCT_ASSETS 페이지(재사용)
    seedMockGeneratedShell(handle);

    const shell = handle.currentPage.findOne((n) => n.name === MOCK_SHELL_FRAME_NAME)!;
    const shellFillsBefore = shell.children.map((c) => JSON.stringify(c.fills));
    const shellChildCountBefore = shell.children.length;

    const plan = makeGeneratedPlan(3, 'row-linear');
    const result = await renderGeneratedPlan(plan, [MOCK_GENERATED_SUPPORT]);
    assert.equal(result.ok, true, `renderGeneratedPlan 실패: ${!result.ok ? result.message : ''}`);
    if (!result.ok) return;

    // 원본 shell은 절대 수정되지 않아야 한다.
    assert.equal(shell.children.length, shellChildCountBefore, '원본 shell의 자식 수가 바뀌면 안 됨');
    const shellFillsAfter = shell.children.map((c) => JSON.stringify(c.fills));
    assert.deepEqual(shellFillsAfter, shellFillsBefore, '원본 shell의 fill이 바뀌면 안 됨');

    const clone = handle.currentPage.findOne((n) => n.id === result.nodeId)!;
    assert.ok(clone, 'clone이 존재해야 함');

    // 로고(고정 요소)는 그대로 유지되어야 한다.
    const logoInClone = clone.findOne((n) => n.name === MOCK_SHELL_FIXED_LOGO_NAME);
    assert.ok(logoInClone, '고정 요소(로고)는 clone에도 남아 있어야 함');

    // 기존 상품 슬롯은 제거되어야 한다.
    const oldSlotInClone = clone.findOne((n) => n.name === MOCK_SHELL_EXISTING_SLOT_NAME);
    assert.equal(oldSlotInClone, null, '기존 상품 슬롯 레이어는 제거되어야 함');

    // 새 슬롯 3개가 정확한 상품 이미지로 채워져야 한다(정확한 슬롯 수 + 순번 유지).
    for (let i = 0; i < 3; i++) {
      const slotKey = `slot_${i + 1}`;
      const layer = clone.findOne((n) => n.name === `generated_slot_${slotKey}`);
      assert.ok(layer, `새 슬롯 "${slotKey}"가 있어야 함`);
      const fills = layer!.fills as { type: string; imageHash?: string }[];
      assert.equal(fills[0].type, 'IMAGE');
      assert.equal(fills[0].imageHash, MOCK_PRODUCTS[i % 3].imageHash, `슬롯 ${slotKey}가 올바른 순번의 상품 이미지를 가리켜야 함`);
    }

    console.log('  ✓ 성공 케이스: 기존 슬롯 제거 + 새 슬롯 3개 정확히 채워짐, 로고 보존, 원본 shell 무수정');
  } finally {
    uninstallMockFigma();
  }
}

async function testUnsupportedComboFailure() {
  const handle = installMockFigma();
  try {
    seedMockTemplate(handle);
    seedMockGeneratedShell(handle);

    const plan = makeGeneratedPlan(2, 'row-linear');
    plan.productGroup = 'baby-food'; // MOCK_GENERATED_SUPPORT는 simple-meal만 지원

    const result = await renderGeneratedPlan(plan, [MOCK_GENERATED_SUPPORT]);
    assert.equal(result.ok, false, '지원하지 않는 productGroup 조합은 실패해야 함');

    const leftoverClones = handle.currentPage.children.filter((n) => n.name.includes('자동생성 결과'));
    assert.equal(leftoverClones.length, 0, '실패 시 clone이 남아 있으면 안 됨');

    console.log('  ✓ 실패 케이스(미지원 조합): clone 없이 명확히 실패');
  } finally {
    uninstallMockFigma();
  }
}

async function testUnregisteredAssetFailure() {
  const handle = installMockFigma();
  try {
    seedMockTemplate(handle);
    seedMockGeneratedShell(handle);

    const plan = makeGeneratedPlan(2, 'row-linear');
    plan.slots[1].assetKey = 'NOT_REGISTERED_IN_PRODUCT_ASSETS';

    const result = await renderGeneratedPlan(plan, [MOCK_GENERATED_SUPPORT]);
    assert.equal(result.ok, false, 'PRODUCT_ASSETS에 없는 상품이면 실패해야 함');

    const leftoverClones = handle.currentPage.children.filter((n) => n.name.includes('자동생성 결과'));
    assert.equal(leftoverClones.length, 0, '실패 시 clone이 남아 있으면 안 됨(부분 실패 상태 금지)');

    console.log('  ✓ 실패 케이스(미등록 asset): clone 없이 명확히 실패');
  } finally {
    uninstallMockFigma();
  }
}

async function main() {
  await testSuccessCase();
  await testUnsupportedComboFailure();
  await testUnregisteredAssetFailure();
  console.log('generatedRenderer.test.ts: 모든 검증 통과');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
