import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {
  parseClipboardTable,
  readWorkOrderSheet,
  parseWorkOrderRows,
  composeBatchPreview,
  type WorkOrder,
} from '../src/import/index';
import { PRODUCTS } from '../src/data/products';

/**
 * "Excel 표 붙여넣기"(clipboard TSV) 경로가 기존 xlsx 업로드 경로와 동일한 결과를 낳는지
 * 검증한다. parseClipboardTable은 RawWorkOrderRow[]만 만들고, 그 뒤(parseWorkOrderRows ->
 * composeBatchPreview -> ...)는 xlsx 경로와 완전히 동일한 함수를 그대로 재사용한다 —
 * 이 테스트가 그 재사용이 실제로 문제없이 이어지는지 확인한다.
 */

function byId(workOrders: WorkOrder[], id: string): WorkOrder {
  const found = workOrders.find((w) => w.workId === id);
  assert.ok(found, `작업ID "${id}"를 찾지 못했습니다.`);
  return found;
}

// 탭으로 열을 구분한 텍스트를 만드는 헬퍼 — 실제 Excel 복사 결과(TSV)와 동일한 형태.
function tsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.join('\t')).join('\n');
}

function testSingleTask() {
  const text = tsv([['WO-0001', 1, '간편식', '네이버', '메추리알 장조림', 3, 'X', '']]);
  const rows = parseClipboardTable(text);
  assert.equal(rows.length, 1);

  const batch = parseWorkOrderRows(rows, '클립보드 붙여넣기');
  assert.equal(batch.workOrders.length, 1);
  const wo = byId(batch.workOrders, 'WO-0001');
  assert.equal(wo.status, 'valid');
  assert.equal(wo.lines.length, 1);
  assert.equal(wo.lines[0].productCode, 'SIMPLE_QUAIL_JANGJORIM_180');
  console.log('  ✓ 단일 작업: 헤더 없이 표준 순서로 정상 파싱됨');
}

function testMixedProductsSameWorkId() {
  const text = tsv([
    ['WO-0002', 1, '간편식', '카카오', '소고기장조림', 1, 'O', ''],
    ['WO-0002', 2, '간편식', '카카오', '메추리알 장조림', 1, 'O', ''],
    ['WO-0002', 3, '간편식', '카카오', '부추 꼬막무침', 1, 'O', ''],
  ]);
  const rows = parseClipboardTable(text);
  const batch = parseWorkOrderRows(rows, '클립보드 붙여넣기');
  const wo = byId(batch.workOrders, 'WO-0002');
  assert.equal(wo.status, 'valid');
  assert.equal(wo.composition, 'mixed');
  assert.equal(wo.lines.length, 3);
  assert.deepEqual(
    wo.lines.map((l) => l.productCode),
    ['SIMPLE_BEEF_JANGJORIM_130', 'SIMPLE_QUAIL_JANGJORIM_180', 'SIMPLE_CHIVE_KKOMAK_240'],
  );
  console.log('  ✓ 혼합상품(같은 작업ID 여러 행): 3줄 모두 정상 파싱되고 mixed로 판정됨');
}

function testMultipleTasksAtOnce() {
  const text = tsv([
    ['WO-0001', 1, '간편식', '네이버', '메추리알 장조림', 3, 'X', ''],
    ['WO-0002', 1, '간편식', '카카오', '소고기장조림', 1, 'O', ''],
    ['WO-0002', 2, '간편식', '카카오', '메추리알 장조림', 1, 'O', ''],
    ['WO-0008', 1, '영유아', 'GS샵', '이유식 소고기죽', 5, 'O', ''],
  ]);
  const rows = parseClipboardTable(text);
  const batch = parseWorkOrderRows(rows, '클립보드 붙여넣기');
  assert.equal(batch.workOrders.length, 3, '작업ID 3개로 묶여야 함');
  assert.equal(byId(batch.workOrders, 'WO-0001').status, 'valid');
  assert.equal(byId(batch.workOrders, 'WO-0002').status, 'valid');
  assert.equal(byId(batch.workOrders, 'WO-0008').status, 'valid');
  console.log('  ✓ 여러 작업 동시 붙여넣기: 작업ID 3개로 정확히 분리됨');
}

