import type { LayoutDefinition, LayoutSlot } from '../domain/layout';
import { MAX_GENERATED_SLOT_COUNT, resolveArrangementFamily } from '../data/arrangementFamilyPolicy';

/**
 * 실제로 검증된 Layout이 없는 슬롯 수를 위한 family 공식 기반 fallback 생성기.
 * gift 슬롯은 다루지 않는다 — gift가 포함된 요청은 resolveLayout에서 애초에 이 함수를
 * 호출하지 않고 reviewRequired로 처리한다.
 */

export interface GenerateFallbackLayoutInput {
  slotCount: number;
}

export type GenerateFallbackLayoutFailureReason =
  | 'SLOT_COUNT_EXCEEDS_GENERATED_LIMIT'
  | 'NO_ARRANGEMENT_FAMILY_FOR_SLOT_COUNT';

export type GenerateFallbackLayoutResult =
  | { ok: true; layout: LayoutDefinition }
  | { ok: false; reason: GenerateFallbackLayoutFailureReason; message: string };

export function generateFallbackLayout(input: GenerateFallbackLayoutInput): GenerateFallbackLayoutResult {
  if (input.slotCount > MAX_GENERATED_SLOT_COUNT) {
    return {
      ok: false,
      reason: 'SLOT_COUNT_EXCEEDS_GENERATED_LIMIT',
      message: `슬롯 수 ${input.slotCount}개는 generated fallback의 V1 최대치(${MAX_GENERATED_SLOT_COUNT}개)를 초과합니다.`,
    };
  }

  const range = resolveArrangementFamily(input.slotCount);
  if (!range) {
    return {
      ok: false,
      reason: 'NO_ARRANGEMENT_FAMILY_FOR_SLOT_COUNT',
      message:
        `슬롯 수 ${input.slotCount}개에 대응하는 배치 family가 정책 데이터(arrangementFamilyPolicy)에 ` +
        `정의되어 있지 않습니다.`,
    };
  }

  const slots: LayoutSlot[] = Array.from({ length: input.slotCount }, (_, i) => ({
    slotKey: `slot_${i + 1}`,
    role: 'sale' as const,
  }));

  return {
    ok: true,
    layout: {
      layoutKey: `GENERATED_${range.familyId.toUpperCase()}_${input.slotCount}`,
      arrangementKind: range.familyId,
      slots,
      // generated layout은 selectLayout으로 검색되지 않고 resolveLayout이 직접 생성해서
      // 반환하므로 match 조건이 필요 없다.
      match: {},
      priority: 0,
      source: { kind: 'generated', params: { familyId: range.familyId, slotCount: input.slotCount } },
    },
  };
}
