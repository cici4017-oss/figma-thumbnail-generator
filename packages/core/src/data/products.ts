import type { Product, ProductGroupId } from '../domain/product';
import { resolveProductAssetKey } from './productAssetBindings';

export interface ProductRegistryEntry {
  code: string;
  productGroup: ProductGroupId;
  brand: string;
  name: string;
  capacity: string;
}

/**
 * 표준 요청서(templates/썸네일_자동화_요청서.xlsx)의 02_상품목록과 반드시 동기화해야 한다.
 * (생성 스크립트: packages/core/scripts/generateWorkOrderTemplate.mjs)
 */
export const PRODUCTS: ProductRegistryEntry[] = [
  { code: 'SIMPLE_BEEF_JANGJORIM_130', productGroup: 'simple-meal', brand: '본죽', name: '소고기장조림', capacity: '130g' },
  { code: 'SIMPLE_QUAIL_JANGJORIM_180', productGroup: 'simple-meal', brand: '본죽', name: '메추리알 장조림', capacity: '180g' },
  { code: 'SIMPLE_CHIVE_KKOMAK_240', productGroup: 'simple-meal', brand: '본죽', name: '부추 꼬막무침', capacity: '240g' },
  { code: 'BABY_BEEF_PORRIDGE_100', productGroup: 'baby-food', brand: '본죽', name: '이유식 소고기죽', capacity: '100g' },
  { code: 'BABY_PUMPKIN_PORRIDGE_100', productGroup: 'baby-food', brand: '본죽', name: '이유식 단호박죽', capacity: '100g' },
];

/**
 * ProductRegistryEntry(Excel 상품목록 메타데이터) -> composePlan이 쓰는 도메인 Product 변환.
 * assetKey는 상품코드가 아니라 productAssetBindings.ts에 등록된 실제 asset 참조를 쓴다 —
 * 상품코드와 asset 참조는 별개이므로, asset binding이 없는 상품은 도메인 Product로 변환하지
 * 않는다(=아직 자동 생성 대상이 아님을 뜻한다. 임의로 상품코드를 assetKey로 대체하지 않는다).
 */
export function toDomainProduct(entry: ProductRegistryEntry): Product | null {
  const assetKey = resolveProductAssetKey(entry.code);
  if (!assetKey) return null;
  return { id: entry.code, name: entry.name, productGroup: entry.productGroup, assetKey };
}

export const DOMAIN_PRODUCTS: Product[] = PRODUCTS.map(toDomainProduct).filter(
  (p): p is Product => p !== null,
);
