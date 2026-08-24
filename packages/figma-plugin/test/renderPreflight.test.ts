import assert from 'node:assert/strict';
import { checkRenderability, checkRenderabilityForPlan } from '../src/renderPreflight';
import type { FigmaTemplateBinding } from '../src/templateMapper';
import type { GeneratedRendererSupport } from '../src/generatedRenderer';
import { FIGMA_TEMPLATE_BINDINGS } from '../src/templateMapper';
import type { CompositionPlan } from '@thumbnail-generator/core';

/**
 * "logical Layout이 verified/generated"인 것과 "실제 Figma에서 지금 생성 가능"한 것은 별개라는
 * 요청서의 규칙(verified+binding 없음 -> NO_FIGMA_TEMPLATE_BINDING, generated+미지원 preset ->
 * GENERATED_RENDERER_NOT_SUPPORTED, 그 외는 renderable)을 core를 건드리지 않고 검증한다.
 */

const CUSTOM_BINDINGS: FigmaTemplateBinding[] = [
  {
    layoutKey: 'LAYOUT_TEST',
    channelPresetId: 'preset-a',
    templateFrameName: 'FRAME_A',
    slotBindings: [{ slotKey: 'slot_1', layerName: 'layer_1' }],
  },
];

const CUSTOM_SUPPORT: GeneratedRendererSupport[] = [
  {
    channelPresetId: 'preset-a',
    productGroup: 'simple-meal',
    thumbnailType: 'basic',
    familyIds: ['row-linear'],
    baseShellFrameName: 'SHELL',
    existingSlotLayerNames: ['old_slot'],
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

  // 3) generated + 지원되는 channel/family -> renderable
  {
    const result = checkRenderability(
      { layoutKey: 'GENERATED_ROW-LINEAR_2', channelPresetId: 'preset-a', layoutSource: 'generated', arrangementFamily: 'row-linear' },
      CUSTOM_BINDINGS,
      CUSTOM_SUPPORT,
    );
    assert.equal(result.renderable, true, '지원되는 채널+family의 generated plan은 renderable이어야 함');
  }

  // 4) generated + 미지원 family -> GENERATED_RENDERER_NOT_SUPPORTED
  {
    const result = checkRenderability(
      { layoutKey: 'GENERATED_PYRAMID-STACK_9', channelPresetId: 'preset-a', layoutSource: 'generated', arrangementFamily: 'pyramid-stack' },
      CUSTOM_BINDINGS,
      CUSTOM_SUPPORT,
    );
    assert.equal(result.renderable, false);
    assert.equal(!result.renderable && result.reason, 'GENERATED_RENDERER_NOT_SUPPORTED');
  }

  // 5) generated + 미지원 채널 -> GENERATED_RENDERER_NOT_SUPPORTED
  {
    const result = checkRenderability(
      { layoutKey: 'GENERATED_ROW-LINEAR_2', channelPresetId: 'preset-z', layoutSource: 'generated', arrangementFamily: 'row-linear' },
      CUSTOM_BINDINGS,
      CUSTOM_SUPPORT,
    );
    assert.equal(result.renderable, false);
    assert.equal(!result.renderable && result.reason, 'GENERATED_RENDERER_NOT_SUPPORTED');
  }
  console.log('  ✓ generated plan: 채널/family가 generated renderer 지원 목록에 있어야만 renderable');

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

  console.log('renderPreflight.test.ts: 모든 검증 통과');
}

main();
