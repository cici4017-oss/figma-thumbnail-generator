import assert from 'node:assert/strict';
import { computeMixedSlotRects } from '../src/mixedLayoutGeometry';
import type { GeneratedSlotRect } from '../src/generatedLayoutGeometry';

/**
 * 혼합상품(A×2+B×3+C×4=9) 전용 배치 공식 검증. 단일상품 generated(computeGeneratedSlotRects)는
 * 겹침이 없어야 하지만, 이 공식은 의도적으로 겹치게 배치한다(밀도를 verified 템플릿 수준으로
 * 끌어올리기 위함) — 따라서 "겹침 없음"이 아니라 "같은 상품끼리 한 행으로 묶임 + 프레임 내부 +
 * 기존 family 공식보다 슬롯이 커짐 + 순번(그룹 순서) 유지"를 확인한다.
 */

function assertInBounds(rects: GeneratedSlotRect[], frameWidth: number, frameHeight: number, label: string) {
  for (const r of rects) {
    assert.ok(r.x >= -0.01, `${label}: ${r.slotKey} x가 음수(${r.x})`);
    assert.ok(r.y >= -0.01, `${label}: ${r.slotKey} y가 음수(${r.y})`);
    assert.ok(r.x + r.size <= frameWidth + 0.01, `${label}: ${r.slotKey}가 frameWidth를 벗어남`);
    assert.ok(r.y + r.size <= frameHeight + 0.01, `${label}: ${r.slotKey}가 frameHeight를 벗어남`);
  }
}

