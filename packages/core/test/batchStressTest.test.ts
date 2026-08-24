import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {
  readWorkOrderSheet,
  parseWorkOrderRows,
  composeBatchPreview,
  type BatchPreviewRow,
} from '../src/import/index';

/**
 * 30건 규모 Batch stress test. 확보된 실제 상품코드 3개(SIMPLE_BEEF_JANGJORIM_130/
 * SIMPLE_QUAIL_JANGJORIM_180/SIMPLE_CHIVE_KKOMAK_240)와 실제 등록된 채널/preset/verified
 * Layout(LAYOUT_01~10)·generated fallback·verified-only 정책(토스 600x240)까지 실제 운영
 * 데이터(CHANNEL_PRESETS/LAYOUTS/DOMAIN_PRODUCTS, 별도 mock deps 없음) 그대로 exercise한다.
 *
 * 다루는 축:
 * - 단일 규격 채널(네이버 등) vs 복수 규격 채널(카카오/홈앤쇼핑/제이슨딜/11번가/토스) fan-out
 * - verified 슬롯 수(1/3/5/10, wide는 1/3/5) vs generated fallback 구간(2,4,6,7,9,15,20)
 *   vs generated 한도 초과(21)
 * - 한 작업ID 안에서 output별로 ready/reviewRequired가 갈리는 경우(#7 독립성)
 * - verified-only 정책(토스 600x240)이 error가 아니라 reviewRequired로 표시되는지
 * - parser 단계 reviewRequired(비고)/error(수량·상품코드·채널) 케이스
 */
async function buildStressWorkbook(): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('01_작업요청');
  ws.addRow(['작업ID', '순번', '상품군', '채널', '상품명', '상품코드(자동입력)', '수량', '딱지여부', '비고']);

  const BEEF = 'SIMPLE_BEEF_JANGJORIM_130';
  const BEEF_NAME = '소고기장조림';
  const QUAIL = 'SIMPLE_QUAIL_JANGJORIM_180';
  const QUAIL_NAME = '메추리알 장조림';
  const CHIVE = 'SIMPLE_CHIVE_KKOMAK_240';
  const CHIVE_NAME = '부추 꼬막무침';

  const row = (workId: string, channel: string, name: string, code: string, qty: number, note = '') =>
    ws.addRow([workId, 1, '간편식', channel, name, code, qty, 'X', note]);

  // --- 네이버(단일 규격, square-1x1) : verified 1/3/5/10 + generated 9/20/21(초과) ---
  row('WO-001', '네이버', BEEF_NAME, BEEF, 1);
  row('WO-002', '네이버', BEEF_NAME, BEEF, 3);
  row('WO-003', '네이버', QUAIL_NAME, QUAIL, 5);
  row('WO-004', '네이버', CHIVE_NAME, CHIVE, 10);
  ws.addRow(['WO-005', 1, '간편식', '네이버', BEEF_NAME, BEEF, 2, 'O', '']);
  ws.addRow(['WO-005', 2, '간편식', '네이버', QUAIL_NAME, QUAIL, 3, 'O', '']);
  ws.addRow(['WO-005', 3, '간편식', '네이버', CHIVE_NAME, CHIVE, 4, 'O', '']);
  row('WO-006', '네이버', BEEF_NAME, BEEF, 20);
  row('WO-007', '네이버', BEEF_NAME, BEEF, 21);

  // --- 복수 규격 채널 fan-out ---
  row('WO-008', '카카오', BEEF_NAME, BEEF, 3); // square+wide-16x9 둘 다 verified
  row('WO-009', '카카오', QUAIL_NAME, QUAIL, 10); // square verified / wide-16x9 generated
  row('WO-010', '홈앤쇼핑', CHIVE_NAME, CHIVE, 5); // wide-16x9(LAYOUT_07) 채널 교차 재사용
  row('WO-011', '제이슨딜', BEEF_NAME, BEEF, 1); // wide-16x9(LAYOUT_05) 채널 교차 재사용
  row('WO-012', '11번가', QUAIL_NAME, QUAIL, 3); // square+wide-2x1 둘 다 verified
  row('WO-013', '11번가', CHIVE_NAME, CHIVE, 7); // 둘 다 generated(pyramid-stack), 서로 다른 preset
  row('WO-014', '토스', BEEF_NAME, BEEF, 3); // square verified / wide-5x2 verified-only reviewRequired
  row('WO-015', '토스', QUAIL_NAME, QUAIL, 1); // 동일 패턴, 다른 수량

  // --- 단일 규격 채널(그 외) : verified 재사용 + generated 구간 확인 ---
  row('WO-016', 'SSG', CHIVE_NAME, CHIVE, 3);
  row('WO-017', '옥션', BEEF_NAME, BEEF, 5);
  row('WO-018', '지마켓', QUAIL_NAME, QUAIL, 10);
  row('WO-019', 'SK스토아', BEEF_NAME, BEEF, 1);
  row('WO-020', 'SKT딜', CHIVE_NAME, CHIVE, 15); // generated grid-cluster(11~20)
  row('WO-021', '쿠팡', QUAIL_NAME, QUAIL, 6); // generated pyramid-stack(6~10)
  row('WO-022', '알리익스프레스', BEEF_NAME, BEEF, 2); // generated row-linear(2~3)
  row('WO-023', 'NS홈쇼핑', CHIVE_NAME, CHIVE, 4); // generated diagonal-cascade(4~5)
  row('WO-024', '올웨이즈', BEEF_NAME, BEEF, 3);
  row('WO-025', '이랜드몰', QUAIL_NAME, QUAIL, 5);
  row('WO-026', '롯데온', CHIVE_NAME, CHIVE, 10);

  // --- parser 단계에서 이미 걸러지는 케이스 ---
  row('WO-027', '네이버', BEEF_NAME, BEEF, 3, '특이 연출 요청'); // reviewRequired(HAS_NOTE)
  row('WO-028', '네이버', BEEF_NAME, BEEF, 0); // error(INVALID_QUANTITY)
  row('WO-029', '없는채널', BEEF_NAME, BEEF, 1); // error(UNKNOWN_CHANNEL)
  row('WO-030', '네이버', '없는상품', '', 1); // error(PRODUCT_CODE_MISSING)

  return wb.xlsx.writeBuffer() as unknown as Promise<ArrayBuffer>;
}

