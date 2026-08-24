import assert from 'node:assert/strict';
import {
  composeChannelOutputs,
  CHANNEL_PRESETS,
  LAYOUTS,
  type ChannelPreset,
  type LayoutDefinition,
  type Product,
} from '../src/index';

const products: Product[] = [
  { id: 'p-beef', name: '소고기장조림', productGroup: 'simple-meal', assetKey: 'beef-asset' },
];

// 1) 등록되지 않은 channelId -> CHANNEL_NOT_FOUND
{
  const result = composeChannelOutputs(
    { items: [{ productId: 'p-beef', quantity: 1 }], channelId: 'no-such-channel' },
    { products, channelPresets: CHANNEL_PRESETS, layouts: LAYOUTS },
  );
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.reason, 'CHANNEL_NOT_FOUND');
  console.log('  ✓ 등록되지 않은 channelId -> CHANNEL_NOT_FOUND');
}

// 2) 단일 규격 채널(naver) -> output 1개, composePlan 결과와 동일
{
  const result = composeChannelOutputs(
    { items: [{ productId: 'p-beef', quantity: 3 }], channelId: 'naver' },
    { products, channelPresets: CHANNEL_PRESETS, layouts: LAYOUTS },
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.outputs.length, 1);
    assert.equal(result.outputs[0].channelPresetId, 'naver-1000x1000');
    assert.equal(result.outputs[0].result.ok, true);
    assert.equal(result.outputs[0].result.ok && result.outputs[0].result.plan.layoutKey, 'LAYOUT_02');
  }
  console.log('  ✓ 단일 규격 채널(naver) -> output 1개');
}

// 3) 복수 규격 채널(kakao, 실제 데이터) -> output 2개, 각각 독립적으로 판정됨(#7)
//    LAYOUT_02는 channelId가 아니라 aspectRatioFamily(square)로만 match하므로(기존 채널 재사용
//    설계), 네이버뿐 아니라 카카오의 1000x1000(square) 출력에도 그대로 재사용된다 — 반면
//    카카오의 750x422(wide)는 아직 검증된 Layout이 없어 generated fallback이어야 한다.
{
  const result = composeChannelOutputs(
    { items: [{ productId: 'p-beef', quantity: 3 }], channelId: 'kakao' },
    { products, channelPresets: CHANNEL_PRESETS, layouts: LAYOUTS },
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.outputs.length, 2);
    const byPreset = new Map(result.outputs.map((o) => [o.channelPresetId, o]));
    const square = byPreset.get('kakao-1000x1000');
    const wide = byPreset.get('kakao-750x422');
    assert.ok(square && wide);
    assert.equal(square!.aspectRatioFamily, 'square');
    assert.equal(wide!.aspectRatioFamily, 'wide');
    assert.equal(square!.result.ok, true);
    assert.equal(wide!.result.ok, true);
    assert.equal(square!.result.ok && square!.result.plan.layoutSource.kind, 'verified');
    assert.equal(square!.result.ok && square!.result.plan.layoutKey, 'LAYOUT_02');
    assert.equal(wide!.result.ok && wide!.result.plan.layoutSource.kind, 'generated');
  }
  console.log('  ✓ 복수 규격 채널(kakao) -> square는 LAYOUT_02(채널 무관 재사용) verified, wide는 generated');
}

// 4) square는 verified, wide는 검증된 Layout이 없어 generated -> 같은 채널의 두 output이
//    서로 다른 결과(ready/reviewRequired)를 가져야 하고, 한쪽이 generated라고 해서 다른 쪽까지
//    reviewRequired가 되지 않아야 한다(#7). square Layout(LAYOUT_02)을 wide로 스케일해서
//    재사용하지 않는다는 것도 함께 확인한다(#8) — wide 결과의 layoutKey가 LAYOUT_02가 아니라
//    generated Layout이어야 한다.
{
  const syntheticPresets: ChannelPreset[] = [
    ...CHANNEL_PRESETS,
    {
      id: 'naver-720x360-test-only',
      channelId: 'naver',
      frameWidth: 720,
      frameHeight: 360,
      aspectRatioFamily: 'wide',
      storageLabelSupported: true,
      badgeSupported: true,
    },
  ];

  const result = composeChannelOutputs(
    { items: [{ productId: 'p-beef', quantity: 3 }], channelId: 'naver' },
    { products, channelPresets: syntheticPresets, layouts: LAYOUTS },
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.outputs.length, 2);
    const square = result.outputs.find((o) => o.channelPresetId === 'naver-1000x1000')!;
    const wide = result.outputs.find((o) => o.channelPresetId === 'naver-720x360-test-only')!;

    assert.equal(square.result.ok, true);
    assert.equal(square.result.ok && square.result.plan.layoutKey, 'LAYOUT_02');
    assert.equal(square.result.ok && square.result.plan.layoutSource.kind, 'verified');
    assert.equal(square.result.ok && square.result.plan.reviewRequired, false);

    assert.equal(wide.result.ok, true);
    assert.equal(wide.result.ok && wide.result.plan.layoutSource.kind, 'generated');
    assert.notEqual(wide.result.ok && wide.result.plan.layoutKey, 'LAYOUT_02');
    assert.equal(wide.result.ok && wide.result.plan.reviewRequired, true);
  }
  console.log('  ✓ square=verified/ready, wide=generated/reviewRequired가 서로 영향 없이 독립적으로 판정됨');
}

// 5) LayoutDefinition의 aspectRatioFamilies 조건 자체가 이미 "채널별 verified 우선, 없으면
//    generated fallback"을 만족시킨다는 것을 selectLayout 단계에서도 재확인 — LAYOUT_02는
//    aspectRatioFamilies:['square']만 match하므로 wide 기준으로는 애초에 후보에서 제외된다.
{
  const squareOnlyLayout: LayoutDefinition | undefined = LAYOUTS.find((l) => l.layoutKey === 'LAYOUT_02');
  assert.ok(squareOnlyLayout);
  assert.deepEqual(squareOnlyLayout!.match.aspectRatioFamilies, ['square']);
  console.log('  ✓ LAYOUT_02는 square 전용 — wide 요청에는 애초에 매칭되지 않음(스케일 재사용 없음)');
}

console.log('composeChannelOutputs.test.ts: 모든 검증 통과');
