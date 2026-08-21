import type { ParsedProductName, ProductMatch } from './types';

export interface ProductRegistryEntry {
  assetKey: string;
  brand: string;
  name: string;
  capacity: string;
  /** Excel 표기가 조금 달라도 동일 상품으로 연결하기 위한 추가 매칭 키 (normalizedLabel 형태 문자열) */
  aliases?: string[];
}

function keyOf(brand: string, name: string, capacity: string): string {
  return `${brand}|${name}|${capacity}`;
}

/**
 * 파싱된 상품명(brand/name/capacity)을 실제 Figma PRODUCT_ASSETS의 assetKey로 연결한다.
 * 정확히 하나로 좁혀지지 않으면(0개 또는 2개 이상) 절대 임의로 고르지 않고 matchedCount만 보고한다 —
 * 호출부가 이를 PRODUCT_NOT_MATCHED / PRODUCT_MATCHED_MULTIPLE 이슈로 변환한다.
 */
export function resolveProduct(
  parsed: Pick<ParsedProductName, 'brand' | 'name' | 'capacity' | 'normalizedLabel'>,
  registry: ProductRegistryEntry[],
): ProductMatch {
  if (!parsed.brand || !parsed.name || !parsed.capacity) {
    return { assetKey: null, matchedCount: 0 };
  }

  const exactKey = keyOf(parsed.brand, parsed.name, parsed.capacity);

  const matched = registry.filter((entry) => {
    if (keyOf(entry.brand, entry.name, entry.capacity) === exactKey) return true;
    if (parsed.normalizedLabel && entry.aliases?.includes(parsed.normalizedLabel)) return true;
    return false;
  });

  const uniqueAssetKeys = Array.from(new Set(matched.map((m) => m.assetKey)));

  if (uniqueAssetKeys.length === 1) {
    return { assetKey: uniqueAssetKeys[0], matchedCount: 1 };
  }
  return { assetKey: null, matchedCount: uniqueAssetKeys.length };
}

/**
 * 파일럿 범위 시드 데이터. 실제 운영 전 진짜 상품 목록으로 채워야 한다.
 * assetKey는 PRODUCT_ASSETS 페이지에 등록될 노드 이름과 일치해야 한다.
 */
export const PRODUCT_REGISTRY: ProductRegistryEntry[] = [
  { assetKey: 'meal_beef-jangjorim_130', brand: '본죽', name: '소고기장조림', capacity: '130g' },
  { assetKey: 'meal_quail-egg-jangjorim_180', brand: '본죽', name: '메추리알 장조림', capacity: '180g' },
  { assetKey: 'meal_chive-kkomak-muchim_240', brand: '본죽', name: '부추 꼬막무침', capacity: '240g' },
];