function byId(rows: BatchPreviewRow[], workId: string): BatchPreviewRow {
  const found = rows.find((r) => r.workId === workId);
  assert.ok(found, `작업ID "${workId}"를 찾지 못했습니다.`);
  return found;
}

async function main() {
  const buffer = await buildStressWorkbook();
  const rawRows = await readWorkOrderSheet(buffer);
  const batch = parseWorkOrderRows(rawRows, 'stress-test.xlsx');

  const startedAt = Date.now();
  const preview = composeBatchPreview(batch);
  const elapsedMs = Date.now() - startedAt;

  assert.equal(preview.rows.length, 30, '작업ID 30건이 모두 생성되어야 함');

  // workOrder(작업ID) 단위 집계 vs output(fan-out 이후 실제 생성될 썸네일) 단위 집계는
  // 서로 다른 수치다 — 합계도 각각 30/34로 다르고, 상태 분포도 우연히 겹치지 않는 한 다르다.
  // Batch Preview는 반드시 이 둘을 분리해서 보여줘야 한다(작업ID 요약 vs 실제 생성물 요약).
  assert.equal(preview.summary.totalWorkOrders, 30);
  assert.equal(preview.summary.totalOutputs, 34, '단일규격 18건×1 + 복수규격 8건×2 = 34개 output');
  assert.deepEqual(preview.summary.workOrderStatusSummary, { ready: 15, reviewRequired: 11, error: 4 });
  assert.deepEqual(preview.summary.outputStatusSummary, { ready: 22, reviewRequired: 11, error: 1 });

  console.log(
    `  ⏱ composeBatchPreview(작업ID 30건 -> output 34건): ${elapsedMs}ms`,
  );

  // --- 대표 케이스 스팟 체크 ---

  // 1) 단일 verified (네이버 1/3/5/10)
  assert.equal(byId(preview.rows, 'WO-001').outputs[0].layoutKey, 'LAYOUT_01');
  assert.equal(byId(preview.rows, 'WO-002').outputs[0].layoutKey, 'LAYOUT_02');
  assert.equal(byId(preview.rows, 'WO-003').outputs[0].layoutKey, 'LAYOUT_03');
  const wo004 = byId(preview.rows, 'WO-004');
  assert.equal(wo004.outputs[0].layoutKey, 'LAYOUT_04');
  assert.equal(wo004.overallStatus, 'ready');

  // 2) 9종 혼합 -> generated pyramid-stack, reviewRequired (기존 정책 유지 확인)
  const wo005 = byId(preview.rows, 'WO-005');
  assert.equal(wo005.outputs[0].layoutKey, 'GENERATED_PYRAMID-STACK_9');
  assert.equal(wo005.overallStatus, 'reviewRequired');

  // 3) 20개 -> generated grid-cluster, 21개 -> 한도 초과 error
  assert.equal(byId(preview.rows, 'WO-006').outputs[0].layoutKey, 'GENERATED_GRID-CLUSTER_20');
  const wo007 = byId(preview.rows, 'WO-007');
  assert.equal(wo007.outputs[0].status, 'error');
  assert.ok(wo007.outputs[0].reason && wo007.outputs[0].reason.includes('20개'));

  // 4) 카카오 3개 -> square/wide-16x9 둘 다 verified(#7: 서로 다른 layoutKey, 둘 다 ready)
  const wo008 = byId(preview.rows, 'WO-008');
  assert.equal(wo008.outputs.length, 2);
  assert.ok(wo008.outputs.every((o) => o.status === 'ready' && o.layoutSource === 'verified'));
  assert.equal(wo008.overallStatus, 'ready');

  // 5) 카카오 10개 -> square verified, wide-16x9 generated (한쪽만 reviewRequired여도 서로 독립)
  const wo009 = byId(preview.rows, 'WO-009');
  const wo009Square = wo009.outputs.find((o) => o.channelPresetId === 'kakao-1000x1000')!;
  const wo009Wide = wo009.outputs.find((o) => o.channelPresetId === 'kakao-750x422')!;
  assert.equal(wo009Square.status, 'ready');
  assert.equal(wo009Square.layoutSource, 'verified');
  assert.equal(wo009Wide.status, 'reviewRequired');
  assert.equal(wo009Wide.layoutSource, 'generated');
  assert.equal(wo009.overallStatus, 'reviewRequired');

  // 6) wide-16x9 채널 교차 재사용: 홈앤쇼핑/제이슨딜도 LAYOUT_07/05를 그대로 씀
  const wo010Wide = byId(preview.rows, 'WO-010').outputs.find((o) => o.channelPresetId === 'home-and-shopping-640x350')!;
  assert.equal(wo010Wide.layoutKey, 'LAYOUT_07');
  assert.equal(wo010Wide.layoutSource, 'verified');
  const wo011Wide = byId(preview.rows, 'WO-011').outputs.find((o) => o.channelPresetId === 'jasondeal-720x400')!;
  assert.equal(wo011Wide.layoutKey, 'LAYOUT_05');

  // 7) 11번가 3개 -> square+wide-2x1 둘 다 verified, 7개 -> 둘 다 generated(서로 다른 preset)
  const wo012 = byId(preview.rows, 'WO-012');
  assert.ok(wo012.outputs.every((o) => o.status === 'ready'));
  const wo013 = byId(preview.rows, 'WO-013');
  assert.ok(wo013.outputs.every((o) => o.status === 'reviewRequired' && o.layoutSource === 'generated'));

  // 8) 토스: square verified/ready + wide-5x2 verified-only reviewRequired(error 아님) 독립적으로 공존
  const wo014 = byId(preview.rows, 'WO-014');
  const tossSquare = wo014.outputs.find((o) => o.channelPresetId === 'toss-1000x1000')!;
  const tossWide = wo014.outputs.find((o) => o.channelPresetId === 'toss-600x240')!;
  assert.equal(tossSquare.status, 'ready');
  assert.equal(tossSquare.layoutSource, 'verified');
  assert.equal(tossWide.status, 'reviewRequired');
  assert.equal(tossWide.layoutSource, null);
  assert.ok(tossWide.reason && tossWide.reason.includes('verified-only'));
  assert.equal(wo014.overallStatus, 'reviewRequired');

  // 9) 단일규격 채널들의 verified 재사용(square-1x1은 채널 무관)
  assert.equal(byId(preview.rows, 'WO-016').outputs[0].layoutKey, 'LAYOUT_02');
  assert.equal(byId(preview.rows, 'WO-024').outputs[0].layoutKey, 'LAYOUT_02');
  assert.equal(byId(preview.rows, 'WO-026').outputs[0].layoutKey, 'LAYOUT_04');

  // 10) generated fallback 구간 확인 (2~4, 6, 15)
  assert.equal(byId(preview.rows, 'WO-020').outputs[0].arrangementFamily, 'grid-cluster'); // 15개
  assert.equal(byId(preview.rows, 'WO-021').outputs[0].arrangementFamily, 'pyramid-stack'); // 6개
  assert.equal(byId(preview.rows, 'WO-022').outputs[0].arrangementFamily, 'row-linear'); // 2개
  assert.equal(byId(preview.rows, 'WO-023').outputs[0].arrangementFamily, 'diagonal-cascade'); // 4개

  // 11) parser 단계 확정 케이스 (outputs 없음)
  const wo027 = byId(preview.rows, 'WO-027');
  assert.equal(wo027.overallStatus, 'reviewRequired');
  assert.equal(wo027.outputs.length, 0);
  assert.ok(wo027.parserReason && wo027.parserReason.includes('비고'));

  for (const id of ['WO-028', 'WO-029', 'WO-030']) {
    const wo = byId(preview.rows, id);
    assert.equal(wo.overallStatus, 'error');
    assert.equal(wo.outputs.length, 0);
    assert.ok(wo.parserReason);
  }

  console.log('batchStressTest.test.ts: 모든 검증 통과 (30건, output 34개)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
