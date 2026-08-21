import ExcelJS from 'exceljs';
import type { RawWorkOrderRow } from './types';

const COLUMN_HEADERS = {
  workId: '작업ID',
  seq: '순번',
  productGroup: '상품군',
  channel: '채널',
  productName: '상품명',
  productCode: '상품코드(자동입력)',
  quantity: '수량',
  badge: '딱지여부',
  note: '비고',
} as const;

type ColumnKey = keyof typeof COLUMN_HEADERS;

function toRawValue(value: ExcelJS.CellValue): string | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' || typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if ('richText' in value) return value.richText.map((t) => t.text).join('');
    if ('result' in value) {
      const result = (value as ExcelJS.CellFormulaValue).result;
      return typeof result === 'number' || typeof result === 'string' ? result : null;
    }
    if ('text' in value) return String((value as { text: unknown }).text);
  }
  return String(value);
}

function toNumberOrNull(value: ExcelJS.CellValue): number | null {
  const raw = toRawValue(value);
  if (raw === null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function findHeaderColumns(worksheet: ExcelJS.Worksheet): Record<ColumnKey, number> {
  const headerRow = worksheet.getRow(1);
  const found: Partial<Record<ColumnKey, number>> = {};

  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const raw = toRawValue(cell.value);
    const label = raw === null ? '' : String(raw).trim();
    for (const [key, headerLabel] of Object.entries(COLUMN_HEADERS) as [ColumnKey, string][]) {
      if (label === headerLabel) found[key] = colNumber;
    }
  });

  const missing = (Object.keys(COLUMN_HEADERS) as ColumnKey[]).filter((k) => found[k] === undefined);
  if (missing.length > 0) {
    throw new Error(`헤더에서 다음 컬럼을 찾지 못했습니다: ${missing.map((k) => COLUMN_HEADERS[k]).join(', ')}`);
  }
  return found as Record<ColumnKey, number>;
}

/**
 * 표준 요청서(01_작업요청)를 읽어 RawWorkOrderRow[]로 만든다.
 * 이 템플릿은 병합 셀을 쓰지 않으므로, 레거시 리더에 있던 merge 상속 로직이 필요 없다 —
 * 셀 값을 그대로 읽으면 된다.
 */
export async function readWorkOrderSheet(
  fileBytes: ArrayBuffer,
  sheetName = '01_작업요청',
): Promise<RawWorkOrderRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBytes);

  const worksheet = workbook.getWorksheet(sheetName);
  if (!worksheet) {
    throw new Error(`시트 "${sheetName}"를 찾을 수 없습니다.`);
  }

  const col = findHeaderColumns(worksheet);

  const rows: RawWorkOrderRow[] = [];
  for (let r = 2; r <= worksheet.rowCount; r++) {
    const workId = toRawValue(worksheet.getCell(r, col.workId).value);
    const productName = toRawValue(worksheet.getCell(r, col.productName).value);
    const productCode = toRawValue(worksheet.getCell(r, col.productCode).value);
    const note = toRawValue(worksheet.getCell(r, col.note).value);

    const isBlankRow =
      (workId === null || workId === '') &&
      (productName === null || productName === '') &&
      (productCode === null || productCode === '') &&
      (note === null || note === '');
    if (isBlankRow) continue;

    rows.push({
      rowIndex: r,
      workId: String(workId ?? '').trim(),
      seq: toNumberOrNull(worksheet.getCell(r, col.seq).value),
      productGroup: String(toRawValue(worksheet.getCell(r, col.productGroup).value) ?? '').trim(),
      channel: String(toRawValue(worksheet.getCell(r, col.channel).value) ?? '').trim(),
      productName: String(productName ?? '').trim(),
      productCode: String(productCode ?? '').trim(),
      quantity: toNumberOrNull(worksheet.getCell(r, col.quantity).value),
      badgeRaw: (toRawValue(worksheet.getCell(r, col.badge).value) as string | null) ?? null,
      note: note === null || note === '' ? null : String(note).trim(),
    });
  }

  return rows;
}
