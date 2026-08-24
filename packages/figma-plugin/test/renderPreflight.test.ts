import assert from 'node:assert/strict';
import { checkRenderability, checkRenderabilityForPlan, checkAssetResolvability } from '../src/renderPreflight';
import type { FigmaTemplateBinding } from '../src/templateMapper';
import type { VerifiedDerivedSupport } from '../src/verifiedDerivedGeneratedRenderer';
import { FIGMA_TEMPLATE_BINDINGS } from '../src/templateMapper';
import { VERIFIED_DERIVED_GENERATED_SUPPORT } from '../src/verifiedDerivedGeneratedRenderer';
import type { CompositionPlan } from '@thumbnail-generator/core';

/**
 * "logical Layout이 verified/generated"인 것과 "실제 Figma에서 지금 생성 가능"한 것은 별개라는
 * 요청서의 규칙(verified+binding 없음 -> NO_FIGMA_TEMPLATE_BINDING, generated+파생 가능한
 * verified base 템플릿 없음 -> GENERATED_BASE_TEMPLATE_NOT_AVAILABLE, 그 외는 renderable)을
 * core를 건드리지 않고 검증한다. Generated V2(verified-template-derived)로 전환한 뒤에는
 * family/채널 지원 여부가 아니라 "이 채널+슬롯 수 조합에 파생 가능한 verified base가 있는가"로
 * 판정한다.
 */

const CUSTOM_BINDINGS: FigmaTemplateBinding[] = [
  {
    layoutKey: 'LAYOUT_TEST',
    channelPresetId: 'preset-a',
    templateFrameName: 'FRAME_A',
    slotBindings: [{ slotKey: 'slot_1', layerName: 'layer_1' }],
  },
];

const CUSTOM_SUPPORT: VerifiedDerivedSupport[] = [
  {
    channelPresetId: 'preset-a',
    targetSlotCount: 2,
    sourceLayoutKey: 'LAYOUT_TEST',
    keepLayerNames: ['layer_1', 'layer_2'],
  },
];

function main() {
  // 1) verified + binding 있음 -> renderable
  {
    const result = checkRenderability(
      { layoutKey: 'LAYOUT_TEST', channelPresetId: 'preset-a', layoutSource: 'verified', arrangementFamily: null },
      CUSTOM_BINDINGS,
      CUSTOM_SUPPORT,
    );
    assert.equal(result.renderable, true, 'binding이 있는 verified plan은 renderable이어야 함');
  }

  // 2) verified + binding 없음 -> NO_FIGMA_TEMPLATE_BINDING
  {
    const result = checkRenderability(
      { layoutKey: 'LAYOUT_TEST', channelPresetId: 'preset-b', layoutSource: 'verified', arrangementFamily: null },
      CUSTOM_BINDINGS,
      CUSTOM_SUPPORT,
    );
    assert.equal(result.renderable, false);
    assert.equal(!result.renderable && result.reason, 'NO_FIGMA_TEMPLATE_BINDING');
  }
  console.log('  ✓ verified plan: physical template binding 유무로 renderable이 정확히 갈림');

  // 3) generated + 파생 지원되는 채널+슬롯 수(layoutKey 끝의 숫자로 판정) -> renderable
  {
    const result = checkRenderability(
      { layoutKey: 'GENERATED_ROW-LINEAR_2', channelPresetId: 'preset-a', layoutSource: 'generated', arrangementFamily: 'row-linear' },
      CUSTOM_BINDINGS,
      CUSTOM_SUPPORT,
    );
    assert.equal(result.renderable, true, '지원되는 채널+슬롯 수의 generated(verified-derived) plan은 renderable이어야 함');
  }

  // 4) generated + 미지원 슬롯 수 -> GENERATED_BASE_TEMPLATE_NOT_AVAILABLE
  {
    const result = checkRenderability(
      { layoutKey: 'GENERATED_PYRAMID-STACK_9', channelPresetId: 'preset-a', layoutSource: 'generated', arrangementFamily: 'pyramid-stack' },
      CUSTOM_BINDINGS,
      CUSTOM_SUPPORT,
    );
    assert.equal(result.renderable, false);
    assert.equal(!result.renderable && result.reason, 'GENERATED_BASE_TEMPLATE_NOT_AVAILABLE');
  }

  // 5) generated + 미지원 채널 -> GENERATED_BASE_TEMPLATE_NOT_AVAILABLE
  {
    const result = checkRenderability(
      { layoutKey: 'GENERATED_ROW-LINEAR_2', channelPresetId: 'preset-z', layoutSource: 'generated', arrangementFamily: 'row-linear' },
      CUSTOM_BINDINGS,
      CUSTOM_SUPPORT,
    );
    assert.equal(result.renderable, false);
    assert.equal(!result.renderable && result.reason, 'GENERATED_BASE_TEMPLATE_NOT_AVAILABLE');
  }
  console.log('  ✓ generated(V2) plan: 채널+슬롯 수 조합이 verified-derived 지원 목록에 있어야만 renderable');

  // 6) 실제 데이터: LAYOUT_02 + naver-1000x1000은 실제로 바인딩되어 있어야 함(회귀 방지)
  {
    const result = checkRenderability(
      { layoutKey: 'LAYOUT_02', channelPresetId: 'naver-1000x1000', layoutSource: 'verified', arrangementFamily: null },
      FIGMA_TEMPLATE_BINDINGS,
    );
    assert.equal(result.renderable, true, 'LAYOUT_02+naver-1000x1000은 실제 바인딩이 있어 renderable이어야 함');
  }
  // 7) 실제 데이터: 아직 바인딩 안 된 조합(home-and-shopping)은 NO_FIGMA_TEMPLATE_BINDING이어야 함
  {
    const result = checkRenderability(
      { layoutKey: 'LAYOUT_06', channelPresetId: 'home-and-shopping-640x350', layoutSource: 'verified', arrangementFamily: null },
      FIGMA_TEMPLATE_BINDINGS,
    );
    assert.equal(result.renderable, false);
    assert.equal(!result.renderable && result.reason, 'NO_FIGMA_TEMPLATE_BINDING');
  }
  console.log('  ✓ 실제 FIGMA_TEMPLATE_BINDINGS 기준 회귀 확인');

  // 8) 실제 데이터: naver generated V2 지원 슬롯 수(2/4/6/7/8/9)는 renderable, 미지원(예: 5)은
  //    GENERATED_BASE_TEMPLATE_NOT_AVAILABLE이어야 함(요청서의 4케이스 중 하나라도 놓치면
  //    바로 드러나도록 실제 지원 목록을 그대로 검증한다).
  for (const n of [2, 4, 6, 7, 8, 9]) {
    const result = checkRenderability(
      { layoutKey: `GENERATED_TEST_${n}`, channelPresetId: 'naver-1000x1000', layoutSource: 'generated', arrangementFamily: null },
      FIGMA_TEMPLATE_BINDINGS,
      VERIFIED_DERIVED_GENERATED_SUPPORT,
    );
    assert.equal(result.renderable, true, `naver generated V2는 슬롯 ${n}개를 지원해야 함`);
  }
  {
    const result = checkRenderability(
      { layoutKey: 'GENERATED_TEST_5', channelPresetId: 'naver-1000x1000', layoutSource: 'generated', arrangementFamily: null },
      FIGMA_TEMPLATE_BINDINGS,
      VERIFIED_DERIVED_GENERATED_SUPPORT,
    );
    assert.equal(result.renderable, false);
    assert.equal(!result.renderable && result.reason, 'GENERATED_BASE_TEMPLATE_NOT_AVAILABLE');
  }
  console.log('  ✓ 실제 VERIFIED_DERIVED_GENERATED_SUPPORT 기준 회귀 확인(naver 2/4/6/7/8/9만 지원, 5는 미지원)');

  // 8) checkRenderabilityForPlan: CompositionPlan 형태로도 동일하게 판정되어야 함
  {
    const plan: CompositionPlan = {
      layoutKey: 'LAYOUT_02',
      channelPresetId: 'naver-1000x1000',
      productGroup: 'simple-meal',
      thumbnailType: 'basic',
      slots: [{ slotKey: 'slot_1', assetKey: 'X', role: 'sale' }],
      layoutSource: { kind: 'verified' },
      generatedLayout: false,
      reviewRequired: false,
      options: { logoVariant: 'red' },
    };
    const result = checkRenderabilityForPlan(plan);
    assert.equal(result.renderable, true);
  }
  console.log('  ✓ checkRenderabilityForPlan(CompositionPlan)도 동일하게 판정됨');
}

