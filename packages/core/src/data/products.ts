import type { Product, ProductGroupId } from '../domain/product';

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
 * V1 mock/개발 단계 컨벤션: assetKey는 상품코드와 동일하다(PRODUCT_ASSETS 페이지의 노드 이름을
 * 상품코드로 등록하는 것을 전제). 실제 회사 Figma 적용 단계에서 이 컨벤션이 안 맞으면 여기서만
 * 바꾸면 된다.
 */
export function toDomainProduct(entry: ProductRegistryEntry): Product {
  return { id: entry.code, name: entry.name, productGroup: entry.productGroup, assetKey: entry.code };
}

export const DOMAIN_PRODUCTS: Product[] = PRODUCTS.map(toDomainProduct);
