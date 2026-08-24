import assert from 'node:assert/strict';
import { computeGeneratedSlotRects, type GeneratedSlotRect } from '../src/generatedLayoutGeometry';

/**
 * generated renderer가 실제로 그리는 슬롯 좌표 공식(core에는 좌표가 없으므로 여기서만
 * 검증 가능)이 요청서의 확인 항목(정확한 슬롯 수/겹침 없음/프레임 밖 잘림 없음/정사각형=비율
 * 왜곡 없음/순번 유지)을 실제로 만족하는지 순수 함수 레벨에서 검증한다.
 */

function overlaps(a: GeneratedSlotRect, b: GeneratedSlotRect): boolean {
  return a.x < b.x + b.size && b.x < a.x + a.size && a.y < b.y + b.size && b.y < a.y + a.size;
}

function assertNoOverlap(rects: GeneratedSlotRect[], label: string) {
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      assert.ok(!overlaps(rects[i], rects[j]), `${label}: 슬롯 ${rects[i].slotKey}/${rects[j].slotKey}가 겹침`);
    }
  }
}

function assertInBounds(rects: GeneratedSlotRect[], frameWidth: number, frameHeight: number, label: string) {
  for (const r of rects) {
    assert.ok(r.x >= 0, `${label}: ${r.slotKey} x가 음수(${r.x})`);
    assert.ok(r.y >= 0, `${label}: ${r.slotKey} y가 음수(${r.y})`);
    assert.ok(r.x + r.size <= frameWidth + 0.01, `${label}: ${r.slotKey}가 frameWidth를 벗어남`);
    assert.ok(r.y + r.size <= frameHeight + 0.01, `${label}: ${r.slotKey}가 frameHeight를 벗어남`);
  }
}

function assertSquare(rects: GeneratedSlotRect[], label: string) {
  for (const r of rects) {
    assert.ok(r.size > 0, `${label}: ${r.slotKey} size가 0 이하`);
  }
}

function slotKeysFor(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `slot_${i + 1}`);
}

function testFamily(familyId: 'row-linear' | 'diagonal-cascade' | 'pyramid-stack', slotCount: number) {
  const slotKeys = slotKeysFor(slotCount);
  const frameWidth = 1000;
  const frameHeight = 1000;
  const rects = computeGeneratedSlotRects({ familyId, slotKeys, frameWidth, frameHeight });
  const label = `${familyId}(${slotCount})`;

  assert.equal(rects.length, slotCount, `${label}: 슬롯 수가 요청한 상품 수와 일치해야 함`);
  assert.deepEqual(rects.map((r) => r.slotKey), slotKeys, `${label}: 상품 순번(slotKey 순서)이 유지되어야 함`);
  assertSquare(rects, label);
  assertNoOverlap(rects, label);
  assertInBounds(rects, frameWidth, frameHeight, label);
}

function main() {
  // 요청서의 첫 실제 테스트 대상: 단일상품×2/4/6, 혼합 9(2+3+4)
  testFamily('row-linear', 2);
  testFamily('row-linear', 3);
  testFamily('diagonal-cascade', 4);
  testFamily('diagonal-cascade', 5);
  testFamily('pyramid-stack', 6);
  testFamily('pyramid-stack', 9);
  testFamily('pyramid-stack', 10);
  console.log('  ✓ row-linear/diagonal-cascade/pyramid-stack: 슬롯 수/순번/정사각형/겹침 없음/프레임 내부 전부 만족(2,3,4,5,6,9,10)');

  assert.throws(
    () => computeGeneratedSlotRects({ familyId: 'grid-cluster', slotKeys: slotKeysFor(12), frameWidth: 1000, frameHeight: 1000 }),
    /아직 구현되지 않았습니다/,
    '지원하지 않는 family는 임의로 비슷한 배치를 그리지 않고 명확히 실패해야 함',
  );
  console.log('  ✓ 미지원 family(grid-cluster)는 명확히 에러를 던짐(임의 대체 금지)');

  console.log('generatedLayoutGeometry.test.ts: 모든 검증 통과');
}

main();
