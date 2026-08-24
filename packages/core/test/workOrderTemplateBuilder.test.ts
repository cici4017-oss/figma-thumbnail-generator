import assert from 'node:assert/strict';
import { buildWorkOrderTemplateWorkbook } from '../src/import/workOrderTemplateBuilder';
import { readWorkOrderSheet, parseWorkOrderRows } from '../src/import/index';
import { PRODUCTS } from '../src/data/products';
import { CHANNELS } from '../src/data/channels';

/**
 * figma-plugin의 "Excel 양식 다운로드" 버튼과 packages/core/scripts/generateWorkOrderTemplate.mjs가
 * 공유하는 buildWorkOrderTemplateWorkbook을 검증한다:
 * 1) 시트 구조/상품·채널 행 수가 실제 데이터(PRODUCTS/CHANNELS)와 정확히 일치하는지
 *    (하드코딩 목록을 또 만들지 않았다는 것의 직접적인 증거)
 * 2) 다운로드된 파일을 다시 저장 -> 업로드했을 때 표준 파서가 정상적으로 읽어내는지(라운드트립)
 */

async function main() {
  const workbook = buildWorkOrderTemplateWorkbook({ products: PRODUCTS, channels: CHANNELS });

  // 1) 시트 구성은 기존 표준 템플릿 구조를 그대로 유지해야 한다.
  assert.deepEqual(
    workbook.worksheets.map((ws) => ws.name),
    ['01_작업요청', '02_상품목록', '03_채널목록', '04_작성가이드'],
  );

  // 2) 02_상품목록/03_채널목록은 현재 PRODUCTS/CHANNELS 데이터를 그대로 반영해야 한다
  //    (배너 1행 + 헤더 1행 + 실제 데이터 행 수).
  const productSheet = workbook.getWorksheet('02_상품목록')!;
  assert.equal(productSheet.rowCount, 2 + PRODUCTS.length, '상품목록 행 수가 PRODUCTS와 일치해야 함');
  assert.equal(
    productSheet.getCell(productSheet.rowCount, 1).value,
    PRODUCTS[PRODUCTS.length - 1].code,
    '마지막 행이 PRODUCTS의 마지막 상품과 일치해야 함(실제 데이터가 반영됐다는 증거)',
  );

  const channelSheet = workbook.getWorksheet('03_채널목록')!;
  assert.equal(channelSheet.rowCount, 2 + CHANNELS.length, '채널목록 행 수가 CHANNELS와 일치해야 함');
  assert.equal(channelSheet.getCell(channelSheet.rowCount, 2).value, CHANNELS[CHANNELS.length - 1].id);

  console.log('  ✓ 시트 구조 유지 + 02_상품목록/03_채널목록이 현재 PRODUCTS/CHANNELS 데이터를 그대로 반영함');

  // 3) 라운드트립: xlsx로 저장 -> 다시 읽기 -> 표준 파서로 파싱했을 때 예시 2건(단일상품/3종 혼합)이
  //    정상 valid로 파싱되어야 한다. exceljs는 수식 계산기가 아니라서 저장만 하면 상품코드(F열)
  //    수식 결과가 비어 있다 — 실제 Excel에서 열어 계산됐을 값을 이 테스트에서 직접 채워
  //    넣어 "사용자가 작성 후 업로드"하는 상황을 흉내낸다. 이 과정에서 예시 행의 상품명이
  //    실제 02_상품목록에 존재하는지도 함께 검증된다(존재하지 않으면 코드를 못 찾아 실패).
  const nameToCode = new Map(PRODUCTS.map((p) => [p.name, p.code]));
  const workSheet = workbook.getWorksheet('01_작업요청')!;
  for (let r = 2; r <= workSheet.rowCount; r++) {
    const nameValue = workSheet.getCell(r, 5).value;
    if (typeof nameValue !== 'string' || nameValue === '') continue;
    const code = nameToCode.get(nameValue);
    assert.ok(code, `예시 행의 상품명 "${nameValue}"이 02_상품목록에 없음 — 실제 Excel에서 INDEX/MATCH가 빈 값을 반환하게 됨`);
    workSheet.getCell(r, 6).value = code as string;
  }

  const buffer = (await workbook.xlsx.writeBuffer()) as unknown as ArrayBuffer;
  const rawRows = await readWorkOrderSheet(buffer);
  const batch = parseWorkOrderRows(rawRows, '썸네일_자동화_요청서.xlsx');

  const wo1 = batch.workOrders.find((w) => w.workId === 'WO-0001');
  assert.ok(wo1, 'WO-0001 예시 작업이 파싱되어야 함');
  assert.equal(wo1!.status, 'valid');
  assert.equal(wo1!.lines.length, 1);
  assert.equal(wo1!.lines[0].productCode, 'SIMPLE_QUAIL_JANGJORIM_180');

  const wo2 = batch.workOrders.find((w) => w.workId === 'WO-0002');
  assert.ok(wo2, 'WO-0002 예시 작업이 파싱되어야 함');
  assert.equal(wo2!.status, 'valid');
  assert.equal(wo2!.lines.length, 3, '3종 혼합상품 예시는 3줄이어야 함');
  assert.deepEqual(
    wo2!.lines.map((l) => l.productCode),
    ['SIMPLE_BEEF_JANGJORIM_130', 'SIMPLE_QUAIL_JANGJORIM_180', 'SIMPLE_CHIVE_KKOMAK_240'],
  );

  console.log('  ✓ 다운로드 -> 저장 -> 업로드 라운드트립: 예시 작업(단일상품/3종 혼합) 모두 정상 valid로 파싱됨');

  console.log('workOrderTemplateBuilder.test.ts: 모든 검증 통과');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
