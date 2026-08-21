/**
 * 상품코드(Product Registry, Excel 상품목록 기준의 업무 식별자)와 asset 참조(렌더러가 실제
 * 이미지를 찾을 때 쓰는 키)를 분리해서 관리한다.
 *
 * 지금까지는 "assetKey = productCode"를 편의상 가정했지만, 이는 영구 규칙이 아니다 — 실제
 * 회사 Figma에 PRODUCT_ASSETS 페이지 컨벤션이 확정되면(예: 노드 이름이 상품코드와 다르게
 * 지어질 수 있음) 이 표만 갱신하면 되고, Product Registry나 composePlan/렌더러 쪽은 손댈
 * 필요가 없다.
 *
 * source:
 * - 'code-fallback': 아직 실제 PRODUCT_ASSETS 컨벤션이 확정되지 않아, 상품코드를 임시로
 *   그대로 assetKey로 쓰는 상태(변경 가능성이 있다는 뜻).
 * - 'confirmed': 실제 Figma에서 확인된 asset 참조로 확정된 상태.
 *
 * 상품코드가 여기 등록되어 있지 않으면(Product Registry에는 있어도) composePlan에 쓸 수 있는
 * 도메인 Product로 변환되지 않는다 — 확인되지 않은 상품을 임의로 자동 생성 대상에 포함시키지
 * 않기 위함이다.
 */
export interface ProductAssetBinding {
  productCode: string;
  assetKey: string;
  source: 'code-fallback' | 'confirmed';
  note?: string;
}

export const PRODUCT_ASSET_BINDINGS: ProductAssetBinding[] = [
  {
    productCode: 'SIMPLE_BEEF_JANGJORIM_130',
    assetKey: 'SIMPLE_BEEF_JANGJORIM_130',
    source: 'code-fallback',
    note: 'Figma PRODUCT_ASSETS 페이지 노드 명명 규칙이 확정되면 재확인 필요',
  },
  {
    productCode: 'SIMPLE_QUAIL_JANGJORIM_180',
    assetKey: 'SIMPLE_QUAIL_JANGJORIM_180',
    source: 'code-fallback',
    note: 'Figma PRODUCT_ASSETS 페이지 노드 명명 규칙이 확정되면 재확인 필요',
  },
  {
    productCode: 'SIMPLE_CHIVE_KKOMAK_240',
    assetKey: 'SIMPLE_CHIVE_KKOMAK_240',
    source: 'code-fallback',
    note: 'Figma PRODUCT_ASSETS 페이지 노드 명명 규칙이 확정되면 재확인 필요',
  },
  // BABY_BEEF_PORRIDGE_100 / BABY_PUMPKIN_PORRIDGE_100은 실제 상품명과 불일치하는 것으로
  // 확인된 placeholder이므로 asset binding을 등록하지 않는다(=composePlan 대상에서 제외됨).
];

export function resolveProductAssetKey(productCode: string): string | undefined {
  return PRODUCT_ASSET_BINDINGS.find((b) => b.productCode === productCode)?.assetKey;
}
