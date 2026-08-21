import type { ParsedProductName } from './types';

const BRAND_RE = /^\[([^\]]+)\]\s*/;
const CAPACITY_RE = /(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b/i;
const QUANTITY_TAIL_RE = /((?:\d+\s*개\s*\/?\s*)+)\s*(골라담기)?\s*$/;

/**
 * "[본죽] 부추 꼬막무침 240g 1개/2개/3개 골라담기" 같은 상품명 문자열을 구조화한다.
 * assetKey는 만들지 않는다 — 그건 별도의 Product Registry/Resolver 책임.
 */
export function parseProductName(raw: string): ParsedProductName {
  let working = raw.trim();

  const brandMatch = working.match(BRAND_RE);
  const brand = brandMatch ? brandMatch[1].trim() : null;
  if (brandMatch) {
    working = working.slice(brandMatch[0].length).trim();
  }

  const capacityMatch = working.match(CAPACITY_RE);
  const capacity = capacityMatch ? capacityMatch[0].replace(/\s+/g, '') : null;
  if (capacityMatch && capacityMatch.index !== undefined) {
    working = (
      working.slice(0, capacityMatch.index) + working.slice(capacityMatch.index + capacityMatch[0].length)
    )
      .replace(/\s+/g, ' ')
      .trim();
  }

  const quantityMatch = working.match(QUANTITY_TAIL_RE);
  let quantities: number[] = [];
  let isChoiceListing = false;
  if (quantityMatch && quantityMatch.index !== undefined) {
    quantities = Array.from(quantityMatch[1].matchAll(/\d+/g)).map((m) => Number(m[0]));
    isChoiceListing = !!quantityMatch[2] || quantities.length > 1;
    working = working.slice(0, quantityMatch.index).trim();
  }

  const name = working.length > 0 ? working : null;
  const normalizedLabel = [brand, name, capacity].filter((v): v is string => !!v).join(' ') || null;

  return { raw, brand, name, capacity, quantities, isChoiceListing, normalizedLabel };
}
