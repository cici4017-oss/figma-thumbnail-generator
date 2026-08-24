import type { Product, ProductGroupId } from '../domain/product';
import { resolveProductAssetKey } from './productAssetBindings';

export interface ProductRegistryEntry {
  code: string;
  productGroup: ProductGroupId;
  brand: string;
  name: string;
  /** 실제 용량이 확인되지 않았으면 null로 표시한다(추측해서 채우지 않는다). */
  capacity: string | null;
}

/**
 * 표준 요청서(templates/썸네일_자동화_요청서.xlsx)의 02_상품목록과 반드시 동기화해야 한다.
 * (생성 스크립트: packages/core/scripts/generateWorkOrderTemplate.mjs)
 *
 * 아래 29개(간편식 22 + 영유아 7)는 fileKey v6UalGGplex8w2hzfbqwhI "시뮬" 페이지를
 * read-only로 조사해서 실제 상품명 + 용량이 이름에 명시되어 있고, package asset(component
 * variant)이 명확히 식별되는 것만 추가했다. `_TBD` 코드는 만들지 않았고, 이름/용량이 충돌하거나
 * 중복 가능성이 있는 후보는 등록하지 않고 별도로 보류했다(productAssetBindings.ts 하단 주석
 * 참고).
 */
export const PRODUCTS: ProductRegistryEntry[] = [
  { code: 'SIMPLE_BEEF_JANGJORIM_130', productGroup: 'simple-meal', brand: '본죽', name: '소고기장조림', capacity: '130g' },
  { code: 'SIMPLE_QUAIL_JANGJORIM_180', productGroup: 'simple-meal', brand: '본죽', name: '메추리알 장조림', capacity: '180g' },
  { code: 'SIMPLE_CHIVE_KKOMAK_240', productGroup: 'simple-meal', brand: '본죽', name: '부추 꼬막무침', capacity: '240g' },
  { code: 'BABY_BEEF_PORRIDGE_100', productGroup: 'baby-food', brand: '본죽', name: '이유식 소고기죽', capacity: '100g' },
  { code: 'BABY_PUMPKIN_PORRIDGE_100', productGroup: 'baby-food', brand: '본죽', name: '이유식 단호박죽', capacity: '100g' },

  // --- 간편식(simple-meal) 신규 22개 ---
  { code: 'SIMPLE_BEEF_QUAIL_JANGJORIM_150', productGroup: 'simple-meal', brand: '본죽', name: '본 메추리알쇠고기장조림', capacity: '150g' },
  { code: 'SIMPLE_BEEF_JANGJORIM_300', productGroup: 'simple-meal', brand: '본죽', name: '본 쇠고기장조림', capacity: '300g' },
  { code: 'SIMPLE_MINI_BEEF_JANGJORIM_70', productGroup: 'simple-meal', brand: '본죽', name: '미니 쇠고기장조림', capacity: '70g' },
  { code: 'SIMPLE_MINI_BUTTER_BEEF_JANGJORIM_70', productGroup: 'simple-meal', brand: '본죽', name: '미니 본버터쇠고기장조림', capacity: '70g' },
  { code: 'SIMPLE_QUAIL_JANGJORIM_1000', productGroup: 'simple-meal', brand: '본죽', name: '메추리알장조림 대용량 1kg', capacity: '1kg' },
  { code: 'SIMPLE_QUAIL_JANGJORIM_600', productGroup: 'simple-meal', brand: '본죽', name: '메추리알장조림 대용량 600g', capacity: '600g' },
  { code: 'SIMPLE_CHUEOTANG_700', productGroup: 'simple-meal', brand: '본죽', name: '느리게만든 본남도식추어탕', capacity: '700g' },
  { code: 'SIMPLE_GALBIJJIM_700', productGroup: 'simple-meal', brand: '본죽', name: '느리게만든 갈비찜', capacity: '700g' },
  { code: 'SIMPLE_DOGANITANG_700', productGroup: 'simple-meal', brand: '본죽', name: '느리게만든 본도가니탕', capacity: '700g' },
  { code: 'SIMPLE_YUKGAEJANG_640', productGroup: 'simple-meal', brand: '본죽', name: '느리게만든 본대파육개장', capacity: '640g' },
  { code: 'SIMPLE_HEALTHY_ABALONE_SAMGYE_JUK_330', productGroup: 'simple-meal', brand: '본죽', name: '헬시 전복삼계죽', capacity: '330g' },
  { code: 'SIMPLE_HEALTHY_BEEF_ROOT_VEG_JUK_330', productGroup: 'simple-meal', brand: '본죽', name: '헬시 쇠고기뿌리야채죽', capacity: '330g' },
  { code: 'SIMPLE_HANWOO_SEOLLEONGTANG_450', productGroup: 'simple-meal', brand: '본죽', name: '본설렁탕 한우설렁탕', capacity: '450g' },
  { code: 'SIMPLE_YANGJI_SUYUK_100', productGroup: 'simple-meal', brand: '본죽', name: '본설렁탕 양지수육', capacity: '100g' },
  { code: 'SIMPLE_SIGNATURE_ABALONE_JUK_200', productGroup: 'simple-meal', brand: '본죽', name: '시그니처 전복죽', capacity: '200g' },
  { code: 'SIMPLE_SIGNATURE_PUMPKIN_JUK_200', productGroup: 'simple-meal', brand: '본죽', name: '시그니처 단호박죽', capacity: '200g' },
  { code: 'SIMPLE_SIGNATURE_BEEF_JUK_200', productGroup: 'simple-meal', brand: '본죽', name: '시그니처 쇠고기죽', capacity: '200g' },
  { code: 'SIMPLE_SIGNATURE_SPICY_OCTOPUS_KIMCHI_JUK_200', productGroup: 'simple-meal', brand: '본죽', name: '시그니처 얼큰낙지김치죽', capacity: '200g' },
  { code: 'SIMPLE_SIGNATURE_SWEET_BLACK_BEAN_80', productGroup: 'simple-meal', brand: '본죽', name: '시그니처 달콤검은콩자반', capacity: '80g' },
  { code: 'SIMPLE_SIGNATURE_SPICY_PERILLA_LEAF_80', productGroup: 'simple-meal', brand: '본죽', name: '시그니처 매콤깻잎무침', capacity: '80g' },
  { code: 'SIMPLE_SIGNATURE_CRISPY_LOTUS_ROOT_80', productGroup: 'simple-meal', brand: '본죽', name: '시그니처 아삭연근조림', capacity: '80g' },
  { code: 'SIMPLE_SIGNATURE_SHREDDED_SQUID_60', productGroup: 'simple-meal', brand: '본죽', name: '시그니처 촉촉진미채볶음', capacity: '60g' },

  // --- 영유아(baby-food) 신규 7개 ---
  { code: 'BABY_KIDS_MIXED_VEGETABLE_JUK_170', productGroup: 'baby-food', brand: '본죽', name: '본죽키즈 모둠야채죽', capacity: '170g' },
  { code: 'BABY_KIDS_NUTRITION_CHICKEN_JUK_170', productGroup: 'baby-food', brand: '본죽', name: '본죽키즈 영양닭죽', capacity: '170g' },
  { code: 'BABY_KIDS_ABALONE_JUK_170', productGroup: 'baby-food', brand: '본죽', name: '본죽키즈 튼튼전복죽', capacity: '170g' },
  { code: 'BABY_KIDS_HANWOO_VEGETABLE_JUK_170', productGroup: 'baby-food', brand: '본죽', name: '본죽키즈 한우야채죽', capacity: '170g' },
  { code: 'BABY_ORGANIC_RICE_PUFF_RED_30', productGroup: 'baby-food', brand: '베이비본죽', name: '유기농쌀과자퍼프 레드', capacity: '30g' },
  { code: 'BABY_ORGANIC_RICE_PUFF_YELLOW_30', productGroup: 'baby-food', brand: '베이비본죽', name: '유기농쌀과자퍼프 옐로우', capacity: '30g' },
  { code: 'BABY_ORGANIC_RICE_PUFF_PURPLE_30', productGroup: 'baby-food', brand: '베이비본죽', name: '유기농쌀과자퍼프 퍼플', capacity: '30g' },
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
