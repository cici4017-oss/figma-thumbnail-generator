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

  assert.equal(preview.rows.length, 5);
  assert.deepEqual(preview.summary, { total: 5, ready: 1, reviewRequired: 2, error: 2 });

  // 1) 단일 상품 verified
  const p1 = byId(preview.rows, 'WO-P1');
  assert.equal(p1.status, 'ready');
  assert.equal(p1.layoutKey, 'LAYOUT_02');
  assert.equal(p1.arrangementFamily, 'triple-cascade');
  assert.equal(p1.layoutSource, 'verified');
  assert.equal(p1.totalQuantity, 3);
  assert.equal(p1.reason, null);

  // 2) A×2+B×3+C×4 혼합 -> generated fallback (pyramid-stack family, 9슬롯), reviewRequired
  const p2 = byId(preview.rows, 'WO-P2');
  assert.equal(p2.status, 'reviewRequired');
  assert.equal(p2.layoutKey, 'GENERATED_PYRAMID-STACK_9');
  assert.equal(p2.arrangementFamily, 'pyramid-stack');
  assert.equal(p2.layoutSource, 'generated');
  assert.equal(p2.totalQuantity, 9);
  assert.ok(p2.reason && p2.reason.includes('자동 생성'));

  // 3) 비고 -> reviewRequired (parser 단계 확정, 임의 생성 시도 안 함)
  const p3 = byId(preview.rows, 'WO-P3');
  assert.equal(p3.status, 'reviewRequired');
  assert.equal(p3.layoutKey, null);
  assert.equal(p3.layoutSource, null);
  assert.ok(p3.reason && p3.reason.includes('비고'));

  // 4) 잘못된 수량 -> error
  const p4 = byId(preview.rows, 'WO-P4');
  assert.equal(p4.status, 'error');
  assert.equal(p4.layoutKey, null);
  assert.ok(p4.reason && p4.reason.includes('수량'));

  // 4') 잘못된 상품코드(미등록 상품명) -> error
  const p5 = byId(preview.rows, 'WO-P5');
  assert.equal(p5.status, 'error');
  assert.equal(p5.layoutKey, null);
  assert.ok(p5.reason && p5.reason.includes('상품코드'));

  console.log('composeBatch.test.ts: 모든 검증 통과');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
