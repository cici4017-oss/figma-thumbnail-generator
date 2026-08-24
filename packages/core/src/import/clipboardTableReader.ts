import type { ProductRegistryEntry } from '../data/products';
import { PRODUCTS } from '../data/products';
import type { RawWorkOrderRow } from './types';

/**
 * Excel에서 Ctrl+C한 표(탭으로 열 구분, 줄바꿈으로 행 구분되는 clipboard TSV)를
 * xlsxReader.ts의 readWorkOrderSheet()와 동일한 산출물(RawWorkOrderRow[])로 바꾼다.
 * 이렇게 만들어 놓으면 이후 파이프라인(parseWorkOrderRows -> composeBatchPreview ->
 * composeChannelOutputs -> preflight -> batchRenderer)은 입력이 xlsx 파일이었는지
 * clipboard 붙여넣기였는지 전혀 몰라도 된다 — 전부 그대로 재사용된다.
 *
 * 표준 작업요청(01_작업요청)과 달리, 여기서 지원하는 컬럼은 사람이 직접 입력하는
 * 8개뿐이다: 작업ID/순번/상품군/채널/상품명/수량/딱지여부/비고. "상품코드(자동입력)"는
 * Excel에서는 INDEX/MATCH 수식이 채우지만, 여기서는 상품명으로 PRODUCTS(같은 소스)에서
 * 직접 조회해 동일하게 채운다 — 못 찾으면 빈 문자열로 남겨 Excel의 IFERROR(...,"")와
 * 동일하게 동작한다(기존 workOrderParser.ts의 PRODUCT_CODE_MISSING 처리로 자연스럽게 이어짐).
 *
 * ExcelJS를 전혀 쓰지 않는 순수 문자열 파서다 — code.ts 등 다른 소비자의 번들 크기에
 * 영향을 주지 않는다.
 */

const CLIPBOARD_COLUMNS = [
  'workId',
  'seq',
  'productGroup',
  'channel',
  'productName',
  'quantity',
  'badge',
  'note',
] as const;

type ClipboardColumnKey = (typeof CLIPBOARD_COLUMNS)[number];

/** 표준 작업요청 시트의 헤더 라벨과 동일하게 맞춰서, 헤더 유무를 사람이 보는 그대로 인식한다. */
const HEADER_LABELS: Record<ClipboardColumnKey, string> = {
  workId: '작업ID',
  seq: '순번',
  productGroup: '상품군',
  channel: '채널',
  productName: '상품명',
  quantity: '수량',
  badge: '딱지여부',
  note: '비고',
};

/** 헤더가 없을 때 쓰는 표준 컬럼 순서(작업요청 시트의 A~I 중 상품코드(F열)를 뺀 순서). */
const DEFAULT_COLUMN_ORDER: Record<ClipboardColumnKey, number> = {
  workId: 0,
  seq: 1,
  productGroup: 2,
  channel: 3,
  productName: 4,
  quantity: 5,
  badge: 6,
  note: 7,
};

/**
 * 헤더 붙여넣기에 "상품코드" 열이 섞여 있으면(예: 표준 작업요청 시트를 그대로 복사) 상품명
 * 대신 이 값을 우선 사용한다 — 상품명이 실제 등록된 이름과 공백/표기가 미세하게 달라도
 * (예: 셀 안 줄바꿈, 연속 공백) 상품코드가 있으면 정확히 매칭된다. 헤더가 없는(표준 컬럼 순서)
 * 붙여넣기에는 애초에 상품코드 열이 없으므로 여기서는 다루지 않는다.
 */
const PRODUCT_CODE_HEADER_LABEL = '상품코드';

/** 상품명 매칭은 trim + 연속 공백(줄바꿈 포함) 정규화만 허용한다 — 임의 fuzzy match는 하지 않는다. */
function normalizeProductName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function splitClipboardText(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();
  return lines.map((line) => line.split('\t'));
}

