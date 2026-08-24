import assert from 'node:assert/strict';
import { FIGMA_TEMPLATE_BINDINGS, resolveTemplate } from '../src/templateMapper';

/**
 * 채널 확장(SSG/쿠팡/옥션/지마켓/SK스토아/NS홈쇼핑/알리익스프레스/SKT딜/올웨이즈/이랜드몰/롯데온)
 * 조사 결과로 추가된 FIGMA_TEMPLATE_BINDINGS 항목의 회귀 테스트. "썸네일 (Copy)"를 실제
 * read-only로 조사해서 프레임 이름이 아니라 실제 자식 레이어 구조(+screenshot)로 확인된
 * 조합만 등록했다 — 확인되지 않은 조합(SSG 전체/SK스토아/NS홈쇼핑/SKT딜/지마켓 10개/쿠팡
 * 10개/알리익스프레스 5·10개/올웨이즈 5·10개/이랜드몰 1·5·10개)은 여기 없어야 한다.
 */

function assertBound(layoutKey: string, channelPresetId: string, label: string) {
  const binding = resolveTemplate(layoutKey, channelPresetId);
  assert.ok(binding, `${label}: ${layoutKey}+${channelPresetId} 바인딩이 있어야 함`);
  return binding!;
}

function assertNotBound(layoutKey: string, channelPresetId: string, label: string) {
  const binding = resolveTemplate(layoutKey, channelPresetId);
  assert.equal(binding, undefined, `${label}: ${layoutKey}+${channelPresetId}는 실제 프레임이 확인되지 않아 바인딩이 없어야 함`);
}

