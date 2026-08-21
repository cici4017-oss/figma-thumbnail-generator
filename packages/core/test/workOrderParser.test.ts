import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { readWorkOrderSheet, parseWorkOrderRows, type WorkOrder } from '../src/import/index';

/**
 * 회사 파일 없이도 Excel parser + batch validation을 검증하기 위해,
 * 표준 요청서와 동일한 컬럼 구조를 가진 워크북을 코드로 직접 만들어 테스트한다.
 */
async function buildSampleWorkbook(): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('01_작업요청');
  ws.addRow(['작업ID', '순번', '상품군', '채널', '상품명', '상품코드(자동입력)', '수량', '딱지여부', '비고']);

  // valid: 단일상품
  ws.addRow(['WO-0001', 1, '간편식', '네이버', '메추리알 장조림', 'SIMPLE_QUAIL_JANGJORIM_180', 3, 'X', '']);

  // valid: 3종 혼합
  ws.addRow(['WO-0002', 1, '간편식', '카카오', '소고기장조림', 'SIMPLE_BEEF_JANGJORIM_130', 1, 'O', '']);
  ws.addRow(['WO-0002', 2, '간편식', '카카오', '메추리알 장조림', 'SIMPLE_QUAIL_JANGJORIM_180', 1, 'O', '']);
  ws.addRow(['WO-0002', 3, '간편식', '카카오', '부추 꼬막무침', 'SIMPLE_CHIVE_KKOMAK_240', 1, 'O', '']);

  // reviewRequired: 비고 있음
  ws.addRow(['WO-0003', 1, '간편식', '토스', '소고기장조림', 'SIMPLE_BEEF_JANGJORIM_130', 2, 'X', '라이프스타일 연출컷 요청']);

  // error: 미등록 채널
  ws.addRow(['WO-0004', 1, '간편식', '없는채널', '소고기장조림', 'SIMPLE_BEEF_JANGJORIM_130', 1, 'X', '']);

  // error: 상품코드 비어있음(상품목록에 없는 상품명)
  ws.addRow(['WO-0005', 1, '간편식', '네이버', '없는상품', '', 1, 'X', '']);

  // error: 같은 작업ID 안에서 채널 불일치
  ws.addRow(['WO-0006', 1, '간편식', '네이버', '소고기장조림', 'SIMPLE_BEEF_JANGJORIM_130', 1, 'X', '']);
  ws.addRow(['WO-0006', 2, '간편식', '카카오', '메추리알 장조림', 'SIMPLE_QUAIL_JANGJORIM_180', 1, 'X', '']);

  // error: 수량이 0
  ws.addRow(['WO-0007', 1, '간편식', '네이버', '소고기장조림', 'SIMPLE_BEEF_JANGJORIM_130', 0, 'X', '']);

  // valid: 영유아
  ws.addRow(['WO-0008', 1, '영유아', 'GS샵', '이유식 소고기죽', 'BABY_BEEF_PORRIDGE_100', 5, 'O', '']);

  // 완전히 빈 행 (템플릿의 나머지 500행과 동일한 상태) -> 스킵되어야 함
  ws.addRow(['', '', '', '', '', '', '', '', '']);

  return wb.xlsx.writeBuffer() as unknown as Promise<ArrayBuffer>;
}

function byId(workOrders: WorkOrder[], id: string): WorkOrder {
  const found = workOrders.find((w) => w.workId === id);
  assert.ok(found, `작업ID "${id}"를 찾지 못했습니다.`);
  return found;
}

async function main() {
  const buffer = await buildSampleWorkbook();
  const rows = await readWorkOrderSheet(buffer);
  assert.equal(rows.length, 11, '빈 행은 스킵되고 11개 행만 읽혀야 함');

  const batch = parseWorkOrderRows(rows, 'test.xlsx');
  assert.equal(batch.workOrders.length, 8, '작업ID 8개로 묶여야 함');
  assert.deepEqual(
    { valid: batch.summary.valid, reviewRequired: batch.summary.reviewRequired, error: batch.summary.error },
    { valid: 3, reviewRequired: 1, error: 4 },
  );

  const wo1 = byId(batch.workOrders, 'WO-0001');
  assert.equal(wo1.status, 'valid');
  assert.equal(wo1.composition, 'single');
  assert.equal(wo1.totalQuantity, 3);

  const wo2 = byId(batch.workOrders, 'WO-0002');
  assert.equal(wo2.status, 'valid');
  assert.equal(wo2.composition, 'mixed');
  assert.equal(wo2.totalQuantity, 3);
  assert.equal(wo2.lines.length, 3);

  const wo3 = byId(batch.workOrders, 'WO-0003');
  assert.equal(wo3.status, 'reviewRequired');
  assert.ok(wo3.issues.some((i) => i.code === 'HAS_NOTE'));

  const wo4 = byId(batch.workOrders, 'WO-0004');
  assert.equal(wo4.status, 'error');
  assert.ok(wo4.issues.some((i) => i.code === 'UNKNOWN_CHANNEL'));

  const wo5 = byId(batch.workOrders, 'WO-0005');
  assert.equal(wo5.status, 'error');
  assert.ok(wo5.issues.some((i) => i.code === 'PRODUCT_CODE_MISSING'));

  const wo6 = byId(batch.workOrders, 'WO-0006');
  assert.equal(wo6.status, 'error');
  assert.ok(wo6.issues.some((i) => i.code === 'INCONSISTENT_CHANNEL'));

  const wo7 = byId(batch.workOrders, 'WO-0007');
  assert.equal(wo7.status, 'error');
  assert.ok(wo7.issues.some((i) => i.code === 'INVALID_QUANTITY'));

  const wo8 = byId(batch.workOrders, 'WO-0008');
  assert.equal(wo8.status, 'valid');
  assert.equal(wo8.productGroup, 'baby-food');

  console.log('workOrderParser.test.ts: 모든 검증 통과');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
