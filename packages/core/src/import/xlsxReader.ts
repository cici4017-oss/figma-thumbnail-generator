import ExcelJS from 'exceljs';
import type { RawWorkOrderRow } from './types';

const COLUMN_HEADERS = {
  channel: '구분',
  productName: '상품명',
  optionName: '옵션명',
  regularPrice: '정상가',
  eventPrice: '행사가',
  badge: '딱지여부',
  note: '비고',
} as const;

type ColumnKey = keyof typeof COLUMN_HEADERS;

function toRawValue(value: ExcelJS.CellValue): string | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' || typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if ('richText' in value) {
      return value.richText.map((r) => r.text).join('');
    }
    if ('result' in value) {
      const result = (value as ExcelJS.CellFormulaValue).result;
      return typeof result === 'number' || typeof result === 'string' ? result : null;
    }
    if ('text' in value) {
      return String((value as { text: unknown }).text);
    }
  }
  return String(value);
}

/**
 * 셀이 병합의 일부라면 exceljs의 cell.master(병합 좌상단 셀)를 그대로 사용해 값을 상속한다.
 * "빈 칸 = 직전 값 상속" 휴리스틱을 쓰지 않는다 — 진짜 병합인 경우에만 상속하므로
 * 실제 입력 누락(진짜 빈 셀)과 병합 셀을 구분할 수 있다.
 */
function resolvedValue(worksheet: ExcelJS.Worksheet, row: number, col: number): string | number | null {
  const cell = worksheet.getCell(row, col);
  const source = cell.isMerged ? cell.master : cell;
  return toRawValue(source.value);
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
 * 표준 작업지시 Excel(.xlsx) 바이트를 읽어 RawWorkOrderRow[]로 만든다.
 * 기존 엑셀 양식을 바꾸도록 요구하지 않는다 — 헤더(구분/상품명/옵션명/정상가/행사가/딱지여부/비고)
 * 이름으로 컬럼을 찾고, 실제 merge range 정보(cell.isMerged/cell.master)로만 병합 셀을 상속한다.
 */
export async function readWorkOrderSheet(
  fileBytes: ArrayBuffer,
  sheetName?: string,
): Promise<RawWorkOrderRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBytes);

  const worksheet = sheetName ? workbook.getWorksheet(sheetName) : workbook.worksheets[0];
  if (!worksheet) {
    throw new Error(sheetName ? `시트 "${sheetName}"를 찾을 수 없습니다.` : '워크시트를 찾을 수 없습니다.');
  }

  const col = findHeaderColumns(worksheet);

  const rows: RawWorkOrderRow[] = [];
  for (let r = 2; r <= worksheet.rowCount; r++) {
    const channelLabel = resolvedValue(worksheet, r, col.channel);
    const productNameRaw = resolvedValue(worksheet, r, col.productName);

    const isBlankRow =
      (channelLabel === null || channelLabel === '') && (productNameRaw === null || productNameRaw === '');
    if (isBlankRow) continue;

    rows.push({
      rowIndex: r, // exceljs는 1-based이므로 엑셀 화면과 그대로 일치
      channelLabel: String(channelLabel ?? '').trim(),
      productNameRaw: String(productNameRaw ?? '').trim(),
      optionNameRaw: String(resolvedValue(worksheet, r, col.optionName) ?? '').trim(),
      regularPriceRaw: resolvedValue(worksheet, r, col.regularPrice),
      eventPriceRaw: resolvedValue(worksheet, r, col.eventPrice),
      badgeRaw: resolvedValue(worksheet, r, col.badge) as string | null,
      noteRaw: resolvedValue(worksheet, r, col.note) as string | null,
    });
  }

  return rows;
}