function main() {
  // 지마켓: 1/3/5 확인됨, 10은 실제 프레임 미확인
  assertBound('LAYOUT_01', 'gmarket-1000x1000', '지마켓 qty1');
  assertBound('LAYOUT_02', 'gmarket-1000x1000', '지마켓 qty3');
  assertBound('LAYOUT_03', 'gmarket-1000x1000', '지마켓 qty5');
  assertNotBound('LAYOUT_04', 'gmarket-1000x1000', '지마켓 qty10(미확인)');

  // 옥션: 1/3/5/10 모두 확인됨
  assertBound('LAYOUT_01', 'auction-1000x1000', '옥션 qty1');
  assertBound('LAYOUT_02', 'auction-1000x1000', '옥션 qty3');
  assertBound('LAYOUT_03', 'auction-1000x1000', '옥션 qty5');
  const auction10 = assertBound('LAYOUT_04', 'auction-1000x1000', '옥션 qty10');
  assert.equal(auction10.slotBindings.length, 10);
  assert.ok(
    auction10.slotBindings.every((b) => b.layerIndex !== undefined),
    '옥션 qty10은 전 슬롯이 동일 레이어 이름을 재사용하므로 layerIndex가 모두 지정되어야 함',
  );
  assert.deepEqual(
    auction10.slotBindings.map((b) => b.layerIndex),
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    'layerIndex는 0부터 슬롯 순서대로 중복 없이 증가해야 함',
  );

  // 쿠팡: 1/3/5 확인됨(1은 알리익스프레스와 공용 프레임), 10은 "_5"와 구조가 동일해 제외
  assertBound('LAYOUT_01', 'coupang-1000x1000', '쿠팡 qty1');
  const coupang3 = assertBound('LAYOUT_02', 'coupang-1000x1000', '쿠팡 qty3');
  assert.equal(coupang3.slotBindings.length, 3);
  const coupang5 = assertBound('LAYOUT_03', 'coupang-1000x1000', '쿠팡 qty5');
  assert.equal(coupang5.slotBindings.length, 5);
  assertNotBound('LAYOUT_04', 'coupang-1000x1000', '쿠팡 qty10(실제로는 5슬롯인데 이름만 10으로 표기됨)');

  // 알리익스프레스: 1/3만 확인됨(쿠팡알리 공용 프레임), 5는 실제로 4슬롯뿐이라 제외, 10은 미확인
  assertBound('LAYOUT_01', 'aliexpress-1000x1000', '알리익스프레스 qty1');
  assertBound('LAYOUT_02', 'aliexpress-1000x1000', '알리익스프레스 qty3');
  assertNotBound('LAYOUT_03', 'aliexpress-1000x1000', '알리익스프레스 qty5(실제로는 4슬롯뿐)');
  assertNotBound('LAYOUT_04', 'aliexpress-1000x1000', '알리익스프레스 qty10(미확인)');

  // 쿠팡-알리익스프레스 공용 프레임: qty1/3은 물리적으로 같은 노드를 가리켜야 한다
  // ("쿠팡알리_..."라는 프레임 이름 자체가 두 채널 공용 디자인임을 선언함).
  const coupang1 = assertBound('LAYOUT_01', 'coupang-1000x1000', '쿠팡 qty1(공용 확인용)');
  const ali1 = assertBound('LAYOUT_01', 'aliexpress-1000x1000', '알리익스프레스 qty1(공용 확인용)');
  assert.equal(coupang1.templateFrameNodeId, ali1.templateFrameNodeId, '쿠팡/알리익스프레스 qty1은 같은 물리 프레임을 공유해야 함');
  const ali3 = assertBound('LAYOUT_02', 'aliexpress-1000x1000', '알리익스프레스 qty3(공용 확인용)');
  assert.equal(ali3.templateFrameNodeId, '69:2037');

  // 올웨이즈: 1/3 확인됨(부추꼬막무침), 5/10은 미확인
  assertBound('LAYOUT_01', 'alwayz-1000x1000', '올웨이즈 qty1');
  const alwayz3 = assertBound('LAYOUT_02', 'alwayz-1000x1000', '올웨이즈 qty3');
  assert.deepEqual(alwayz3.slotBindings.map((b) => b.layerIndex), [0, 1, 2]);
  assertNotBound('LAYOUT_03', 'alwayz-1000x1000', '올웨이즈 qty5(미확인)');
  assertNotBound('LAYOUT_04', 'alwayz-1000x1000', '올웨이즈 qty10(미확인)');

  // 이랜드몰: 3만 확인됨(부추꼬막무침). 1은 미확인, 5/10은 실제로는 2슬롯뿐이라 제외.
  assertNotBound('LAYOUT_01', 'eland-mall-1000x1000', '이랜드몰 qty1(미확인)');
  assertBound('LAYOUT_02', 'eland-mall-1000x1000', '이랜드몰 qty3');
  assertNotBound('LAYOUT_03', 'eland-mall-1000x1000', '이랜드몰 qty5(실제로는 슬롯 2개뿐)');
  assertNotBound('LAYOUT_04', 'eland-mall-1000x1000', '이랜드몰 qty10(실제로는 슬롯 2개뿐, qty5와 동일 구조)');

  // 롯데온: 1/3/5/10 모두 확인됨
  assertBound('LAYOUT_01', 'lotte-on-1000x1000', '롯데온 qty1');
  assertBound('LAYOUT_02', 'lotte-on-1000x1000', '롯데온 qty3');
  const lotte5 = assertBound('LAYOUT_03', 'lotte-on-1000x1000', '롯데온 qty5');
  assert.equal(lotte5.slotBindings.length, 5);
  const lotte10 = assertBound('LAYOUT_04', 'lotte-on-1000x1000', '롯데온 qty10');
  assert.equal(lotte10.slotBindings.length, 10);

  console.log('  ✓ 채널 확장 바인딩: 지마켓(1/3/5)/옥션(1/3/5/10)/쿠팡(1/3/5)/알리익스프레스(1/3)/올웨이즈(1/3)/이랜드몰(3)/롯데온(1/3/5/10) — 실제 확인된 조합만 정확히 등록됨');

  // SSG/SK스토아/NS홈쇼핑/SKT딜: 등록된 3개 상품 계열의 실제 다중 슬롯 프레임이 하나도
  // 확인되지 않아 이번 배치에서는 바인딩이 전혀 없어야 한다(임의 verified 처리 금지).
  for (const cp of ['ssg-1000x1000', 'sk-stoa-1000x1000', 'ns-shopping-1000x1000', 'skt-deal-1000x1000']) {
    for (const lk of ['LAYOUT_01', 'LAYOUT_02', 'LAYOUT_03', 'LAYOUT_04']) {
      assertNotBound(lk, cp, `${cp} 전체 미확인`);
    }
  }
  console.log('  ✓ SSG/SK스토아/NS홈쇼핑/SKT딜: 실제 프레임 미확인 -> 바인딩 없음(임의 verified 처리 금지 확인)');

  // 전체 바인딩 배열에 중복 (layoutKey, channelPresetId) 조합이 없어야 한다.
  const seen = new Set<string>();
  for (const b of FIGMA_TEMPLATE_BINDINGS) {
    const key = `${b.layoutKey}::${b.channelPresetId}`;
    assert.ok(!seen.has(key), `중복 바인딩 발견: ${key}`);
    seen.add(key);
  }
  console.log('  ✓ FIGMA_TEMPLATE_BINDINGS 전체에 (layoutKey, channelPresetId) 중복 없음');

  console.log('templateMapper.test.ts: 모든 검증 통과');
}

main();
