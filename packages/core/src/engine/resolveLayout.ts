import type { LayoutDefinition } from '../domain/layout';
import { selectLayout, type LayoutSelectionCriteria } from './selectLayout';
import {
  generateFallbackLayout,
  type GenerateFallbackLayoutFailureReason,
} from './generateFallbackLayout';

/**
 * "검증된(verified) Layout 중에서 고른다"(selectLayout)와 "검증된 게 없을 때 family 공식으로
 * 만든다"(generateFallbackLayout)를 조율하는 오케스트레이터. fallback 시도 여부를 정하는
 * 정책 자체가 여기 있고, selectLayout/generateFallbackLayout 각각에는 이 정책이 스며들지
 * 않는다.
 *
 * 정책:
 * - fallback은 "검증된 Layout이 아예 없어서" 실패한 경우에만 시도한다
 *   (NO_LAYOUT_WITH_MATCHING_SLOT_COUNT / NO_MATCHING_LAYOUT). AMBIGUOUS_LAYOUT_MATCH는
 *   "후보가 여러 개라 결정 못함"이지 "없음"이 아니므로 절대 fallback하지 않고 error로 전파한다.
 * - thumbnailType이 staged인 요청은 generated Layout을 절대 쓸 수 없다. 검증된 staged
 *   Layout이 없으면 reviewRequired.
 * - gift가 포함된 요청도 generated Layout을 쓸 수 없다. 검증된 Layout이 없으면 reviewRequired.
 * - 위 두 reviewRequired 조건에 해당하지 않을 때만(=basic이고 gift 없음) generated fallback을
 *   시도한다.
 */

export type ReviewRequiredReason = 'STAGED_NO_VERIFIED_LAYOUT' | 'GIFT_NO_VERIFIED_LAYOUT';

export type ResolveLayoutErrorReason = 'AMBIGUOUS_LAYOUT_MATCH' | GenerateFallbackLayoutFailureReason;

export type ResolveLayoutResult =
  | { status: 'resolved'; layout: LayoutDefinition }
  | { status: 'reviewRequired'; reason: ReviewRequiredReason; message: string }
  | { status: 'error'; reason: ResolveLayoutErrorReason; message: string };

export function resolveLayout(
  criteria: LayoutSelectionCriteria,
  layouts: LayoutDefinition[],
): ResolveLayoutResult {
  const verifiedLayouts = layouts.filter((l) => l.source.kind === 'verified');
  const selection = selectLayout(criteria, verifiedLayouts);

  if (selection.ok) {
    return { status: 'resolved', layout: selection.layout };
  }

  if (selection.reason === 'AMBIGUOUS_LAYOUT_MATCH') {
    return { status: 'error', reason: 'AMBIGUOUS_LAYOUT_MATCH', message: selection.message };
  }

  // 여기부터는 selection.reason이 NO_LAYOUT_WITH_MATCHING_SLOT_COUNT | NO_MATCHING_LAYOUT
  // = "이 요청 조건을 만족하는 검증된(verified) Layout이 없음"(NO_VERIFIED_LAYOUT)에 해당한다.

  if (criteria.giftQuantity > 0) {
    return {
      status: 'reviewRequired',
      reason: 'GIFT_NO_VERIFIED_LAYOUT',
      message:
        '증정품이 포함된 요청은 검증된(verified) Layout이 있을 때만 자동 생성할 수 있습니다. ' +
        '해당 슬롯 구성의 검증된 Layout이 없어 검토가 필요합니다.',
    };
  }

  if (criteria.thumbnailType === 'staged') {
    return {
      status: 'reviewRequired',
      reason: 'STAGED_NO_VERIFIED_LAYOUT',
      message:
        'staged 썸네일은 검증된(verified) Layout만 사용할 수 있습니다(자동 생성 금지). ' +
        '해당 슬롯 구성의 검증된 Layout이 없어 검토가 필요합니다.',
    };
  }

  const fallback = generateFallbackLayout({ slotCount: criteria.totalQuantity });
  if (!fallback.ok) {
    return { status: 'error', reason: fallback.reason, message: fallback.message };
  }

  return { status: 'resolved', layout: fallback.layout };
}