interface DetectedHeader {
  columns: Record<ClipboardColumnKey, number>;
  /** "상품코드" 헤더가 있으면 그 열 인덱스, 없으면 null(=상품명으로만 매칭). */
  productCodeColumn: number | null;
}

/**
 * 첫 행에 8개 헤더 라벨이 전부(순서 무관, 다른 열이 섞여 있어도 무방) 있으면 그 위치로
 * 컬럼을 매칭한다. 하나라도 없으면 헤더가 없는 것으로 보고 표준 순서를 쓴다. "상품코드" 열은
 * 8개에 포함되지 않는 선택 열이라 hasAll 판정과 무관하게 별도로 찾는다.
 */
function detectHeaderColumns(firstRow: string[]): DetectedHeader | null {
  const found: Partial<Record<ClipboardColumnKey, number>> = {};
  let productCodeColumn: number | null = null;
  firstRow.forEach((cell, i) => {
    const trimmed = cell.trim();
    for (const key of CLIPBOARD_COLUMNS) {
      if (trimmed === HEADER_LABELS[key]) found[key] = i;
    }
    if (trimmed === PRODUCT_CODE_HEADER_LABEL) productCodeColumn = i;
  });
  const hasAll = CLIPBOARD_COLUMNS.every((k) => found[k] !== undefined);
  return hasAll ? { columns: found as Record<ClipboardColumnKey, number>, productCodeColumn } : null;
}

function toNumberOrNull(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/**
 * text: 클립보드에서 그대로 읽은 문자열(Excel 표를 복사하면 탭/개행으로 구성된 TSV).
 * products: 상품명 -> 상품코드 조회에 쓸 상품 목록. 생략하면 현재 등록된 실제 Product
 *           Registry(PRODUCTS)를 그대로 쓴다 — 별도 목록을 만들지 않는다.
 */
export function parseClipboardTable(
  text: string,
  products: ProductRegistryEntry[] = PRODUCTS,
): RawWorkOrderRow[] {
  const grid = splitClipboardText(text);
  if (grid.length === 0) return [];

  const header = detectHeaderColumns(grid[0]);
  const columns = header?.columns ?? DEFAULT_COLUMN_ORDER;
  const productCodeColumn = header?.productCodeColumn ?? null;
  const dataRows = header ? grid.slice(1) : grid;
  const headerRowOffset = header ? 2 : 1; // 헤더가 있으면 헤더가 1행, 데이터는 2행부터

  const codeSet = new Set(products.map((p) => p.code));
  const nameToCode = new Map(products.map((p) => [normalizeProductName(p.name), p.code]));

  const rows: RawWorkOrderRow[] = [];
  dataRows.forEach((cells, i) => {
    if (cells.every((c) => c.trim() === '')) return; // 완전히 빈 행은 스킵

    const get = (key: ClipboardColumnKey) => (cells[columns[key]] ?? '').trim();
    const productName = get('productName');
    const note = get('note');

    // 우선순위: 1) 상품코드 열 값이 있고 PRODUCTS에 실제 존재 -> 그대로 사용
    //          2) 없거나 미등록이면 상품명(trim/연속 공백 정규화)으로 PRODUCTS 매칭
    //          3) 둘 다 실패하면 빈 문자열(기존 PRODUCT_CODE_MISSING으로 자연스럽게 이어짐)
    const rawProductCode = productCodeColumn !== null ? (cells[productCodeColumn] ?? '').trim() : '';
    const productCode =
      rawProductCode && codeSet.has(rawProductCode)
        ? rawProductCode
        : (nameToCode.get(normalizeProductName(productName)) ?? '');

    rows.push({
      rowIndex: i + headerRowOffset,
      workId: get('workId'),
      seq: toNumberOrNull(get('seq')),
      productGroup: get('productGroup'),
      channel: get('channel'),
      productName,
      productCode,
      quantity: toNumberOrNull(get('quantity')),
      badgeRaw: get('badge') || null,
      note: note === '' ? null : note,
    });
  });

  return rows;
}