function testInvalidProductNameAndQuantity() {
  const text = tsv([
    ['WO-0005', 1, '간편식', '네이버', '없는상품', 1, 'X', ''], // 잘못된 상품명
    ['WO-0007', 1, '간편식', '네이버', '소고기장조림', 0, 'X', ''], // 잘못된 수량
  ]);
  const rows = parseClipboardTable(text);

  // 상품명이 PRODUCTS에 없으면 Excel의 IFERROR(...,"")와 동일하게 productCode가 빈 문자열이어야 함.
  const badNameRow = rows.find((r) => r.workId === 'WO-0005')!;
  assert.equal(badNameRow.productCode, '', '등록되지 않은 상품명은 상품코드가 빈 값이어야 함');

  const batch = parseWorkOrderRows(rows, '클립보드 붙여넣기');
  const wo5 = byId(batch.workOrders, 'WO-0005');
  assert.equal(wo5.status, 'error');
  assert.ok(wo5.issues.some((i) => i.code === 'PRODUCT_CODE_MISSING'));

  const wo7 = byId(batch.workOrders, 'WO-0007');
  assert.equal(wo7.status, 'error');
  assert.ok(wo7.issues.some((i) => i.code === 'INVALID_QUANTITY'));

  console.log('  ✓ 잘못된 상품명/수량: 기존 xlsx 경로와 동일한 오류 코드(PRODUCT_CODE_MISSING/INVALID_QUANTITY)로 처리됨');
}

function testHeaderRowWithReorderedColumns() {
  // 헤더가 있고, 순서도 표준과 다르게 섞여 있어도(+ 지원하지 않는 "상품코드(자동입력)" 열이
  // 섞여 있어도) 라벨 기준으로 정확히 매칭되어야 한다.
  const text = tsv([
    ['채널', '작업ID', '상품코드(자동입력)', '상품명', '순번', '상품군', '비고', '수량', '딱지여부'],
    ['네이버', 'WO-0001', '', '메추리알 장조림', 1, '간편식', '', 3, 'X'],
  ]);
  const rows = parseClipboardTable(text);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].workId, 'WO-0001');
  assert.equal(rows[0].channel, '네이버');
  assert.equal(rows[0].productName, '메추리알 장조림');
  assert.equal(rows[0].quantity, 3);
  assert.equal(rows[0].badgeRaw, 'X');

  const batch = parseWorkOrderRows(rows, '클립보드 붙여넣기');
  assert.equal(byId(batch.workOrders, 'WO-0001').status, 'valid');
  console.log('  ✓ 헤더 있음 + 순서가 달라도(지원하지 않는 열이 섞여도) 헤더명으로 정확히 매칭됨');
}