function planWithSlots(slots: { slotKey: string; assetKey: string }[]): CompositionPlan {
  return {
    layoutKey: 'LAYOUT_02',
    channelPresetId: 'naver-1000x1000',
    productGroup: 'simple-meal',
    thumbnailType: 'basic',
    slots: slots.map((s) => ({ ...s, role: 'sale' as const })),
    layoutSource: { kind: 'verified' },
    generatedLayout: false,
    reviewRequired: false,
    options: { logoVariant: 'red' },
  };
}

async function testCheckAssetResolvability() {
  // 9) 모든 슬롯의 asset이 resolve되면 renderable
  {
    const plan = planWithSlots([
      { slotKey: 'slot_1', assetKey: 'OK_A' },
      { slotKey: 'slot_2', assetKey: 'OK_B' },
    ]);
    const result = await checkAssetResolvability(plan, async () => ({ ok: true, imageHash: 'hash' }));
    assert.equal(result.renderable, true);
  }

  // 10) 하나라도 asset resolve가 실패하면 renderable:false, reason: PRODUCT_ASSET_NOT_RESOLVABLE
  {
    const plan = planWithSlots([
      { slotKey: 'slot_1', assetKey: 'OK_A' },
      { slotKey: 'slot_2', assetKey: 'MISSING_ASSET' },
    ]);
    const result = await checkAssetResolvability(plan, async (assetKey) =>
      assetKey === 'MISSING_ASSET'
        ? { ok: false, message: 'PRODUCT_ASSETS 페이지도 없고 ProductAssetBinding도 없음' }
        : { ok: true, imageHash: 'hash' },
    );
    assert.equal(result.renderable, false);
    assert.equal(!result.renderable && result.reason, 'PRODUCT_ASSET_NOT_RESOLVABLE');
    if (!result.renderable) {
      assert.match(result.message, /slot_2/);
      assert.match(result.message, /MISSING_ASSET/);
    }
  }
  console.log('  ✓ checkAssetResolvability: 슬롯 asset이 하나라도 resolve 실패하면 PRODUCT_ASSET_NOT_RESOLVABLE로 renderable:false');
}

async function run() {
  main();
  await testCheckAssetResolvability();
  console.log('renderPreflight.test.ts: 모든 검증 통과');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
