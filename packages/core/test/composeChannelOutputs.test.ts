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
//    LAYOUT_02는 channelId가 아니라 aspectRatioFamily+geometryFamily(square-1x1)로만
//    match하므로(기존 채널 재사용 설계), 네이버뿐 아니라 카카오의 1000x1000 출력에도 그대로
//    재사용된다. 카카오의 750x422(wide-16x9)도 이제 verified Layout(LAYOUT_06)이 등록되어
//    있으므로 두 output 모두 verified/ready여야 한다 — 단, layoutKey는 서로 다르다(같은
//    slotCount라도 geometryFamily별로 별도 Layout).
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
    assert.equal(wide!.result.ok && wide!.result.plan.layoutSource.kind, 'verified');
    assert.equal(wide!.result.ok && wide!.result.plan.layoutKey, 'LAYOUT_06');
    assert.notEqual(
      square!.result.ok && square!.result.plan.layoutKey,
      wide!.result.ok && wide!.result.plan.layoutKey,
    );
  }
  console.log('  ✓ 복수 규격 채널(kakao) -> square=LAYOUT_02, wide=LAYOUT_06 (둘 다 채널 무관 재사용, verified)');
}

// 4) square는 verified, geometryFamily가 다른(verified Layout이 없는) wide는 generated ->
//    같은 채널의 두 output이 서로 다른 결과(ready/reviewRequired)를 가져야 하고, 한쪽이
//    generated라고 해서 다른 쪽까지 reviewRequired가 되지 않아야 한다(#7). square
//    Layout(LAYOUT_02)을 wide로 스케일해서 재사용하지 않는다는 것도 함께 확인한다(#8) —
//    wide 결과의 layoutKey가 LAYOUT_02가 아니라 generated Layout이어야 한다.
//    (wide-5x2는 이번 조사에서 verified Layout을 등록하지 않기로 한 geometryFamily라 fallback
//    검증에 그대로 쓸 수 있다 — 실제 토스 채널 데이터와는 별개인 테스트 전용 조합이다.)
{
  const syntheticPresets: ChannelPreset[] = [
    ...CHANNEL_PRESETS,
    {
      id: 'naver-wide-5x2-test-only',
      channelId: 'naver',
      frameWidth: 720,
      frameHeight: 288,
      aspectRatioFamily: 'wide',
      geometryFamily: 'wide-5x2',
      fallbackPolicy: 'verified-or-generated',
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
    const wide = result.outputs.find((o) => o.channelPresetId === 'naver-wide-5x2-test-only')!;

    assert.equal(square.result.ok, true);
    assert.equal(square.result.ok && square.result.plan.layoutKey, 'LAYOUT_02');
    assert.equal(square.result.ok && square.result.plan.layoutSource.kind, 'verified');
    assert.equal(square.result.ok && square.result.plan.reviewRequired, false);

    assert.equal(wide.result.ok, true);
    assert.equal(wide.result.ok && wide.result.plan.layoutSource.kind, 'generated');
    assert.notEqual(wide.result.ok && wide.result.plan.layoutKey, 'LAYOUT_02');
    assert.equal(wide.result.ok && wide.result.plan.reviewRequired, true);
  }
  console.log('  ✓ square=verified/ready, wide(geometryFamily 불일치)=generated/reviewRequired가 서로 영향 없이 독립적으로 판정됨');
}

// 5) geometryFamily 분리 검증: 같은 aspectRatioFamily(wide)·같은 슬롯 수(3)라도
//    geometryFamily가 다르면(wide-16x9 vs wide-2x1) 서로 다른 verified Layout이 선택되어야
//    한다 — 비율이 다른 wide끼리 잘못 재사용되지 않는다는 것을 실제 등록 데이터로 확인.
{
  const kakaoResult = composeChannelOutputs(
    { items: [{ productId: 'p-beef', quantity: 3 }], channelId: 'kakao' },
    { products, channelPresets: CHANNEL_PRESETS, layouts: LAYOUTS },
  );
  const elevenStResult = composeChannelOutputs(
    { items: [{ productId: 'p-beef', quantity: 3 }], channelId: '11st' },
    { products, channelPresets: CHANNEL_PRESETS, layouts: LAYOUTS },
  );
  assert.equal(kakaoResult.ok, true);
  assert.equal(elevenStResult.ok, true);
  if (kakaoResult.ok && elevenStResult.ok) {
    const kakaoWide = kakaoResult.outputs.find((o) => o.channelPresetId === 'kakao-750x422')!;
    const elevenStWide = elevenStResult.outputs.find((o) => o.channelPresetId === '11st-720x360')!;
    assert.equal(kakaoWide.result.ok, true);
    assert.equal(elevenStWide.result.ok, true);
    assert.equal(kakaoWide.result.ok && kakaoWide.result.plan.layoutKey, 'LAYOUT_06'); // wide-16x9
    assert.equal(elevenStWide.result.ok && elevenStWide.result.plan.layoutKey, 'LAYOUT_09'); // wide-2x1
    assert.notEqual(
      kakaoWide.result.ok && kakaoWide.result.plan.layoutKey,
      elevenStWide.result.ok && elevenStWide.result.plan.layoutKey,
    );
  }
  console.log('  ✓ geometryFamily가 다르면(wide-16x9 vs wide-2x1) 같은 슬롯 수라도 다른 verified Layout이 선택됨');
}

// 6) verified-only 정책(토스 600x240, 실제 데이터): 검증된 Layout이 없으면 generated로
//    떨어지지 않고 reviewRequired(VERIFIED_ONLY_NO_VERIFIED_LAYOUT)여야 하며, error가 아니다.
//    같은 채널의 다른 output(1000x1000, verified-or-generated 정책)은 영향을 받지 않고
//    정상적으로 LAYOUT_02(verified/ready)여야 한다 — output 단위 독립성(#7)이 정책이 달라도
//    그대로 유지됨을 확인.
{
  const result = composeChannelOutputs(
    { items: [{ productId: 'p-beef', quantity: 3 }], channelId: 'toss' },
    { products, channelPresets: CHANNEL_PRESETS, layouts: LAYOUTS },
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.outputs.length, 2);
    const square = result.outputs.find((o) => o.channelPresetId === 'toss-1000x1000')!;
    const wide = result.outputs.find((o) => o.channelPresetId === 'toss-600x240')!;

    assert.equal(square.result.ok, true);
    assert.equal(square.result.ok && square.result.plan.layoutKey, 'LAYOUT_02');
    assert.equal(square.result.ok && square.result.plan.layoutSource.kind, 'verified');
    assert.equal(square.result.ok && square.result.plan.reviewRequired, false);

    assert.equal(wide.result.ok, false);
    assert.equal(!wide.result.ok && wide.result.reviewRequired, true);
    assert.equal(!wide.result.ok && wide.result.reason, 'VERIFIED_ONLY_NO_VERIFIED_LAYOUT');
  }
  console.log('  ✓ 토스 600x240(verified-only) 검증된 Layout 없음 -> reviewRequired(error 아님), 1000x1000은 영향 없이 verified/ready');
}

// 7) LayoutDefinition의 aspectRatioFamilies 조건 자체가 이미 "채널별 verified 우선, 없으면
//    generated fallback"을 만족시킨다는 것을 selectLayout 단계에서도 재확인 — LAYOUT_02는
//    aspectRatioFamilies:['square']만 match하므로 wide 기준으로는 애초에 후보에서 제외된다.
{
  const squareOnlyLayout: LayoutDefinition | undefined = LAYOUTS.find((l) => l.layoutKey === 'LAYOUT_02');
  assert.ok(squareOnlyLayout);
  assert.deepEqual(squareOnlyLayout!.match.aspectRatioFamilies, ['square']);
  console.log('  ✓ LAYOUT_02는 square 전용 — wide 요청에는 애초에 매칭되지 않음(스케일 재사용 없음)');
}

console.log('composeChannelOutputs.test.ts: 모든 검증 통과');
