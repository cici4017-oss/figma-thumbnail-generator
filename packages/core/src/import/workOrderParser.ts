import type { ProductGroupId } from '../domain/product';
import { CHANNELS } from '../data/channels';
import { PRODUCTS } from '../data/products';
import type {
  BatchGenerationRequest,
  RawWorkOrderRow,
  RowStatus,
  WorkOrder,
  WorkOrderIssue,
  WorkOrderIssueCode,
  WorkOrderLine,
} from './types';

const PRODUCT_GROUP_LABELS: Record<string, ProductGroupId> = {
  간편식: 'simple-meal',
  영유아: 'baby-food',
};

const PRODUCT_GROUP_LABEL_BY_ID: Record<ProductGroupId, string> = {
  'simple-meal': '간편식',
  'baby-food': '영유아',
};

const channelIdByLabel = new Map(CHANNELS.map((c) => [c.label, c.id]));
const productByCode = new Map(PRODUCTS.map((p) => [p.code, p]));

/** 이 issue 코드 중 하나라도 있으면 작업ID 전체를 'error'로 취급한다. 그 외는 'reviewRequired'(비고)만 있을 수 있다. */
const ERROR_ISSUE_CODES = new Set<WorkOrderIssueCode>([
  'UNKNOWN_PRODUCT_GROUP',
  'UNKNOWN_CHANNEL',
  'UNKNOWN_PRODUCT_NAME',
  'PRODUCT_CODE_MISSING',
  'PRODUCT_GROUP_MISMATCH',
  'INVALID_QUANTITY',
  'UNKNOWN_BADGE_VALUE',
  'MISSING_SEQ',
  'DUPLICATE_SEQ',
  'MISSING_WORK_ID',
  'INCONSISTENT_PRODUCT_GROUP',
  'INCONSISTENT_CHANNEL',
  'INCONSISTENT_BADGE',
]);

function parseLine(row: RawWorkOrderRow): WorkOrderLine {
  const issues: WorkOrderIssue[] = [];

  const productGroup = PRODUCT_GROUP_LABELS[row.productGroup] ?? null;
  if (!productGroup) {
    issues.push({
      code: 'UNKNOWN_PRODUCT_GROUP',
      rowIndex: row.rowIndex,
      message: `상품군 "${row.productGroup}"을(를) 알 수 없습니다.`,
    });
  }

  const channelId = channelIdByLabel.get(row.channel) ?? null;
  if (!channelId) {
    issues.push({
      code: 'UNKNOWN_CHANNEL',
      rowIndex: row.rowIndex,
      message: `채널 "${row.channel}"을(를) 알 수 없습니다.`,
    });
  }

  if (!row.productName) {
    issues.push({ code: 'UNKNOWN_PRODUCT_NAME', rowIndex: row.rowIndex, message: '상품명이 비어 있습니다.' });
  }

  let productCode: string | null = row.productCode || null;
  if (!productCode) {
    issues.push({
      code: 'PRODUCT_CODE_MISSING',
      rowIndex: row.rowIndex,
      message: `상품명 "${row.productName}"에 대한 상품코드가 비어 있습니다 (상품목록에 없는 상품명이거나 수식이 깨졌을 수 있습니다).`,
    });
  } else if (!productByCode.has(productCode)) {
    issues.push({
      code: 'PRODUCT_CODE_MISSING',
      rowIndex: row.rowIndex,
      message: `상품코드 "${productCode}"가 상품목록에 없습니다.`,
    });
    productCode = null;
  } else if (productGroup) {
    const entry = productByCode.get(productCode)!;
    if (entry.productGroup !== productGroup) {
      issues.push({
        code: 'PRODUCT_GROUP_MISMATCH',
        rowIndex: row.rowIndex,
        message: `상품 "${row.productName}"은(는) ${PRODUCT_GROUP_LABEL_BY_ID[entry.productGroup]} 상품인데, 이 행의 상품군은 "${row.productGroup}"입니다.`,
      });
    }
  }

  if (row.quantity === null || !Number.isInteger(row.quantity) || row.quantity <= 0) {
    issues.push({
      code: 'INVALID_QUANTITY',
      rowIndex: row.rowIndex,
      message: `수량이 유효하지 않습니다 (읽은 값: ${row.quantity ?? '없음'}).`,
    });
  }

  let badge: boolean | null = null;
  const badgeText = (row.badgeRaw ?? '').trim().toUpperCase();
  if (badgeText === 'O') badge = true;
  else if (badgeText === 'X') badge = false;
  else {
    issues.push({
      code: 'UNKNOWN_BADGE_VALUE',
      rowIndex: row.rowIndex,
      message: `딱지여부 값 "${row.badgeRaw ?? ''}"을(를) 해석할 수 없습니다.`,
    });
  }

  if (row.seq === null) {
    issues.push({ code: 'MISSING_SEQ', rowIndex: row.rowIndex, message: '순번이 비어 있습니다.' });
  }

  return {
    rowIndex: row.rowIndex,
    seq: row.seq,
    productGroupLabel: row.productGroup,
    productGroup,
    channelLabel: row.channel,
    channelId,
    productName: row.productName,
    productCode,
    quantity: row.quantity,
    badge,
    note: row.note,
    issues,
  };
}

