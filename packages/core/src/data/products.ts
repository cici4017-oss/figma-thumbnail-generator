import type { ProductGroupId } from '../domain/product';

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