function main() {
  const frameWidth = 1000;
  const frameHeight = 1000;

  // A×2 + B×3 + C×4 = 9, Excel 순번 등장 순서 그대로 A, B, C
  const groups = [
    { assetKey: 'A', slotKeys: ['slot_1', 'slot_2'] },
    { assetKey: 'B', slotKeys: ['slot_3', 'slot_4', 'slot_5'] },
    { assetKey: 'C', slotKeys: ['slot_6', 'slot_7', 'slot_8', 'slot_9'] },
  ];

  const rects = computeMixedSlotRects({ groups, frameWidth, frameHeight });

  // 1) 슬롯 수/순번(=slotKey 순서) 유지 — 그룹을 재정렬하지 않는다.
  assert.equal(rects.length, 9);
  assert.deepEqual(
    rects.map((r) => r.slotKey),
    ['slot_1', 'slot_2', 'slot_3', 'slot_4', 'slot_5', 'slot_6', 'slot_7', 'slot_8', 'slot_9'],
  );
  console.log('  ✓ 혼합 9(2+3+4): 슬롯 수/순번 유지');

  // 2) 프레임 내부 — 밖으로 잘리지 않는다.
  assertInBounds(rects, frameWidth, frameHeight, '혼합 9(2+3+4)');
  console.log('  ✓ 혼합 9(2+3+4): 모든 슬롯이 프레임 내부');

  // 3) 모두 정사각형이고 크기가 동일 — 서로 다른 package 형태가 섞여도 시각적 크기가 갈리지 않게.
  const sizes = new Set(rects.map((r) => Math.round(r.size * 1000)));
  assert.equal(sizes.size, 1, '모든 슬롯의 크기가 동일해야 함(상품별 시각적 크기 차이 방지)');
  assert.ok(rects[0].size > 0, 'size가 0 이하');
  console.log('  ✓ 혼합 9(2+3+4): 모든 슬롯 크기가 동일(정사각형)');

  // 4) 기존 family 공식(pyramid-stack, 5+4 균등 그리드)보다 슬롯이 확연히 커야 한다 —
  //    "상품이 지나치게 작다"는 문제를 실제로 개선했는지 확인.
  //    기존 pyramid-stack(9)의 크기는 (1000-120-4*20)/5=160 (5칸 행이 병목).
  const oldPyramidStackSize = (frameWidth - 60 * 2 - 4 * 20) / 5;
  assert.ok(
    rects[0].size > oldPyramidStackSize * 1.3,
    `혼합 전용 배치의 슬롯 크기(${rects[0].size})가 기존 pyramid-stack(${oldPyramidStackSize})보다 30% 이상 커야 함`,
  );
  console.log(`  ✓ 혼합 9(2+3+4): 슬롯 크기(${rects[0].size.toFixed(1)})가 기존 방식(${oldPyramidStackSize})보다 확연히 큼`);

  // 5) 같은 상품(A/B/C)의 슬롯끼리 y좌표가 같다 — 한 행으로 묶여 하나의 그룹으로 보인다.
  function ys(keys: string[]): number[] {
    return keys.map((k) => rects.find((r) => r.slotKey === k)!.y);
  }
  assert.equal(new Set(ys(['slot_1', 'slot_2'])).size, 1, 'A 그룹은 같은 행(y)에 있어야 함');
  assert.equal(new Set(ys(['slot_3', 'slot_4', 'slot_5'])).size, 1, 'B 그룹은 같은 행(y)에 있어야 함');
  assert.equal(new Set(ys(['slot_6', 'slot_7', 'slot_8', 'slot_9'])).size, 1, 'C 그룹은 같은 행(y)에 있어야 함');
  // 그룹(행) 순서는 A → B → C(Excel 순번 등장 순서) 그대로 위에서 아래로.
  const [ay] = ys(['slot_1']);
  const [by] = ys(['slot_3']);
  const [cy] = ys(['slot_6']);
  assert.ok(ay < by && by < cy, '행 순서가 그룹 등장 순서(A, B, C) 그대로 위에서 아래로 이어져야 함');
  console.log('  ✓ 혼합 9(2+3+4): 동일 상품끼리 한 행으로 묶이고, 행 순서가 Excel 등장 순서를 유지');

  // 6) 전체 구성이 프레임 중심에 맞춰져 있다(상단으로 몰리지 않음) — 전체 bounding box의
  //    세로 중심이 frameHeight/2 근처여야 한다.
  const minY = Math.min(...rects.map((r) => r.y));
  const maxYBottom = Math.max(...rects.map((r) => r.y + r.size));
  const verticalCenter = (minY + maxYBottom) / 2;
  assert.ok(
    Math.abs(verticalCenter - frameHeight / 2) < 1,
    `전체 구성의 세로 중심(${verticalCenter})이 프레임 중심(${frameHeight / 2})과 일치해야 함`,
  );
  console.log('  ✓ 혼합 9(2+3+4): 전체 구성이 프레임 세로 중심에 맞춰짐(상단 쏠림 없음)');

  // 7) 단일 그룹(=사실상 단일상품)에서도 예외 없이 동작해야 한다(방어적 확인 — 실제로는
  //    isMixed===true일 때만 이 함수를 쓰므로 groups.length===1은 호출되지 않지만, 함수
  //    자체는 최소 입력에도 안전해야 한다).
  const single = computeMixedSlotRects({
    groups: [{ assetKey: 'A', slotKeys: ['slot_1'] }],
    frameWidth,
    frameHeight,
  });
  assert.equal(single.length, 1);
  assertInBounds(single, frameWidth, frameHeight, '단일 그룹 1개');
  console.log('  ✓ 최소 입력(단일 그룹 1개)에서도 정상 동작');

  // 8) 빈 groups/빈 slotKeys는 명확히 실패해야 한다(임의 대체 금지).
  assert.throws(() => computeMixedSlotRects({ groups: [], frameWidth, frameHeight }), /groups가 비어 있습니다/);
  assert.throws(
    () => computeMixedSlotRects({ groups: [{ assetKey: 'A', slotKeys: [] }], frameWidth, frameHeight }),
    /빈 slotKeys/,
  );
  console.log('  ✓ 빈 groups/빈 slotKeys는 명확히 에러를 던짐(임의 대체 금지)');

  console.log('mixedLayoutGeometry.test.ts: 모든 검증 통과');
}

main();
