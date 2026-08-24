import type { ProductAssetBinding, ProductAssetKind } from '../domain/productAsset';
import { DEFAULT_PRODUCT_ASSET_KIND } from '../domain/productAsset';

/**
 * 상품코드(Product Registry, Excel 상품목록 기준의 업무 식별자)와 asset 참조(렌더러가 실제
 * 이미지를 찾을 때 쓰는 키)를 분리해서 관리한다. 한 상품은 여러 종류의 asset(package/
 * plated-side/plated-top)을 가질 수 있다 — productAsset.ts 참고.
 *
 * fileKey v6UalGGplex8w2hzfbqwhI의 "시뮬" 페이지(본죽_시뮬 > 본죽장조림/요리_사이드,
 * 장조림_측 섹션)를 read-only로 조사해서 아래 3개 상품의 실제 asset을 확인했다:
 * - "본죽장조림" 프레임의 "소고기장조림130"(2008:3811)/"메추리알장조림180"(2008:3813),
 *   "요리_사이드" 프레임의 "부추꼬막무침240"(2008:3861) — screenshot으로 확인한 결과 실제
 *   검증된 네이버 basic 썸네일(LAYOUT_01~10)이 쓰는 파우치 패키지 사진과 동일했다(package).
 * - "장조림_측" 섹션의 "쇠고기장조림_측"(2008:3473), "메추리알_측"(2008:3459), "요리_사이드"의
 *   "부추꼬막무침240_측"(2008:3863) — screenshot으로 확인한 결과 그릇에 담긴 플레이팅 컷이었다
 *   (plated-side). 지난 조사에서 "기존 확인된 상품과 동일 가능성이 있어 보류"로 남겨뒀던
 *   메추리알(장조림)/쇠고기장조림 후보가 바로 이것이었다 — 새 Product로 등록하지 않고
 *   여기서 기존 상품의 plated-side variant로만 연결한다("쇠고기장조림"/"메추리알"은 각각
 *   capacity 표기가 없어 100% 확정은 아니라 code-fallback으로 표시).
 *
 * status:
 * - 'code-fallback': 아직 실제 asset을 완전히 확정하지 못해 잠정값을 쓰는 상태.
 * - 'confirmed': screenshot/구조 확인을 거쳐 실제 asset으로 확정된 상태.
 *
 * 상품코드가 여기 등록되어 있지 않으면(Product Registry에는 있어도) composePlan에 쓸 수 있는
 * 도메인 Product로 변환되지 않는다 — 확인되지 않은 상품을 임의로 자동 생성 대상에 포함시키지
 * 않기 위함이다.
 */
export const PRODUCT_ASSET_BINDINGS: ProductAssetBinding[] = [
  {
    productCode: 'SIMPLE_BEEF_JANGJORIM_130',
    variants: [
      {
        assetKind: 'package',
        source: {
          kind: 'component-variant',
          componentName: '소고기장조림130',
          confirmedNodeId: '2008:3811',
        },
        assetKey: 'SIMPLE_BEEF_JANGJORIM_130',
        status: 'confirmed',
        note: 'screenshot으로 실제 verified 썸네일(LAYOUT_01~10)의 패키지 사진과 동일함을 확인',
      },
      {
        assetKind: 'plated-side',
        source: {
          kind: 'component-variant',
          componentName: '쇠고기장조림_측',
          confirmedNodeId: '2008:3473',
        },
        assetKey: 'SIMPLE_BEEF_JANGJORIM_130_PLATED_SIDE',
        status: 'code-fallback',
        note: '"쇠고기장조림"(소고기장조림과 동일 발음 표기)_측 — 같은 상품의 플레이팅 컷으로 추정, 100% 확정은 아님',
      },
    ],
  },
  {
    productCode: 'SIMPLE_QUAIL_JANGJORIM_180',
    variants: [
      {
        assetKind: 'package',
        source: {
          kind: 'component-variant',
          componentName: '메추리알장조림180',
          confirmedNodeId: '2008:3813',
        },
        assetKey: 'SIMPLE_QUAIL_JANGJORIM_180',
        status: 'confirmed',
        note: 'screenshot으로 실제 verified 썸네일(LAYOUT_02, node 69:17172)의 패키지 사진과 동일함을 확인',
      },
      {
        assetKind: 'plated-side',
        source: {
          kind: 'component-variant',
          componentName: '메추리알_측',
          confirmedNodeId: '2008:3459',
        },
        assetKey: 'SIMPLE_QUAIL_JANGJORIM_180_PLATED_SIDE',
        status: 'code-fallback',
        note: '용량 표기가 없어 180g 상품과 동일한지 100% 확정은 아님',
      },
    ],
  },
  {
    productCode: 'SIMPLE_CHIVE_KKOMAK_240',
    variants: [
      {
        assetKind: 'package',
        source: {
          kind: 'component-variant',
          componentName: '부추꼬막무침240',
          confirmedNodeId: '2008:3861',
        },
        assetKey: 'SIMPLE_CHIVE_KKOMAK_240',
        status: 'confirmed',
        note: '이름에 용량(240)까지 정확히 일치 — 기존에 실제 verified 썸네일 프레임 자체는 못 찾았지만, 패키지 asset은 확인됨',
      },
      {
        assetKind: 'plated-side',
        source: {
          kind: 'component-variant',
          componentName: '부추꼬막무침240_측',
          confirmedNodeId: '2008:3863',
        },
        assetKey: 'SIMPLE_CHIVE_KKOMAK_240_PLATED_SIDE',
        status: 'confirmed',
        note: '이름/용량 정확히 일치',
      },
    ],
  },
  // BABY_BEEF_PORRIDGE_100 / BABY_PUMPKIN_PORRIDGE_100은 실제 상품명과 불일치하는 것으로
  // 확인된 placeholder이므로 asset binding을 등록하지 않는다(=composePlan 대상에서 제외됨).

  // 보류(등록 안 함): "반찬_측/탑" 섹션의 "꼬막무침"(2008:3385/2008:3372, "부추" 접두어 없음,
  // 용량 표기 없음)은 SIMPLE_CHIVE_KKOMAK_240("부추꼬막무침240")과 동일 상품인지, 아니면
  // 별도 SKU(예: 다른 용량/부추 없는 버전)인지 확인되지 않아 alias로도 연결하지 않는다.
];

export function resolveProductAssetVariant(
  productCode: string,
  assetKind: ProductAssetKind = DEFAULT_PRODUCT_ASSET_KIND,
) {
  return PRODUCT_ASSET_BINDINGS.find((b) => b.productCode === productCode)?.variants.find(
    (v) => v.assetKind === assetKind,
  );
}

export function resolveProductAssetKey(
  productCode: string,
  assetKind: ProductAssetKind = DEFAULT_PRODUCT_ASSET_KIND,
): string | undefined {
  return resolveProductAssetVariant(productCode, assetKind)?.assetKey;
}
