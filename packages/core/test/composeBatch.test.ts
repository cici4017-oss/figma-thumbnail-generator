import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {
  readWorkOrderSheet,
  parseWorkOrderRows,
  composeBatchPreview,
  type BatchPreviewRow,
} from '../src/import/index';

/**
 * Excel batch validation -> 작업ID별 그룹화 -> Product 조회 -> GenerationRequest 변환
 * -> composePlan -> verified/generated/reviewRequired/error 판정까지 end-to-end로 검증한다.
 * 실제 확인된 상품코드 3개(SIMPLE_BEEF_JANGJORIM_130/SIMPLE_QUAIL_JANGJORIM_180/
 * SIMPLE_CHIVE_KKOMAK_240)만 사용하고, 회사 Figma 렌더링은 연결하지 않는다(mock 기반).
 */
async function buildSampleWorkbook(): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('01_작업요청');
  ws.addRow(['작업ID', '순번', '상품군', '채널', '상품명', '상품코드(자동입력)', '수량', '딱지여부', '비고']);

  // 1) 단일 상품 verified 케이스: 소고기장조림×3 -> LAYOUT_02(3슬롯, 검증된 Layout)와 정확히 일치
  ws.addRow(['WO-P1', 1, '간편식', '네이버', '소고기장조림', 'SIMPLE_BEEF_JANGJORIM_130', 3, 'X', '']);

  // 2) A×2 + B×3 + C×4 혼합 generated 케이스: 검증된 9슬롯 Layout이 없어 family 공식으로 fallback되어야 함
  ws.addRow(['WO-P2', 1, '간편식', '네이버', '소고기장조림', 'SIMPLE_BEEF_JANGJORIM_130', 2, 'O', '']);
  ws.addRow(['WO-P2', 2, '간편식', '네이버', '메추리알 장조림', 'SIMPLE_QUAIL_JANGJORIM_180', 3, 'O', '']);
  ws.addRow(['WO-P2', 3, '간편식', '네이버', '부추 꼬막무침', 'SIMPLE_CHIVE_KKOMAK_240', 4, 'O', '']);

  // 3) 비고가 있는 reviewRequired 케이스: parser 단계에서 이미 HAS_NOTE로 확정 -> composePlan 시도 안 함
  ws.addRow(['WO-P3', 1, '간편식', '네이버', '메추리알 장조림', 'SIMPLE_QUAIL_JANGJORIM_180', 1, 'X', '라이프스타일 연출컷 요청']);

  // 4) 잘못된 수량 error 케이스
  ws.addRow(['WO-P4', 1, '간편식', '네이버', '부추 꼬막무침', 'SIMPLE_CHIVE_KKOMAK_240', 0, 'X', '']);

  // 4') 잘못된 상품코드(상품목록에 없는 상품명) error 케이스
  ws.addRow(['WO-P5', 1, '간편식', '네이버', '없는상품', '', 1, 'X', '']);

  // 5) 복수 규격 채널(카카오) fan-out 케이스: 작업ID 1개가 채널에 등록된 preset 수(2개)만큼
  //    output으로 fan-out되어야 함. 수량 10은 square(LAYOUT_04)는 verified가 있지만
  //    wide-16x9는 아직 10슬롯 verified가 없어 generated로 갈리므로, 사용자 예시(한 output만
  //    generated)를 그대로 재현한다.
  ws.addRow(['WO-P6', 1, '간편식', '카카오', '소고기장조림', 'SIMPLE_BEEF_JANGJORIM_130', 10, 'X', '']);

  return wb.xlsx.writeBuffer() as unknown as Promise<ArrayBuffer>;
}

function byId(rows: BatchPreviewRow[], workId: string): BatchPreviewRow {
  const found = rows.find((r) => r.workId === workId);
  assert.ok(found, `작업ID "${workId}"를 찾지 못했습니다.`);
  return found;
}

