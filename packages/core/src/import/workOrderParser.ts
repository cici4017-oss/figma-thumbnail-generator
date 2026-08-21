import type {
  BatchGenerationRequest,
  RawWorkOrderRow,
  RowStatus,
  WorkOrderIssue,
  WorkOrderLine,
} from './types';
import { resolveChannelLabel } from './channelResolver';
import { parseProductName } from './productParser';
import { resolveQuantity } from './quantityParser';
import { resolveNotePreset } from './notePresets';
import { resolveProduct, type ProductRegistryEntry } from './productRegistry';

/** 이 issue 코드 중 하나라도 있으면 구조적으로 요청을 만들 수 없다고 보고 'error'로 취급한다. */
const ERROR_ISSUE_CODES = new Set<WorkOrderIssue['code']>([
  'AMBIGUOUS_CHANNEL_LABEL',
  'PRODUCT_NAME_UNPARSEABLE',
  'PRODUCT_NOT_MATCHED',
  'PRODUCT_MATCHED_MULTIPLE',
  'QUANTITY_UNRESOLVED',
  'UNKNOWN_BADGE_VALUE',
  'INVALID_PRICE',
]);

function statusFrom(issues: WorkOrderIssue[]): RowStatus {
  if (issues.some((i) => ERROR_ISSUE_CODES.has(i.code))) return 'error';
  if (issues.length > 0) return 'reviewRequired';
  return 'valid';
}

function parsePrice(raw: string | number | null): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  const cleaned = raw.replace(/[,\s]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function resolveBadge(raw: string | null): { value: boolean | null; issue?: WorkOrderIssue } {
  const t = (raw ?? '').trim();
  if (t === '') return { value: false };
  if (t.toUpperCase() === 'O') return { value: true };
  if (t.toUpperCase() === 'X') return { value: false };
  return {
    value: null,
    issue: { code: 'UNKNOWN_BADGE_VALUE', message: `딱지여부 값 "${raw}"을(를) 해석할 수 없습니다.` },
  };
}

export function parseWorkOrderRow(row: RawWorkOrderRow, registry: ProductRegistryEntry[]): WorkOrderLine {
  const issues: WorkOrderIssue[] = [];

  const targets = resolveChannelLabel(row.channelLabel);
  if (targets.length === 0) {
    issues.push({
      code: 'AMBIGUOUS_CHANNEL_LABEL',
      message: `채널 라벨 "${row.channelLabel}"이(가) CHANNEL_LABEL_MAP에 등록되어 있지 않습니다.`,
    });
  }

  const product = parseProductName(row.productNameRaw);
  if (!product.name || !product.capacity) {
    issues.push({
      code: 'PRODUCT_NAME_UNPARSEABLE',
      message: `상품명 "${row.productNameRaw}"에서 이름/용량을 추출하지 못했습니다.`,
    });
  }

  const productMatch = resolveProduct(product, registry);
  if (product.name && product.capacity) {
    if (productMatch.matchedCount === 0) {
      issues.push({
        code: 'PRODUCT_NOT_MATCHED',
        message: `Product Registry에서 "${product.normalizedLabel}"과(와) 일치하는 상품을 찾지 못했습니다.`,
      });
    } else if (productMatch.matchedCount > 1) {
      issues.push({
        code: 'PRODUCT_MATCHED_MULTIPLE',
        message: `Product Registry에서 "${product.normalizedLabel}"이(가) ${productMatch.matchedCount}개 상품과 동시에 매칭됩니다.`,
      });
    }
  }

  const quantity = resolveQuantity(product.quantities, row.optionNameRaw);
  if (quantity.value === null) {
    issues.push({
      code: 'QUANTITY_UNRESOLVED',
      message: `상품명/옵션명에서 최종 수량을 확정하지 못했습니다. (상품명 후보: [${product.quantities.join(', ')}], 옵션명: "${row.optionNameRaw}")`,
    });
  }

  const badge = resolveBadge(row.badgeRaw);
  if (badge.issue) issues.push(badge.issue);

  const noteRaw = (row.noteRaw ?? '').trim();
  const notePresetCode = noteRaw ? resolveNotePreset(noteRaw) : null;
  if (noteRaw) {
    issues.push({
      code: 'HAS_NOTE',
      message: notePresetCode
        ? `비고 "${noteRaw}" (등록된 프리셋: ${notePresetCode}) — V1에서는 등록 여부와 무관하게 검토가 필요합니다.`
        : `비고 "${noteRaw}" — 처음 보는 값이라 자동 해석하지 않고 검토가 필요합니다.`,
    });
  }

  const regular = parsePrice(row.regularPriceRaw);
  const event = parsePrice(row.eventPriceRaw);
  const regularWasProvided = row.regularPriceRaw !== null && row.regularPriceRaw !== '';
  const eventWasProvided = row.eventPriceRaw !== null && row.eventPriceRaw !== '';
  if ((regularWasProvided && regular === null) || (eventWasProvided && event === null)) {
    issues.push({ code: 'INVALID_PRICE', message: '정상가/행사가 값을 숫자로 해석하지 못했습니다.' });
  }

  return {
    rowIndex: row.rowIndex,
    status: statusFrom(issues),
    issues,
    channel: { label: row.channelLabel, targets },
    product,
    productMatch,
    option: { raw: row.optionNameRaw, isOverride: quantity.isOverride },
    quantity: { value: quantity.value, source: quantity.source },
    badge: badge.value,
    price: { regular, event },
    note: { raw: noteRaw || null, presetCode: notePresetCode },
  };
}

export function parseWorkOrderRows(
  rows: RawWorkOrderRow[],
  registry: ProductRegistryEntry[],
  sourceFileName: string,
): BatchGenerationRequest {
  const lines = rows.map((row) => parseWorkOrderRow(row, registry));

  const byChannel: Record<string, number> = {};
  for (const line of lines) {
    for (const target of line.channel.targets) {
      const key = target.variantId ? `${target.channelId}:${target.variantId}` : target.channelId;
      byChannel[key] = (byChannel[key] ?? 0) + 1;
    }
  }

  return {
    sourceFileName,
    parsedAt: new Date().toISOString(),
    lines,
    summary: {
      total: lines.length,
      valid: lines.filter((l) => l.status === 'valid').length,
      reviewRequired: lines.filter((l) => l.status === 'reviewRequired').length,
      error: lines.filter((l) => l.status === 'error').length,
      byChannel,
    },
  };
}
