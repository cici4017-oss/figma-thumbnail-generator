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
        // 상품별 visible size 비교(2026-08-25): 정사각형 소스 자체는 743x743로 동일하지만,
        // 상단 브랜드/문구 영역이 커서 같은 슬롯에서 시그니처 반찬류보다 패키지가 작아 보임을
        // 실제 3종 동일 슬롯 비교 screenshot으로 확인 → 22% 확대(중앙 기준)로 보정.
        presentation: { visualScale: 1.22, offsetX: 0, offsetY: 0 },
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
        // 소고기장조림130과 동일한 패키지 템플릿(상단 브랜드/문구 영역 비중이 큼)이라 동일하게 보정.
        presentation: { visualScale: 1.22, offsetX: 0, offsetY: 0 },
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

  // --- 아래부터 신규 등록 29개 ---
  // package variant만 등록한다(plated-side/top은 이 29개에 대해 개별적으로 확인되지 않았음).
  // status='confirmed'는 이름+용량+같은 "본죽_시뮬" 최종 자산 갤러리(장조림_측/탑처럼 별도
  // "_측/_탑" 섹션이 아니라 완성 패키지 사진이 모인 프레임) 패턴 일치로 판단한 것이며,
  // 기존 3개(소고기장조림130 등)처럼 개별 screenshot으로 하나하나 재확인하지는 않았다.
  {
    productCode: 'SIMPLE_BEEF_QUAIL_JANGJORIM_150',
    variants: [
      {
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: '본죽장조림', variantValue: 'Property 1=본죽_본메추리알쇠고기장조림_150g', confirmedNodeId: '2008:3803' },
        assetKey: 'SIMPLE_BEEF_QUAIL_JANGJORIM_150',
        status: 'confirmed',
      },
    ],
  },
  {
    productCode: 'SIMPLE_BEEF_JANGJORIM_300',
    variants: [
      {
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: '본죽장조림', variantValue: 'Property 1=본죽_본쇠고기장조림_300g', confirmedNodeId: '2008:3805' },
        assetKey: 'SIMPLE_BEEF_JANGJORIM_300',
        status: 'confirmed',
      },
    ],
  },
  {
    productCode: 'SIMPLE_MINI_BEEF_JANGJORIM_70',
    variants: [
      {
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: '미니 장조림_박스+파우치', variantValue: 'Property 1=미니_쇠고기장조림_70g', confirmedNodeId: '2008:3788' },
        assetKey: 'SIMPLE_MINI_BEEF_JANGJORIM_70',
        status: 'confirmed',
      },
    ],
  },
  {
    productCode: 'SIMPLE_MINI_BUTTER_BEEF_JANGJORIM_70',
    variants: [
      {
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: '미니 장조림_박스+파우치', variantValue: 'Property 1=미니_본버터쇠고기장조림_70g', confirmedNodeId: '2008:3796' },
        assetKey: 'SIMPLE_MINI_BUTTER_BEEF_JANGJORIM_70',
        status: 'confirmed',
      },
    ],
  },
  {
    // capacity 75g은 사용자가 확인해줌(2026-08-24) — 기존 "상세정보" 프레임 E03(70g) 표기와
    // 충돌해 보류했던 건이지만, 실제 값은 75g으로 확정.
    productCode: 'SIMPLE_MINI_BUTTER_POTATO_JANGJORIM_75',
    variants: [
      {
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: '미니 장조림_박스+파우치', variantValue: 'Property 1=미니_본버터감자장조림_75g', confirmedNodeId: '2008:3790' },
        assetKey: 'SIMPLE_MINI_BUTTER_POTATO_JANGJORIM_75',
        status: 'confirmed',
      },
    ],
  },
  {
    productCode: 'SIMPLE_QUAIL_JANGJORIM_1000',
    variants: [
      {
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: '메추리알 장조림_대용량', variantValue: 'Property 1=본죽_메추리알장조림_1kg', confirmedNodeId: '2008:3761' },
        assetKey: 'SIMPLE_QUAIL_JANGJORIM_1000',
        status: 'confirmed',
      },
    ],
  },
  {
    productCode: 'SIMPLE_QUAIL_JANGJORIM_600',
    variants: [
      {
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: '메추리알 장조림_대용량', variantValue: 'Property 1=본죽_메추리알장조림_600g', confirmedNodeId: '2008:3767' },
        assetKey: 'SIMPLE_QUAIL_JANGJORIM_600',
        status: 'confirmed',
      },
    ],
  },
  {
    productCode: 'SIMPLE_CHUEOTANG_700',
    variants: [
      {
        // 2026-08-25 재진단(느리게만든 4종 일괄 확인): node 2008:3748는 다른 상품(소고기장조림
        // 등)과 달리 조리 사진+태그라인+상품명+중량/영양정보가 한 이미지에 합쳐진 258x360
        // 세로형 "카드" 구조다. 처음엔 이걸 package가 아니라고 판단했지만, 파일 내 실제
        // 마케팅 합성 프레임("갈비찜3_포장", "쿠팡_뼈없는 소갈비찜1~7" 등)에서도 이 동일한
        // 카드 이미지가 실제 패키지 사진으로 그대로 쓰이고 있음을 확인 — 즉 이 카드가 느리게만든
        // 라인의 실제 패키지 디자인이며, "다른 상품과 다르다"는 것은 잘못된 asset이 아니라
        // 제품 라인별 디자인 차이였다. 대신 정사각형 슬롯에 중앙 크롭하면 상단 조리사진 비중이
        // 커서 하단 상품명/중량이 일부 잘려 보이는 문제가 있어 offsetY로 보정한다(상세는
        // SIMPLE_DOGANITANG_700 주석 참고).
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: '느리게만든', variantValue: 'Property 1=느리게만든_본남도식추어탕_700g', confirmedNodeId: '2008:3748' },
        assetKey: 'SIMPLE_CHUEOTANG_700',
        status: 'confirmed',
        presentation: { visualScale: 1, offsetX: 0, offsetY: 0.15 },
      },
    ],
  },
  {
    productCode: 'SIMPLE_GALBIJJIM_700',
    variants: [
      {
        // 느리게만든 4종 공통 카드형 이미지 — SIMPLE_DOGANITANG_700 주석 참고.
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: '느리게만든', variantValue: 'Property 1=느리게만든_갈비찜_700g', confirmedNodeId: '2008:3750' },
        assetKey: 'SIMPLE_GALBIJJIM_700',
        status: 'confirmed',
        presentation: { visualScale: 1, offsetX: 0, offsetY: 0.15 },
      },
    ],
  },
  {
    productCode: 'SIMPLE_DOGANITANG_700',
    variants: [
      {
        // 2026-08-25 최초 진단: node 2008:3752("느리게만든_본도가니탕_700g")를 screenshot으로
        // 확인한 결과, 다른 상품(소고기장조림 등)의 파우치 누끼샷과 달리 조리 사진+태그라인+
        // 상품명+중량/영양정보가 한 이미지에 합쳐진 258x360 세로형 "카드" 구조였다. 정사각형
        // 슬롯에 중앙 크롭(scaleMode:FILL)하면 상단 조리사진 비중이 커서 하단 상품명/중량이
        // 잘려 "그냥 조리 사진처럼" 보이는 문제가 있어, 최초에는 이걸 잘못된 source로 보고
        // status:'rejected'로 렌더 대상에서 제외했었다.
        //
        // 2026-08-25 재진단(느리게만든 4종: 추어탕/갈비찜/육개장 일괄 확인 중 발견): 파일 내
        // 실제 마케팅 합성 프레임들("갈비찜3_포장", "쿠팡_뼈없는 소갈비찜1~7", "육개장5/7" 등,
        // Page 12/간편식_채널_믹스 페이지)을 확인한 결과, 이 동일한 카드 이미지가 실제 선물세트/
        // 채널 프로모션 목업에서 패키지 사진으로 그대로 쓰이고 있었다 — 즉 이 카드가 느리게만든
        // 라인의 실제 패키지 디자인이 맞고(다른 상품과 다른 것은 asset 오류가 아니라 제품
        // 라인별 패키지 디자인 차이), 문제는 source가 아니라 정사각형 슬롯 중앙 크롭 방식이었다.
        // offsetY:0.15로 크롭 위치를 아래로 이동해서 상품명/중량/영양정보가 온전히 보이도록
        // 보정한 결과(screenshot으로 확인)를 반영해 'confirmed'로 되돌리고 presentation을
        // 추가한다 — rejected로 내렸던 이전 판정을 이번 재진단으로 뒤집음.
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: '느리게만든', variantValue: 'Property 1=느리게만든_본도가니탕_700g', confirmedNodeId: '2008:3752' },
        assetKey: 'SIMPLE_DOGANITANG_700',
        status: 'confirmed',
        note: '조리 사진+상품명+영양정보가 한 이미지에 합쳐진 카드형 구조지만, 파일 내 실제 마케팅 합성 프레임에서 동일 이미지가 패키지 사진으로 쓰이고 있어 느리게만든 라인의 실제 패키지 디자인으로 확인됨 — offsetY 보정으로 정사각형 슬롯에서도 상품명/중량이 온전히 보이도록 처리',
        presentation: { visualScale: 1, offsetX: 0, offsetY: 0.15 },
      },
    ],
  },
  {
    productCode: 'SIMPLE_YUKGAEJANG_640',
    variants: [
      {
        // 느리게만든 4종 공통 카드형 이미지 — SIMPLE_DOGANITANG_700 주석 참고.
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: '느리게만든', variantValue: 'Property 1=느리게만든_본대파육개장_640g', confirmedNodeId: '2008:3758' },
        assetKey: 'SIMPLE_YUKGAEJANG_640',
        status: 'confirmed',
        presentation: { visualScale: 1, offsetX: 0, offsetY: 0.15 },
      },
    ],
  },
  {
    productCode: 'SIMPLE_HEALTHY_ABALONE_SAMGYE_JUK_330',
    variants: [
      {
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: '헬시_죽_330g', variantValue: 'Property 1=헬시_전복삼계죽_330g', confirmedNodeId: '2008:3778' },
        assetKey: 'SIMPLE_HEALTHY_ABALONE_SAMGYE_JUK_330',
        status: 'confirmed',
      },
    ],
  },
  {
    productCode: 'SIMPLE_HEALTHY_BEEF_ROOT_VEG_JUK_330',
    variants: [
      {
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: '헬시_죽_330g', variantValue: 'Property 1=헬시_쇠고기뿌리야채죽_330g', confirmedNodeId: '2008:3776' },
        assetKey: 'SIMPLE_HEALTHY_BEEF_ROOT_VEG_JUK_330',
        status: 'confirmed',
      },
    ],
  },
  {
    productCode: 'SIMPLE_HANWOO_SEOLLEONGTANG_450',
    variants: [
      {
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: '본설렁탕', variantValue: 'Property 1=본설렁탕_한우설렁탕_450g', confirmedNodeId: '2008:3838' },
        assetKey: 'SIMPLE_HANWOO_SEOLLEONGTANG_450',
        status: 'confirmed',
      },
    ],
  },
  {
    productCode: 'SIMPLE_YANGJI_SUYUK_100',
    variants: [
      {
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: '본설렁탕', variantValue: 'Property 1=본설렁탕_양지수육_100g', confirmedNodeId: '2008:3836' },
        assetKey: 'SIMPLE_YANGJI_SUYUK_100',
        status: 'confirmed',
      },
    ],
  },
  {
    productCode: 'SIMPLE_SIGNATURE_ABALONE_JUK_200',
    variants: [
      {
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: '시그니처죽200/270', variantValue: 'Property 1=시그니처_전복죽_200g', confirmedNodeId: '2008:3547' },
        assetKey: 'SIMPLE_SIGNATURE_ABALONE_JUK_200',
        status: 'confirmed',
      },
    ],
  },
  {
    productCode: 'SIMPLE_SIGNATURE_PUMPKIN_JUK_200',
    variants: [
      {
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: '시그니처죽200/270', variantValue: 'Property 1=시그니처_단호박죽_200g', confirmedNodeId: '2008:3537' },
        assetKey: 'SIMPLE_SIGNATURE_PUMPKIN_JUK_200',
        status: 'confirmed',
      },
    ],
  },
  {
    productCode: 'SIMPLE_SIGNATURE_BEEF_JUK_200',
    variants: [
      {
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: '시그니처죽200/270', variantValue: 'Property 1=시그니처_쇠고기죽_200g', confirmedNodeId: '2008:3541' },
        assetKey: 'SIMPLE_SIGNATURE_BEEF_JUK_200',
        status: 'confirmed',
      },
    ],
  },
  {
    productCode: 'SIMPLE_SIGNATURE_SPICY_OCTOPUS_KIMCHI_JUK_200',
    variants: [
      {
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: '시그니처죽200/270', variantValue: 'Property 1=시그니처_얼큰낙지김치죽_200g', confirmedNodeId: '2008:3543' },
        assetKey: 'SIMPLE_SIGNATURE_SPICY_OCTOPUS_KIMCHI_JUK_200',
        status: 'confirmed',
      },
    ],
  },
  {
    productCode: 'SIMPLE_SIGNATURE_SWEET_BLACK_BEAN_80',
    variants: [
      {
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: '반찬', variantValue: 'Property 2=시그니처_달콤검은콩자반_80g', confirmedNodeId: '2008:3731' },
        assetKey: 'SIMPLE_SIGNATURE_SWEET_BLACK_BEAN_80',
        status: 'confirmed',
      },
    ],
  },
  {
    productCode: 'SIMPLE_SIGNATURE_SPICY_PERILLA_LEAF_80',
    variants: [
      {
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: '반찬', variantValue: 'Property 2=시그니처_매콤깻잎무침_80g', confirmedNodeId: '2008:3733' },
        assetKey: 'SIMPLE_SIGNATURE_SPICY_PERILLA_LEAF_80',
        status: 'confirmed',
      },
    ],
  },
  {
    productCode: 'SIMPLE_SIGNATURE_CRISPY_LOTUS_ROOT_80',
    variants: [
      {
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: '반찬', variantValue: 'Property 2=시그니처_아삭연근조림_80g', confirmedNodeId: '2008:3741' },
        assetKey: 'SIMPLE_SIGNATURE_CRISPY_LOTUS_ROOT_80',
        status: 'confirmed',
      },
    ],
  },
  {
    productCode: 'SIMPLE_SIGNATURE_SHREDDED_SQUID_60',
    variants: [
      {
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: '반찬', variantValue: 'Property 2=시그니처_촉촉진미채볶음_60g', confirmedNodeId: '2008:3743' },
        assetKey: 'SIMPLE_SIGNATURE_SHREDDED_SQUID_60',
        status: 'confirmed',
      },
    ],
  },
  {
    productCode: 'BABY_KIDS_MIXED_VEGETABLE_JUK_170',
    variants: [
      {
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: '본죽키즈죽', variantValue: 'Property 1=본죽키즈_모둠야채죽_170g', confirmedNodeId: '2008:2748' },
        assetKey: 'BABY_KIDS_MIXED_VEGETABLE_JUK_170',
        status: 'confirmed',
      },
    ],
  },
  {
    productCode: 'BABY_KIDS_NUTRITION_CHICKEN_JUK_170',
    variants: [
      {
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: '본죽키즈죽', variantValue: 'Property 1=본죽키즈_영양닭죽_170g', confirmedNodeId: '2008:2750' },
        assetKey: 'BABY_KIDS_NUTRITION_CHICKEN_JUK_170',
        status: 'confirmed',
      },
    ],
  },
  {
    productCode: 'BABY_KIDS_ABALONE_JUK_170',
    variants: [
      {
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: '본죽키즈죽', variantValue: 'Property 1=본죽키즈_튼튼전복죽_170g', confirmedNodeId: '2008:2752' },
        assetKey: 'BABY_KIDS_ABALONE_JUK_170',
        status: 'confirmed',
      },
    ],
  },
  {
    productCode: 'BABY_KIDS_HANWOO_VEGETABLE_JUK_170',
    variants: [
      {
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: '본죽키즈죽', variantValue: 'Property 1=본죽키즈_한우야채죽_170g', confirmedNodeId: '2008:2754' },
        assetKey: 'BABY_KIDS_HANWOO_VEGETABLE_JUK_170',
        status: 'confirmed',
      },
    ],
  },
  {
    productCode: 'BABY_ORGANIC_RICE_PUFF_RED_30',
    variants: [
      {
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: '유기농쌀과자퍼프', variantValue: 'Property 1=베이비본죽_유기농쌀과자퍼프_레드_30g', confirmedNodeId: '2008:2757' },
        assetKey: 'BABY_ORGANIC_RICE_PUFF_RED_30',
        status: 'confirmed',
      },
    ],
  },
  {
    productCode: 'BABY_ORGANIC_RICE_PUFF_YELLOW_30',
    variants: [
      {
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: '유기농쌀과자퍼프', variantValue: 'Property 1=베이비본죽_유기농쌀과자퍼프_옐로우_30g', confirmedNodeId: '2008:2759' },
        assetKey: 'BABY_ORGANIC_RICE_PUFF_YELLOW_30',
        status: 'confirmed',
      },
    ],
  },
  {
    productCode: 'BABY_ORGANIC_RICE_PUFF_PURPLE_30',
    variants: [
      {
        assetKind: 'package',
        source: { kind: 'component-variant', componentName: '유기농쌀과자퍼프', variantValue: 'Property 1=베이비본죽_유기농쌀과자퍼프_퍼플_30g', confirmedNodeId: '2008:2761' },
        assetKey: 'BABY_ORGANIC_RICE_PUFF_PURPLE_30',
        status: 'confirmed',
      },
    ],
  },

  // --- 애매해서 보류(등록 안 함) — 필요시 다음 배치에서 확인 후 등록 ---
  // - 쇠고기장조림170_코스트코(2008:3807)/그 박스형(2008:3809): 특정 유통사(코스트코) 전용
  //   패키징으로 보여 별도 SKU인지 기존 상품의 포장 변형일 뿐인지 불명확.
  // - 신선집중_메추리알장조림_1kg(2008:3765): 브랜드가 "본죽"이 아니라 "신선집중"이라 이
  //   레지스트리(전부 본죽/베이비본죽) 범위에 포함되는 상품인지 확인 필요.
  // - 미니_본쇠고기장조림_박스_RE(2008:3800): SIMPLE_MINI_BEEF_JANGJORIM_70과 동일 상품의
  //   박스 포장일 가능성이 높으나 용량 표기가 없어 확정하지 않음.
  // - "상세정보" 프레임의 F01~F04/G01~G02(2008:3620~3630, 제주안심/헬시 장조림 120~130g
  //   시리즈)는 데이터는 깨끗하지만 이번 배치 크기(20~30개) 안에서 우선순위상 제외 — 다음
  //   배치 후보로 남겨둔다.
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