async function main() {
  const buffer = await buildSampleWorkbook();
  const rawRows = await readWorkOrderSheet(buffer);
  const batch = parseWorkOrderRows(rawRows, 'test.xlsx');
  const preview = composeBatchPreview(batch);

  assert.equal(preview.rows.length, 6);
  // workOrder(작업ID) 단위 집계와 output(fan-out 이후 실제 생성될 썸네일) 단위 집계는 다르다.
  // WO-P6(카카오)가 output 2개(square ready + wide reviewRequired)로 갈리기 때문에
  // totalOutputs(4)가 totalWorkOrders(6)와 일치하지 않고, 집계 결과도 서로 다르다.
  assert.deepEqual(preview.summary, {
    totalWorkOrders: 6,
    totalOutputs: 4,
    workOrderStatusSummary: { ready: 1, reviewRequired: 3, error: 2 },
    outputStatusSummary: { ready: 2, reviewRequired: 2, error: 0 },
  });

  // 1) 단일 상품 verified -> 네이버는 preset 1개뿐이므로 output도 1개
  const p1 = byId(preview.rows, 'WO-P1');
  assert.equal(p1.overallStatus, 'ready');
  assert.equal(p1.parserReason, null);
  assert.equal(p1.outputs.length, 1);
  assert.equal(p1.outputs[0].channelPresetId, 'naver-1000x1000');
  assert.equal(p1.outputs[0].status, 'ready');
  assert.equal(p1.outputs[0].layoutKey, 'LAYOUT_02');
  assert.equal(p1.outputs[0].arrangementFamily, 'triple-cascade');
  assert.equal(p1.outputs[0].layoutSource, 'verified');
  assert.equal(p1.totalQuantity, 3);
  assert.equal(p1.outputs[0].reason, null);

  // 2) A×2+B×3+C×4 혼합 -> generated fallback (pyramid-stack family, 9슬롯), reviewRequired
  const p2 = byId(preview.rows, 'WO-P2');
  assert.equal(p2.overallStatus, 'reviewRequired');
  assert.equal(p2.outputs.length, 1);
  assert.equal(p2.outputs[0].layoutKey, 'GENERATED_PYRAMID-STACK_9');
  assert.equal(p2.outputs[0].arrangementFamily, 'pyramid-stack');
  assert.equal(p2.outputs[0].layoutSource, 'generated');
  assert.equal(p2.totalQuantity, 9);
  assert.ok(p2.outputs[0].reason && p2.outputs[0].reason.includes('자동 생성'));

  // 3) 비고 -> reviewRequired (parser 단계 확정, fan-out/생성 시도 안 함 -> outputs 없음)
  const p3 = byId(preview.rows, 'WO-P3');
  assert.equal(p3.overallStatus, 'reviewRequired');
  assert.equal(p3.outputs.length, 0);
  assert.ok(p3.parserReason && p3.parserReason.includes('비고'));

  // 4) 잘못된 수량 -> error (parser 단계 확정, outputs 없음)
  const p4 = byId(preview.rows, 'WO-P4');
  assert.equal(p4.overallStatus, 'error');
  assert.equal(p4.outputs.length, 0);
  assert.ok(p4.parserReason && p4.parserReason.includes('수량'));

  // 4') 잘못된 상품코드(미등록 상품명) -> error
  const p5 = byId(preview.rows, 'WO-P5');
  assert.equal(p5.overallStatus, 'error');
  assert.equal(p5.outputs.length, 0);
  assert.ok(p5.parserReason && p5.parserReason.includes('상품코드'));

  // 5) 복수 규격 채널(카카오) fan-out -> output 2개(square/wide), 사용자가 준 예시와 동일한 패턴:
  //    수량 10 기준 square(1000x1000)는 LAYOUT_04(채널 무관, geometryFamily square-1x1
  //    재사용)로 verified/ready, wide(750x422, wide-16x9)는 10슬롯 verified가 아직 없어
  //    generated/reviewRequired — 한쪽이 generated라고 다른 쪽까지 reviewRequired로
  //    끌어내리지 않는다(#7).
  const p6 = byId(preview.rows, 'WO-P6');
  assert.equal(p6.channelLabel, '카카오');
  assert.equal(p6.outputs.length, 2);
  const byPreset = new Map(p6.outputs.map((o) => [o.channelPresetId, o]));
  const kakaoSquare = byPreset.get('kakao-1000x1000');
  const kakaoWide = byPreset.get('kakao-750x422');
  assert.ok(kakaoSquare && kakaoWide);
  assert.equal(kakaoSquare!.aspectRatioFamily, 'square');
  assert.equal(kakaoWide!.aspectRatioFamily, 'wide');
  assert.equal(kakaoSquare!.status, 'ready');
  assert.equal(kakaoSquare!.layoutSource, 'verified');
  assert.equal(kakaoSquare!.layoutKey, 'LAYOUT_04');
  assert.equal(kakaoWide!.status, 'reviewRequired');
  assert.equal(kakaoWide!.layoutSource, 'generated');
  // 작업ID 요약 상태는 outputs 중 최악의 상태(reviewRequired)를 따르지만, 이는 필터용
  // 요약일 뿐 square output 자체의 status('ready')는 그대로 유지된다.
  assert.equal(p6.overallStatus, 'reviewRequired');

  console.log('composeBatch.test.ts: 모든 검증 통과');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