async function testMatchesExistingXlsxBatchPreview() {
  // xlsx 업로드 경로와 완전히 동일한 데이터를 clipboard로도 붙여넣었을 때, composeBatchPreview
  // 결과(summary/작업ID별 상태)가 정확히 같아야 한다 — 요청서의 핵심 확인 항목.
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('01_작업요청');
  ws.addRow(['작업ID', '순번', '상품군', '채널', '상품명', '상품코드(자동입력)', '수량', '딱지여부', '비고']);
  const dataRows: (string | number)[][] = [
    ['WO-0001', 1, '간편식', '네이버', '메추리알 장조림', '', 3, 'X', ''],
    ['WO-0002', 1, '간편식', '카카오', '소고기장조림', '', 1, 'O', ''],
    ['WO-0002', 2, '간편식', '카카오', '메추리알 장조림', '', 1, 'O', ''],
    ['WO-0002', 3, '간편식', '카카오', '부추 꼬막무침', '', 1, 'O', ''],
    ['WO-0005', 1, '간편식', '네이버', '없는상품', '', 1, 'X', ''],
  ];
  const nameToCode = new Map(PRODUCTS.map((p) => [p.name, p.code] as const));
  for (const row of dataRows) {
    const withCode = [...row];
    withCode[5] = nameToCode.get(String(row[4])) ?? '';
    ws.addRow(withCode);
  }

  const xlsxBuffer = (await wb.xlsx.writeBuffer()) as unknown as ArrayBuffer;
  const xlsxRows = await readWorkOrderSheet(xlsxBuffer);
  const xlsxBatch = parseWorkOrderRows(xlsxRows, 'xlsx-upload.xlsx');
  const xlsxPreview = composeBatchPreview(xlsxBatch);

  const clipboardText = tsv(dataRows.map((r) => [r[0], r[1], r[2], r[3], r[4], r[6], r[7], r[8]]));
  const clipboardRows = parseClipboardTable(clipboardText);
  const clipboardBatch = parseWorkOrderRows(clipboardRows, '클립보드 붙여넣기');
  const clipboardPreview = composeBatchPreview(clipboardBatch);

  assert.deepEqual(
    clipboardPreview.summary.workOrderStatusSummary,
    xlsxPreview.summary.workOrderStatusSummary,
    'workOrder 단위 요약이 xlsx 경로와 동일해야 함',
  );
  assert.deepEqual(
    clipboardPreview.summary.outputStatusSummary,
    xlsxPreview.summary.outputStatusSummary,
    'output 단위 요약이 xlsx 경로와 동일해야 함',
  );
  assert.equal(clipboardPreview.rows.length, xlsxPreview.rows.length);

  for (const xlsxRow of xlsxPreview.rows) {
    const clipboardRow = clipboardPreview.rows.find((r) => r.workId === xlsxRow.workId)!;
    assert.ok(clipboardRow, `작업ID "${xlsxRow.workId}"가 clipboard 경로에도 있어야 함`);
    assert.equal(clipboardRow.overallStatus, xlsxRow.overallStatus, `작업ID "${xlsxRow.workId}" 상태 불일치`);
    assert.deepEqual(
      clipboardRow.outputs.map((o) => ({ channelPresetId: o.channelPresetId, status: o.status, layoutKey: o.layoutKey })),
      xlsxRow.outputs.map((o) => ({ channelPresetId: o.channelPresetId, status: o.status, layoutKey: o.layoutKey })),
      `작업ID "${xlsxRow.workId}"의 출력 결과가 xlsx 경로와 달라짐`,
    );
  }

  console.log('  ✓ 동일 데이터 기준 xlsx 업로드 경로와 clipboard 붙여넣기 경로의 Batch Preview 결과가 완전히 동일함');
}

function testProductCodeColumnTakesPriorityOverName() {
  // 실사용 복붙 테스트에서 확인된 문제: 상품명이 미세하게 다르면(예: 셀 안 줄바꿈으로 생긴
  // 연속 공백) 정상 상품인데도 PRODUCT_CODE_MISSING으로 막혔다. "상품코드" 열이 있고 그
  // 값이 PRODUCTS에 실제 존재하면, 상품명이 다소 어긋나도 상품코드를 그대로 써야 한다.
  const text = tsv([
    ['작업ID', '순번', '상품군', '채널', '상품명', '상품코드', '수량', '딱지여부', '비고'],
    ['WO-4001', 1, '간편식', '네이버', '메추리알  장조림', 'SIMPLE_QUAIL_JANGJORIM_180', 3, 'X', ''], // 상품명에 공백 2칸
  ]);
  const rows = parseClipboardTable(text);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].productCode, 'SIMPLE_QUAIL_JANGJORIM_180', '상품코드 열이 있으면 상품명이 어긋나도 코드를 그대로 사용해야 함');

  const batch = parseWorkOrderRows(rows, '클립보드 붙여넣기');
  assert.equal(byId(batch.workOrders, 'WO-4001').status, 'valid');
  console.log('  ✓ 상품코드 열 우선: 상품명이 연속 공백으로 어긋나도 상품코드로 정상 매칭됨(valid)');
}

function testProductCodeColumnFallsBackToNameWhenMissingOrUnknown() {
  const text = tsv([
    ['작업ID', '순번', '상품군', '채널', '상품명', '상품코드', '수량', '딱지여부', '비고'],
    ['WO-4002', 1, '간편식', '네이버', '소고기장조림', '', 1, 'O', ''], // 상품코드 빈 값 -> 상품명으로 폴백
    ['WO-4003', 1, '간편식', '네이버', '부추 꼬막무침', 'NOT_A_REAL_CODE', 2, 'O', ''], // 미등록 코드 -> 상품명으로 폴백
  ]);
  const rows = parseClipboardTable(text);
  assert.equal(rows.find((r) => r.workId === 'WO-4002')!.productCode, 'SIMPLE_BEEF_JANGJORIM_130');
  assert.equal(rows.find((r) => r.workId === 'WO-4003')!.productCode, 'SIMPLE_CHIVE_KKOMAK_240');

  const batch = parseWorkOrderRows(rows, '클립보드 붙여넣기');
  assert.equal(byId(batch.workOrders, 'WO-4002').status, 'valid');
  assert.equal(byId(batch.workOrders, 'WO-4003').status, 'valid');
  console.log('  ✓ 상품코드 열이 비어있거나 미등록 값이면 상품명 매칭으로 폴백됨');
}

