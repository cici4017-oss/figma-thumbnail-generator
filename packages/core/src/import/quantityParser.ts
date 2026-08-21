import type { QuantityResolution } from './types';

/** 옵션명이 비어있거나 "단품"이면 "수량 override 없음"으로 본다 (두 샘플 시트 모두 실제로 이렇게 씀). */
function isNoOptionMarker(optionRaw: string): boolean {
  const t = optionRaw.trim();
  return t === '' || t === '단품';
}

function lastQuantityIn(text: string): number | null {
  const matches = Array.from(text.matchAll(/(\d+)\s*개/g));
  if (matches.length === 0) return null;
  return Number(matches[matches.length - 1][1]);
}

/**
 * 최종 수량 확정 규칙:
 * - 옵션명이 실질적인 내용을 담고 있으면(= "단품"도 빈칸도 아니면) 그 안의 마지막 "N개"가 최종값 (override).
 * - 옵션명이 없으면 상품명에서 뽑힌 수량 후보가 정확히 1개일 때만 그 값을 채택.
 * - 그 외(후보 0개, 또는 "골라담기"인데 옵션명에서 못 골랐음, 또는 옵션명에 내용은 있는데 숫자가 없음)는 미해결.
 */
export function resolveQuantity(productQuantities: number[], optionRaw: string): QuantityResolution {
  const hasOptionOverride = !isNoOptionMarker(optionRaw);

  if (hasOptionOverride) {
    const fromOption = lastQuantityIn(optionRaw);
    if (fromOption !== null) {
      return { value: fromOption, source: 'optionName', isOverride: true };
    }
    return { value: null, source: null, isOverride: true };
  }

  if (productQuantities.length === 1) {
    return { value: productQuantities[0], source: 'productName', isOverride: false };
  }

  return { value: null, source: null, isOverride: false };
}