function buildWorkOrder(rows: RawWorkOrderRow[], lines: WorkOrderLine[]): WorkOrder {
  const groupIssues: WorkOrderIssue[] = [];
  const rawWorkId = rows[0].workId;

  if (!rawWorkId) {
    groupIssues.push({
      code: 'MISSING_WORK_ID',
      message: `작업ID가 비어 있는 행이 있습니다 (행 ${rows.map((r) => r.rowIndex).join(', ')}).`,
    });
  }

  const seqCounts = new Map<number, number>();
  for (const row of rows) {
    if (row.seq !== null) {
      seqCounts.set(row.seq, (seqCounts.get(row.seq) ?? 0) + 1);
    }
  }
  for (const [seq, count] of seqCounts) {
    if (count > 1) {
      groupIssues.push({ code: 'DUPLICATE_SEQ', message: `순번 ${seq}가 이 작업ID 안에서 ${count}번 중복되었습니다.` });
    }
  }

  const productGroups = new Set(
    lines.map((l) => l.productGroup).filter((v): v is ProductGroupId => v !== null),
  );
  if (productGroups.size > 1) {
    groupIssues.push({ code: 'INCONSISTENT_PRODUCT_GROUP', message: '같은 작업ID 안에서 상품군이 서로 다릅니다.' });
  }

  const channelIds = new Set(lines.map((l) => l.channelId).filter((v): v is string => v !== null));
  if (channelIds.size > 1) {
    groupIssues.push({ code: 'INCONSISTENT_CHANNEL', message: '같은 작업ID 안에서 채널이 서로 다릅니다.' });
  }

  const badges = new Set(lines.map((l) => l.badge).filter((v): v is boolean => v !== null));
  if (badges.size > 1) {
    groupIssues.push({ code: 'INCONSISTENT_BADGE', message: '같은 작업ID 안에서 딱지여부가 서로 다릅니다.' });
  }

  const notes = [...new Set(lines.map((l) => l.note).filter((n): n is string => !!n))];
  if (notes.length > 0) {
    groupIssues.push({
      code: 'HAS_NOTE',
      message: `비고가 있습니다: ${notes.join(' / ')} — 자동 생성 전 검토가 필요합니다.`,
    });
  }

  const distinctProductCodes = new Set(lines.map((l) => l.productCode).filter((v): v is string => v !== null));
  const composition: 'single' | 'mixed' = distinctProductCodes.size > 1 ? 'mixed' : 'single';
  const totalQuantity = lines.reduce((sum, l) => sum + (l.quantity ?? 0), 0);

  const allIssues = [...groupIssues, ...lines.flatMap((l) => l.issues)];
  const status: RowStatus = allIssues.some((i) => ERROR_ISSUE_CODES.has(i.code))
    ? 'error'
    : allIssues.length > 0
      ? 'reviewRequired'
      : 'valid';

  return {
    workId: rawWorkId || `(작업ID 없음: 행 ${rows[0].rowIndex})`,
    status,
    issues: allIssues,
    productGroup: productGroups.size === 1 ? [...productGroups][0] : null,
    channelId: channelIds.size === 1 ? [...channelIds][0] : null,
    channelLabel: lines[0]?.channelLabel ?? null,
    badge: badges.size === 1 ? [...badges][0] : null,
    composition,
    totalQuantity,
    note: notes.length > 0 ? notes.join(' / ') : null,
    lines: [...lines].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0)),
  };
}

/** Excel에서 읽은 원시 행들을 작업ID 기준으로 묶고 valid/reviewRequired/error를 판정한다. */
export function parseWorkOrderRows(rows: RawWorkOrderRow[], sourceFileName: string): BatchGenerationRequest {
  const groups = new Map<string, RawWorkOrderRow[]>();
  for (const row of rows) {
    const key = row.workId || `__MISSING_WORK_ID_ROW_${row.rowIndex}`;
    const arr = groups.get(key) ?? [];
    arr.push(row);
    groups.set(key, arr);
  }

  const workOrders = Array.from(groups.values()).map((groupRows) =>
    buildWorkOrder(
      groupRows,
      groupRows.map((r) => parseLine(r)),
    ),
  );

  return {
    sourceFileName,
    parsedAt: new Date().toISOString(),
    workOrders,
    summary: {
      totalWorkOrders: workOrders.length,
      valid: workOrders.filter((w) => w.status === 'valid').length,
      reviewRequired: workOrders.filter((w) => w.status === 'reviewRequired').length,
      error: workOrders.filter((w) => w.status === 'error').length,
    },
  };
}
