import type { CompositionPlanSlot } from '../domain/composition-plan';
import { type LayoutDefinition, type LayoutSlot } from '../domain/layout';

/**
 * "어떤 Layout을 쓸지"(selectLayout)와 "그 Layout의 슬롯에 무엇을 채울지"(assignSlots)를
 * 분리한다. selectLayout은 Layout 선택만 담당하고, 실제 상품→슬롯 배치/순서/개수 검증은
 * 여기서 독립적으로 처리한다 — selectLayout이 이미 슬롯 수를 맞춰서 골랐다는 사실에
 * 암묵적으로 기대지 않고, 이 함수 스스로 다시 검증한다.
 *
 * V1 규칙:
 * - 슬롯은 슬롯키의 숫자 접미사(slot_1, slot_2, ...) 오름차순으로 채운다.
 * - saleAssetKeys/giftAssetKeys는 "작업ID 내 순번(seq) 오름차순으로 각 상품을 quantity만큼
 *   펼친(expand) 뒤 이어붙인" 상태로 이미 정렬되어 들어온다고 가정한다 — 이 함수는 재정렬하지
 *   않는다. (순번 정렬 자체는 Excel → GenerationRequest 변환 단계의 책임이다.)
 * - 판매(sale) 슬롯 수와 판매 상품 수가 정확히 같아야 한다. 다르면 생략/겹침/자동 축소 없이
 *   즉시 실패한다.
 * - gift처럼 판매수량에 포함되지 않는 슬롯은 role로 분리되어 있고, 별도 개수로 검증한다.
 */

export interface AssignSlotsInput {
  layout: LayoutDefinition;
  /** 판매 상품 assetKey 목록 (순번 오름차순 × quantity만큼 이미 펼쳐진 상태) */
  saleAssetKeys: string[];
  /** 증정품 assetKey 목록. 판매수량에 포함되지 않는 별도 role. 없으면 빈 배열. */
  giftAssetKeys: string[];
}

export type AssignSlotsFailureReason = 'SALE_SLOT_COUNT_MISMATCH' | 'GIFT_SLOT_COUNT_MISMATCH';

export type AssignSlotsResult =
  | { ok: true; slots: CompositionPlanSlot[] }
  | { ok: false; reason: AssignSlotsFailureReason; message: string };

function slotOrderKey(slotKey: string): number {
  const match = slotKey.match(/(\d+)\s*$/);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

function sortBySlotOrder(slots: LayoutSlot[]): LayoutSlot[] {
  return [...slots].sort((a, b) => slotOrderKey(a.slotKey) - slotOrderKey(b.slotKey));
}

// 판매 슬롯인지 여부는 role==='gift'가 아닌 것으로 판단한다 — 'sale'/'main'/'sub' 모두
// 판매수량에 포함된다('main'/'sub'는 'sale'의 세부 구분일 뿐이다. domain/layout.ts 참고).
function saleSlotsOf(layout: LayoutDefinition): LayoutSlot[] {
  return sortBySlotOrder(layout.slots.filter((s) => s.role !== 'gift'));
}

function giftSlotsOf(layout: LayoutDefinition): LayoutSlot[] {
  return sortBySlotOrder(layout.slots.filter((s) => s.role === 'gift'));
}

// 각 슬롯이 원래 갖고 있던 role(sale/main/sub/gift)을 그대로 보존한다 — 하나의 값으로
// 덮어쓰지 않아야 main/sub 같은 세부 구분이 CompositionPlan까지 이어진다.
function fillSlots(slots: LayoutSlot[], assetKeys: string[]): CompositionPlanSlot[] {
  return slots.map((slot, i) => ({ slotKey: slot.slotKey, assetKey: assetKeys[i], role: slot.role }));
}

export function assignSlots(input: AssignSlotsInput): AssignSlotsResult {
  const saleSlots = saleSlotsOf(input.layout);
  const giftSlots = giftSlotsOf(input.layout);

  if (saleSlots.length !== input.saleAssetKeys.length) {
    return {
      ok: false,
      reason: 'SALE_SLOT_COUNT_MISMATCH',
      message:
        `Layout "${input.layout.layoutKey}"의 판매 슬롯 수(${saleSlots.length})와 ` +
        `실제 판매 상품 수(${input.saleAssetKeys.length})가 정확히 일치하지 않습니다. ` +
        `(일부만 채우거나 겹쳐 넣는 등의 대체 처리는 하지 않습니다)`,
    };
  }

  if (giftSlots.length !== input.giftAssetKeys.length) {
    return {
      ok: false,
      reason: 'GIFT_SLOT_COUNT_MISMATCH',
      message:
        `Layout "${input.layout.layoutKey}"의 증정 슬롯 수(${giftSlots.length})와 ` +
        `실제 증정 상품 수(${input.giftAssetKeys.length})가 정확히 일치하지 않습니다.`,
    };
  }

  return {
    ok: true,
    slots: [...fillSlots(saleSlots, input.saleAssetKeys), ...fillSlots(giftSlots, input.giftAssetKeys)],
  };
}
