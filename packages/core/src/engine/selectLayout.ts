import type { AspectRatioFamily } from '../domain/channel';
import type { ProductGroupId } from '../domain/product';
import type { ThumbnailType } from '../domain/thumbnailType';
import { type LayoutDefinition, getGiftSlotCount, getSaleSlotCount } from '../domain/layout';

export interface LayoutSelectionCriteria {
  productGroup: ProductGroupId;
  composition: 'single' | 'mixed';
  /** 판매수량 합 (sum of items.quantity) */
  totalQuantity: number;
  /** 증정품 수량 합. 없으면 0. */
  giftQuantity: number;
  channelId: string;
  aspectRatioFamily: AspectRatioFamily;
  thumbnailType: ThumbnailType;
}

export type SelectLayoutFailureReason =
  /** sale/gift 슬롯 수가 정확히 일치하는 Layout 자체가 없음 (fallback 없음) */
  | 'NO_LAYOUT_WITH_MATCHING_SLOT_COUNT'
  /** 슬롯 수는 맞지만 productGroup/구성/aspectRatio/채널 조건을 만족하는 Layout이 없음 */
  | 'NO_MATCHING_LAYOUT'
  /** priority가 동점이라 결정할 수 없음 */
  | 'AMBIGUOUS_LAYOUT_MATCH';

export type SelectLayoutResult =
  | { ok: true; layout: LayoutDefinition }
  | {
      ok: false;
      reason: SelectLayoutFailureReason;
      message: string;
      candidates?: string[];
      criteria: LayoutSelectionCriteria;
    };

export function selectLayout(
  criteria: LayoutSelectionCriteria,
  layouts: LayoutDefinition[],
): SelectLayoutResult {
  const slotCountMatches = layouts.filter(
    (l) =>
      getSaleSlotCount(l) === criteria.totalQuantity &&
      getGiftSlotCount(l) === criteria.giftQuantity,
  );

  if (slotCountMatches.length === 0) {
    return {
      ok: false,
      reason: 'NO_LAYOUT_WITH_MATCHING_SLOT_COUNT',
      message:
        `판매수량 ${criteria.totalQuantity}개` +
        (criteria.giftQuantity > 0 ? ` + 증정 ${criteria.giftQuantity}개` : '') +
        `와 슬롯 수가 정확히 일치하는 Layout이 없습니다. (축소·생략·순환배치 등의 대체 처리는 하지 않습니다)`,
      criteria,
    };
  }

  const criteriaMatches = slotCountMatches.filter((l) => {
    const m = l.match;
    if (m.productGroups && !m.productGroups.includes(criteria.productGroup)) return false;
    if (m.compositions && !m.compositions.includes(criteria.composition)) return false;
    if (m.aspectRatioFamilies && !m.aspectRatioFamilies.includes(criteria.aspectRatioFamily)) return false;
    if (m.channelIds && !m.channelIds.includes(criteria.channelId)) return false;
    if (m.thumbnailTypes && !m.thumbnailTypes.includes(criteria.thumbnailType)) return false;
    return true;
  });

  if (criteriaMatches.length === 0) {
    return {
      ok: false,
      reason: 'NO_MATCHING_LAYOUT',
      message: '슬롯 수는 일치하지만 productGroup/구성/aspectRatio/채널/썸네일유형 조건을 만족하는 Layout이 없습니다.',
      criteria,
    };
  }

  const maxPriority = Math.max(...criteriaMatches.map((l) => l.priority));
  const topLayouts = criteriaMatches.filter((l) => l.priority === maxPriority);

  if (topLayouts.length > 1) {
    return {
      ok: false,
      reason: 'AMBIGUOUS_LAYOUT_MATCH',
      message: `동일한 우선순위(${maxPriority})를 가진 Layout이 여러 개 있어 자동으로 결정할 수 없습니다.`,
      candidates: topLayouts.map((l) => l.layoutKey),
      criteria,
    };
  }

  return { ok: true, layout: topLayouts[0] };
}