function testProductNameMatchOnlyNormalizesWhitespaceNotFuzzy() {
  const text = tsv([
    ['작업ID', '순번', '상품군', '채널', '상품명', '상품코드', '수량', '딱지여부', '비고'],
    ['WO-4004', 1, '간편식', '네이버', '  소고기장조림  ', '', 1, 'O', ''], // trim만 필요
    ['WO-4005', 1, '간편식', '네이버', '소고기 장조림', '', 1, 'X', ''], // 임의 fuzzy match 대상 아님(중간에 없는 공백)
  ]);
  const rows = parseClipboardTable(text);
  assert.equal(rows.find((r) => r.workId === 'WO-4004')!.productCode, 'SIMPLE_BEEF_JANGJORIM_130', 'trim은 허용되어야 함');
  assert.equal(rows.find((r) => r.workId === 'WO-4005')!.productCode, '', '등록된 이름과 다른 문자열은 fuzzy match하지 않아야 함');
  console.log('  ✓ 상품명 매칭은 trim/연속 공백 정규화만 허용하고 임의 fuzzy match는 하지 않음');
}

function testThreeConfirmedCodesViaClipboard() {
  // 수정 후 확정 코드 3개(SIMPLE_BEEF_JANGJORIM_130/SIMPLE_QUAIL_JANGJORIM_180/
  // SIMPLE_CHIVE_KKOMAK_240)를 상품코드 열로 붙여넣었을 때 정상 valid가 되는지 확인.
  const text = tsv([
    ['작업ID', '순번', '상품군', '채널', '상품명', '상품코드', '수량', '딱지여부', '비고'],
    ['WO-4006', 1, '간편식', '네이버', '소고기장조림', 'SIMPLE_BEEF_JANGJORIM_130', 2, 'O', ''],
    ['WO-4006', 2, '간편식', '네이버', '메추리알 장조림', 'SIMPLE_QUAIL_JANGJORIM_180', 3, 'O', ''],
    ['WO-4006', 3, '간편식', '네이버', '부추 꼬막무침', 'SIMPLE_CHIVE_KKOMAK_240', 4, 'O', ''],
  ]);
  const rows = parseClipboardTable(text);
  assert.deepEqual(
    rows.map((r) => r.productCode),
    ['SIMPLE_BEEF_JANGJORIM_130', 'SIMPLE_QUAIL_JANGJORIM_180', 'SIMPLE_CHIVE_KKOMAK_240'],
  );

  const batch = parseWorkOrderRows(rows, '클립보드 붙여넣기');
  const wo = byId(batch.workOrders, 'WO-4006');
  assert.equal(wo.status, 'valid');
  assert.equal(wo.composition, 'mixed');
  console.log('  ✓ 확정 코드 3개(SIMPLE_BEEF_JANGJORIM_130/SIMPLE_QUAIL_JANGJORIM_180/SIMPLE_CHIVE_KKOMAK_240) 상품코드 열로 정상 valid');
}

async function main() {
  testSingleTask();
  testMixedProductsSameWorkId();
  testMultipleTasksAtOnce();
  testInvalidProductNameAndQuantity();
  testHeaderRowWithReorderedColumns();
  await testMatchesExistingXlsxBatchPreview();
  testProductCodeColumnTakesPriorityOverName();
  testProductCodeColumnFallsBackToNameWhenMissingOrUnknown();
  testProductNameMatchOnlyNormalizesWhitespaceNotFuzzy();
  testThreeConfirmedCodesViaClipboard();
  console.log('clipboardTableReader.test.ts: 모든 검증 통과');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
