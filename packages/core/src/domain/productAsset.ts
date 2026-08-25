/**
 * 실제 Figma 조사 결과, 한 상품의 실제 이미지 asset은 한 종류가 아니라 여러 종류로
 * 존재한다(예: 파우치 패키지 정면샷과, 그릇에 담긴 플레이팅 컷). 그래서 productCode →
 * assetKey 1:1 매핑 대신, productCode → "여러 종류의 asset variant" 구조로 확장한다.
 *
 * V1 basic 검증된 썸네일(네이버 1/3/5/10 등)은 실제로는 항상 'package'만 사용한다는 것을
 * 확인했다(read-only 조사, DEFAULT_PRODUCT_ASSET_KIND 참고) — 'plated-side'/'plated-top'은
 * 지금 당장 basic 생성에 쓰이지 않지만, 향후 staged 썸네일 등에 쓰일 수 있어 구조는 미리
 * 지원해 둔다.
 */
export type ProductAssetKind = 'package' | 'plated-side' | 'plated-top';

/**
 * V1 basic 썸네일이 기본으로 쓰는 asset 종류. 실제 verified Layout(LAYOUT_01~10)이 참조하는
 * 네이버 소고기장조림130/메추리알장조림180/부추꼬막무침240 프레임을 screenshot으로 직접
 * 확인한 결과, 셋 다 파우치 패키지 사진만 쓰고 있었다(플레이팅 컷 없음).
 */
export const DEFAULT_PRODUCT_ASSET_KIND: ProductAssetKind = 'package';

/**
 * asset을 실제로 어떻게 찾는지에 대한 두 가지 방식.
 * - 'component-variant': Figma 컴포넌트/컴포넌트셋의 이름 + variant property 값으로 찾는다
 *   (예: "Property 1=소고기장조림_측"). node-id 하나에만 의존하지 않는 이유는, variant
 *   component의 실제 node-id는 라이브러리가 업데이트되거나 인스턴스가 재배치되면 바뀔 수
 *   있지만 컴포넌트/variant 이름은 상대적으로 안정적이기 때문이다. 실제로 확인된 node-id가
 *   있으면 confirmedNodeId에 참고용으로만 남긴다(조회 키가 아니라 검증 기록).
 * - 'image-node': 특정 페이지의 특정 노드(예: PRODUCT_ASSETS 페이지의 "image NNN" 레이어)를
 *   node-id로 직접 참조한다. 지금까지의 실제 완성 썸네일 프레임(네이버_소고기장조림130_3 등)
 *   내부의 "image NNN" 슬롯 레이어가 이 방식에 해당한다.
 */
export type ProductAssetSource =
  | {
      kind: 'component-variant';
      /** Figma 컴포넌트/컴포넌트셋 이름, 또는 (variant set이 아닌 단일 named instance인 경우)
       * 그 instance 자신의 이름. */
      componentName: string;
      /** variant property 값(예: "Property 1"의 값). 컴포넌트가 이름 자체로만 구분되고
       * 별도 variant 축이 없으면 생략한다. */
      variantValue?: string;
      /** 실제로 확인된 node-id. 조회에는 쓰지 않고 검증 기록으로만 보존한다(optional). */
      confirmedNodeId?: string;
    }
  | {
      kind: 'image-node';
      nodeId: string;
      /** 그 노드가 있는 페이지 이름(선택, 탐색 편의용) */
      pageName?: string;
    };

/**
 * 같은 Layout 슬롯에 서로 다른 product asset이 들어가도 눈에 보이는 패키지 점유율이 비슷하게
 * 보이도록 렌더 시점에 보정하는 값. Layout slot 자체의 좌표/크기는 절대 바꾸지 않고, 슬롯
 * 안에서 이미지를 얼마나 확대/이동해서 보여줄지만 조정한다(렌더러가 IMAGE fill을
 * scaleMode:'CROP' + imageTransform으로 적용— assetResolver.ts/renderer.ts 참고).
 *
 * 실제 조사 결과, Figma 노드 크기만으로는(예: 743x743 vs 327x327 컴포넌트) 실제 패키지 사진이
 * 프레임을 얼마나 채우는지 알 수 없었다(같은 정사각형 안에서도 상품명 텍스트/브랜드 영역이
 * 차지하는 비중이 상품마다 다르게 baked-in 되어 있음 — Figma Plugin API로는 이미지 픽셀 내용을
 * 분석할 수 없어 자동 정규화가 불가능함을 확인했다). 그래서 이 값은 상품별로 실제 screenshot을
 * 비교해서 수동으로 보정한다.
 */
export interface ProductAssetPresentation {
  /**
   * 1.0 = 보정 없음(기존과 동일, scaleMode:'FILL'). 1보다 크면 확대(=패키지가 상대적으로 작아
   * 보이는 상품을 더 크게 보이도록), 1보다 작으면 축소한다. 축소(<1)는 이미지 원본 경계 밖을
   * 샘플링할 수 있어(edge 아티팩트) 실제 screenshot으로 반드시 확인 후 사용해야 한다.
   */
  visualScale?: number;
  /** 확대/축소 중심을 좌우로 미세 조정(정규화 좌표, 0=중앙). 기본 0. */
  offsetX?: number;
  /** 확대/축소 중심을 상하로 미세 조정(정규화 좌표, 0=중앙). 기본 0. */
  offsetY?: number;
}

export interface ProductAssetVariant {
  assetKind: ProductAssetKind;
  source: ProductAssetSource;
  /** 렌더러가 최종적으로 쓰는 opaque 참조. */
  assetKey: string;
  /**
   * 'code-fallback': 아직 실제 asset을 완전히 확정하지 못해 잠정값을 쓰는 상태.
   * 'confirmed': screenshot/구조 확인을 거쳐 실제 asset으로 확정된 상태.
   * 'rejected': screenshot/구조 확인 결과 이 source가 실제로는 요청한 assetKind(예: package
   *   누끼샷)가 아님이 확인된 상태(예: 조리 이미지+상품명이 포함된 상세페이지 컷). 올바른
   *   asset을 찾기 전까지는 렌더러가 이 variant를 사용하지 않고 명확히 실패를 반환해야 한다
   *   (추측 대체 금지 — assetResolver.ts가 이 상태를 확인해서 즉시 reviewRequired 경로로
   *   보낸다).
   */
  status: 'code-fallback' | 'confirmed' | 'rejected';
  note?: string;
  /** 렌더 시점 시각적 크기 보정(선택, package assetKind에서 주로 사용). */
  presentation?: ProductAssetPresentation;
}

export interface ProductAssetBinding {
  productCode: string;
  /** 한 상품이 가질 수 있는 여러 종류의 asset. 최소 1개는 있어야 도메인 Product로 변환 가능. */
  variants: ProductAssetVariant[];
}
