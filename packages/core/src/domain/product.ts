export type ProductGroupId = 'simple-meal' | 'baby-food';

export interface Product {
  id: string;
  name: string;
  productGroup: ProductGroupId;
  /** 렌더러가 해석하는 불투명 참조. Figma에서는 이미지 hash, Web에서는 URL/storage key 등이 될 수 있다. */
  assetKey: string;
}
