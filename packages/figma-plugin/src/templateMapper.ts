/**
 * layoutKey + channelPresetId ↔ 실제 Figma 리소스 연결부.
 * Figma에 대한 지식은 core가 아니라 이 파일에만 있어야 한다.
 *
 * 주의: 원본 노드(69:307, 69:417 ...)는 Figma의 COMPONENT가 아니라 일반 FRAME이다.
 * 따라서 createInstance()가 아니라 frame.clone()으로 복제한다.
 */

export interface FigmaSlotBinding {
  /** core LayoutSlot.slotKey와 매칭 */
  slotKey: string;
  /** 복제된 프레임 안에서 찾을 실제 레이어 이름 */
  layerName: string;
  /**
   * 같은 layerName을 가진 레이어가 한 프레임 안에 여러 개 있을 때(실제 조사에서 발견됨 —
   * 예: 쿠팡/옥션/롯데온 등 일부 채널 프레임은 슬롯마다 고유 이름을 쓰지 않고 전부 같은
   * 이름("메추리알장조림1808"/"image 626" 등)을 재사용한다), 문서 트리 순회 순서(0-based,
   * depth-first)로 몇 번째 것을 이 슬롯으로 쓸지 지정한다. 생략하면 기존과 동일하게
   * findOne(=첫 번째로 찾은 노드)을 쓴다 — 하위 호환.
   */
  layerIndex?: number;
}

export interface FigmaTemplateBinding {
  layoutKey: string;
  channelPresetId: string;

  /** V1 source of truth: 현재 열린 파일의 프레임 이름으로 조회 */
  templateFrameName: string;
  /** 동명 프레임이 여럿일 때 명확화용 (있으면 nodeId를 우선 사용) */
  templateFrameNodeId?: string;
  /** V1 미사용. 향후 Team Library 컴포넌트로 전환할 때 사용 */
  libraryComponentKey?: string;

  slotBindings: FigmaSlotBinding[];
  badgeLayerName?: string;
  storageLabelLayerNamesByType?: Record<string, string>;
  logoLayerNamesByVariant?: Record<'red' | 'gray', string>;
}

/**
 * ⚠ PRODUCTION 전용 데이터 — 실제 회사 Figma 파일(프레임 "네이버_소고기장조림130_3" 등)을 가리킨다.
 *
 * 개발 단계에서는 이 바인딩이 실제로 동작하는 것을 전제로 하지 않는다: 회사 PC는 개발 중인
 * 플러그인 파일을 자유롭게 반입할 수 없고, 회사 Figma 파일도 외부로 반출할 수 없기 때문이다.
 * 로컬(집/외부) 개발·테스트는 src/mock의 mock Figma + mock 템플릿/에셋으로 한다
 * (packages/figma-plugin/test/assetMapping.test.ts 참고, `npm run test`로 실행).
 *
 * 이 바인딩을 실제로 company Figma에서 실행하는 것은 개발 완료 후 별도의 승인/배포 단계에서만
 * 이루어진다 — 자세한 내용은 저장소 루트 README.md의 "개발 단계 vs 배포 단계" 참고.
 *
 * 원칙(중요 — 재발 방지):
 * - LayoutDefinition(logical Layout, core/data/layouts.ts)은 geometryFamily가 같으면 여러
 *   채널에서 재사용될 수 있다. 이건 "배치 구조가 같다"는 뜻일 뿐이다.
 * - FIGMA_TEMPLATE_BINDINGS는 그와 별개로 channelPresetId마다 실제로 확인된 실제 Figma
 *   frame을 각각 가리켜야 한다. 로고/배경/기존 디자인 요소가 채널마다 다른 실제 template이기
 *   때문에, 같은 layoutKey라도 다른 channelPresetId에는 절대 같은 frame을 재사용하지 않는다
 *   (한 번 naver의 69:417을 kakao-1000x1000에도 재사용하도록 잘못 연결했다가 발견해 수정한 적
 *   있음 — logical Layout 재사용과 physical Figma template 재사용을 혼동하지 말 것).
 * - 그래서 아래 목록은 "해당 channelPreset의 실제 frame이 read-only 조사로 확인된 것만" 담는다.
 *   확인되지 않은 channelPreset은 같은 geometryFamily/layoutKey라도 바인딩하지 않는다.
 *
 * 전부 fileKey v6UalGGplex8w2hzfbqwhI("썸네일 (Copy)")를 Figma MCP로 read-only 조사해서
 * 확인한 실제 프레임/레이어 이름이다. 페이지 목록은 get_metadata가 아니라 Plugin API
 * figma.root.children 기준으로 확인했다 — get_metadata(nodeId 없이 호출)는 문서의 페이지
 * 전체를 반환하지 않는 것으로 확인됐다(실제로는 13개 페이지가 있고, 검증된 template frame은
 * 전부 "장조림" 페이지에 있다).
 *
 * generated Layout(예: GENERATED_PYRAMID-STACK_9)은 실제 프레임이 없으므로 의도적으로
 * 바인딩하지 않는다 — resolveTemplate이 undefined를 반환하고 renderPlan이 "템플릿 매핑이
 * 없습니다"로 명확히 실패하는 것이 맞는 동작이다(임의로 다른 템플릿을 대신 쓰지 않음).
 */
export const FIGMA_TEMPLATE_BINDINGS: FigmaTemplateBinding[] = [
  // --- naver-1000x1000 (square-1x1) ---
  {
    layoutKey: 'LAYOUT_01',
    channelPresetId: 'naver-1000x1000',
    templateFrameName: '네이버_소고기장조림130_1',
    templateFrameNodeId: '69:307',
    slotBindings: [{ slotKey: 'slot_1', layerName: 'image 312' }],
  },
  {
    layoutKey: 'LAYOUT_02',
    channelPresetId: 'naver-1000x1000',
    templateFrameName: '네이버_소고기장조림130_3',
    templateFrameNodeId: '69:417',
    slotBindings: [
      { slotKey: 'slot_1', layerName: 'image 313' },
      { slotKey: 'slot_2', layerName: 'image 409' },
      { slotKey: 'slot_3', layerName: 'image 410' },
    ],
  },
  {
    layoutKey: 'LAYOUT_03',
    channelPresetId: 'naver-1000x1000',
    templateFrameName: '네이버_소고기장조림130_5',
    templateFrameNodeId: '69:442',
    slotBindings: [
      { slotKey: 'slot_1', layerName: 'image 411' },
      { slotKey: 'slot_2', layerName: 'image 412' },
      { slotKey: 'slot_3', layerName: 'image 413' },
      { slotKey: 'slot_4', layerName: 'image 414' },
      { slotKey: 'slot_5', layerName: 'image 415' },
    ],
  },
  {
    // slot_1(main, 중앙 대형 549x549) = "image 321"(69:373). slot_2~10(sub, 소형 9개)은
    // 레이어 이름의 숫자 순서(image 312~320)로 결정론적으로 매핑했다 — 물리적 위치가 role별로
    // 구분되어 있지 않아(전부 "sub"), 어떤 소형 슬롯이 어떤 slotKey인지는 배치상 의미가 없다.
    layoutKey: 'LAYOUT_04',
    channelPresetId: 'naver-1000x1000',
    templateFrameName: '네이버_소고기장조림130_10',
    templateFrameNodeId: '69:353',
    slotBindings: [
      { slotKey: 'slot_1', layerName: 'image 321' },
      { slotKey: 'slot_2', layerName: 'image 312' },
      { slotKey: 'slot_3', layerName: 'image 313' },
      { slotKey: 'slot_4', layerName: 'image 314' },
      { slotKey: 'slot_5', layerName: 'image 315' },
      { slotKey: 'slot_6', layerName: 'image 316' },
      { slotKey: 'slot_7', layerName: 'image 317' },
      { slotKey: 'slot_8', layerName: 'image 318' },
      { slotKey: 'slot_9', layerName: 'image 319' },
      { slotKey: 'slot_10', layerName: 'image 320' },
    ],
  },

  // --- kakao-1000x1000 (square-1x1) ---
  {
    // 카카오 square 3슬롯의 실제 frame은 "카카오_1000_소고기장조림130_3"(69:2368)이다
    // (네이버의 69:417과는 별개 frame).
    layoutKey: 'LAYOUT_02',
    channelPresetId: 'kakao-1000x1000',
    templateFrameName: '카카오_1000_소고기장조림130_3',
    templateFrameNodeId: '69:2368',
    slotBindings: [
      { slotKey: 'slot_1', layerName: 'image 416' },
      { slotKey: 'slot_2', layerName: 'image 417' },
      { slotKey: 'slot_3', layerName: 'image 418' },
    ],
  },

  // --- kakao-750x422 (wide-16x9) ---
  {
    layoutKey: 'LAYOUT_05',
    channelPresetId: 'kakao-750x422',
    templateFrameName: '카카오_750_소고기장조림130_1',
    templateFrameNodeId: '69:2292',
    slotBindings: [{ slotKey: 'slot_1', layerName: 'image 418' }],
  },
  {
    layoutKey: 'LAYOUT_06',
    channelPresetId: 'kakao-750x422',
    templateFrameName: '카카오_750_소고기장조림130_3',
    templateFrameNodeId: '69:2306',
    slotBindings: [
      { slotKey: 'slot_1', layerName: 'image 418' },
      { slotKey: 'slot_2', layerName: 'image 419' },
      { slotKey: 'slot_3', layerName: 'image 420' },
    ],
  },
  {
    layoutKey: 'LAYOUT_07',
    channelPresetId: 'kakao-750x422',
    templateFrameName: '카카오_750_소고기장조림130_5',
    templateFrameNodeId: '69:2322',
    slotBindings: [
      { slotKey: 'slot_1', layerName: 'image 418' },
      { slotKey: 'slot_2', layerName: 'image 419' },
      { slotKey: 'slot_3', layerName: 'image 420' },
      { slotKey: 'slot_4', layerName: 'image 421' },
      { slotKey: 'slot_5', layerName: 'image 422' },
    ],
  },

  // --- 11st-720x360 (wide-2x1) ---
  // home-and-shopping/jasondeal(wide-16x9)과 달리 wide-2x1 채널은 11번가 하나뿐이라
  // 다른 채널과의 교차 재사용은 확인되지 않았다(layouts.ts 주석 참고) — 11번가 실제
  // frame만 바인딩한다.
  {
    layoutKey: 'LAYOUT_08',
    channelPresetId: '11st-720x360',
    templateFrameName: '11번가_720_소고기장조림130_1',
    templateFrameNodeId: '69:1952',
    slotBindings: [{ slotKey: 'slot_1', layerName: 'image 413' }],
  },
  {
    layoutKey: 'LAYOUT_09',
    channelPresetId: '11st-720x360',
    templateFrameName: '11번가_720_소고기장조림130_3',
    templateFrameNodeId: '69:1936',
    slotBindings: [
      { slotKey: 'slot_1', layerName: 'image 412' },
      { slotKey: 'slot_2', layerName: 'image 413' },
      { slotKey: 'slot_3', layerName: 'image 414' },
    ],
  },
  {
    layoutKey: 'LAYOUT_10',
    channelPresetId: '11st-720x360',
    templateFrameName: '11번가_720_소고기장조림130_5',
    templateFrameNodeId: '69:1966',
    slotBindings: [
      { slotKey: 'slot_1', layerName: 'image 412' },
      { slotKey: 'slot_2', layerName: 'image 413' },
      { slotKey: 'slot_3', layerName: 'image 414' },
      { slotKey: 'slot_4', layerName: 'image 415' },
      { slotKey: 'slot_5', layerName: 'image 416' },
    ],
  },

  // --- 채널 확장(2026-08-24): SSG/쿠팡/옥션/지마켓/SK스토아/NS홈쇼핑/알리익스프레스/SKT딜/
  // 올웨이즈/이랜드몰/롯데온을 우선순위대로 read-only 조사했다. "썸네일 (Copy)"의 "장조림"/
  // "간편식_요리" 페이지에서 소고기장조림130/메추리알장조림180/부추꼬막무침240 계열의 실제
  // 프레임을 프레임 이름이 아니라 실제 자식 레이어 구조(+screenshot)로 확인한 결과만 아래에
  // 담는다. 이름만 믿고 넘어간 게 아니라, 다음처럼 이름과 실제 구조가 불일치하는 사례를
  // 다수 발견해서 그런 프레임은 전부 제외했다:
  // - SSG_1000_소고기장조림130_3/5, SSG_1000_메추리알장조림180_10: 셋 다 실제 슬롯은
  //   image 312 "1개"뿐이고(screenshot으로 확인 — 실제로는 상품 1개 + "×3/×5/×10" 수량
  //   뱃지 스티커였다), 슬롯이 여러 개가 아니다 → SSG는 이번 배치에서 바인딩하지 않음
  //   (진짜 1/3/5/10 다중 슬롯 프레임이 하나도 확인되지 않음).
  // - 이랜드몰_1000_메추리알장조림180_5/10: 두 프레임이 완전히 동일한 구조(image 312 1개 +
  //   메추리알장조림1808 1개, 총 2개)라 "_5"/"_10"이 실제 슬롯 수와 맞지 않음 → 제외.
  // - 쿠팡_1000_메추리알장조림180_10: "_5"와 완전히 동일한 구조(메추리알장조림1808 5개)라
  //   실제로는 5슬롯인데 "_10"으로 잘못 표기됨 → 제외.
  // - 쿠팡알리_1000_소고기장조림130_5: image 411이 없이 4개 슬롯뿐(screenshot에서도 4개만
  //   보임) → "_5"로 표기됐지만 실제 5슬롯이 아니라서 제외.
  // - SK스토아/NS홈쇼핑/SKT딜: 파일 전체(장조림/간편식_요리/간편식_죽/간편식_채널_믹스/
  //   Page 12/Page 16/시뮬/영유아_* 전 페이지)를 조사했지만, 등록된 3개 상품(소고기장조림130/
  //   메추리알장조림180/부추꼬막무침240) 계열의 실제 프레임을 하나도 찾지 못했다(SK스토아는
  //   완전히 다른 상품 "본케어 고단백 영양죽"의 760x360 wide 프레임만 있음). 이번엔 바인딩
  //   추가 없음.
  //
  // 일부 채널(쿠팡/옥션/롯데온 등)은 슬롯마다 고유 레이어 이름을 쓰지 않고 전부 같은 이름
  // ("메추리알장조림1808"/"image 626")을 재사용한다 — 이 경우 layerIndex(문서 트리 순회
  // 순서, 0-based)로 슬롯을 구분한다(FigmaSlotBinding.layerIndex 참고).
  //
  // "쿠팡알리_..." 프레임은 실제 프레임 이름 자체가 두 채널(쿠팡+알리익스프레스) 공용 디자인임을
  // 선언하고 있어서, 쿠팡에 더 적합한 전용 프레임이 없는 수량(1)에 한해 두 channelPresetId에
  // 동일 노드를 물리적으로 공유해서 바인딩했다 — 네이버 프레임을 다른 채널에 임의로 재사용한
  // 것과는 다르다(그 프레임 자체가 "이 두 채널 공용"이라고 이름으로 확인됨).

  // --- gmarket-1000x1000 (지마켓) ---
  {
    layoutKey: 'LAYOUT_01',
    channelPresetId: 'gmarket-1000x1000',
    templateFrameName: '지마켓_1000_소고기장조림130_1',
    templateFrameNodeId: '69:648',
    slotBindings: [{ slotKey: 'slot_1', layerName: 'image 312' }],
  },
  {
    layoutKey: 'LAYOUT_02',
    channelPresetId: 'gmarket-1000x1000',
    templateFrameName: '지마켓_1000_소고기장조림130_3',
    templateFrameNodeId: '69:544',
    slotBindings: [
      { slotKey: 'slot_1', layerName: 'image 313' },
      { slotKey: 'slot_2', layerName: 'image 409' },
      { slotKey: 'slot_3', layerName: 'image 410' },
    ],
  },
  {
    layoutKey: 'LAYOUT_03',
    channelPresetId: 'gmarket-1000x1000',
    templateFrameName: '지마켓_1000_소고기장조림130_5',
    templateFrameNodeId: '69:569',
    slotBindings: [
      { slotKey: 'slot_1', layerName: 'image 411' },
      { slotKey: 'slot_2', layerName: 'image 412' },
      { slotKey: 'slot_3', layerName: 'image 413' },
      { slotKey: 'slot_4', layerName: 'image 414' },
      { slotKey: 'slot_5', layerName: 'image 415' },
    ],
  },

  // --- auction-1000x1000 (옥션) ---
  {
    layoutKey: 'LAYOUT_01',
    channelPresetId: 'auction-1000x1000',
    templateFrameName: '옥션_1000_소고기장조림130_1',
    templateFrameNodeId: '69:923',
    slotBindings: [{ slotKey: 'slot_1', layerName: 'image 312' }],
  },
  {
    layoutKey: 'LAYOUT_02',
    channelPresetId: 'auction-1000x1000',
    templateFrameName: '옥션_1000_소고기장조림130_3',
    templateFrameNodeId: '69:871',
    slotBindings: [
      { slotKey: 'slot_1', layerName: 'image 313' },
      { slotKey: 'slot_2', layerName: 'image 409' },
      { slotKey: 'slot_3', layerName: 'image 410' },
    ],
  },
  {
    layoutKey: 'LAYOUT_03',
    channelPresetId: 'auction-1000x1000',
    templateFrameName: '옥션_1000_소고기장조림130_5',
    templateFrameNodeId: '69:896',
    slotBindings: [
      { slotKey: 'slot_1', layerName: 'image 411' },
      { slotKey: 'slot_2', layerName: 'image 412' },
      { slotKey: 'slot_3', layerName: 'image 413' },
      { slotKey: 'slot_4', layerName: 'image 414' },
      { slotKey: 'slot_5', layerName: 'image 415' },
    ],
  },
  {
    // 10개 슬롯 전부 동일 레이어 이름("메추리알장조림1808") — layerIndex(0~9, 트리 순회 순서)로 구분.
    layoutKey: 'LAYOUT_04',
    channelPresetId: 'auction-1000x1000',
    templateFrameName: '옥션_1000x1000_메추리알장조림_180_10',
    templateFrameNodeId: '69:18186',
    slotBindings: Array.from({ length: 10 }, (_, i) => ({
      slotKey: `slot_${i + 1}`,
      layerName: '메추리알장조림1808',
      layerIndex: i,
    })),
  },

  // --- coupang-1000x1000 (쿠팡) ---
  {
    // 전용 1슬롯 프레임이 없어 "쿠팡알리_..." 공용 프레임(쿠팡+알리익스프레스)을 그대로 쓴다.
    layoutKey: 'LAYOUT_01',
    channelPresetId: 'coupang-1000x1000',
    templateFrameName: '쿠팡알리_1000_소고기장조림130_1',
    templateFrameNodeId: '69:2011',
    slotBindings: [{ slotKey: 'slot_1', layerName: 'image 312' }],
  },
  {
    // 3슬롯 전부 동일 레이어 이름("메추리알장조림1808") — layerIndex로 구분.
    layoutKey: 'LAYOUT_02',
    channelPresetId: 'coupang-1000x1000',
    templateFrameName: '쿠팡_1000_메추리알장조림180_3',
    templateFrameNodeId: '69:17279',
    slotBindings: [0, 1, 2].map((i) => ({ slotKey: `slot_${i + 1}`, layerName: '메추리알장조림1808', layerIndex: i })),
  },
  {
    layoutKey: 'LAYOUT_03',
    channelPresetId: 'coupang-1000x1000',
    templateFrameName: '쿠팡_1000_메추리알장조림180_5',
    templateFrameNodeId: '69:17307',
    slotBindings: Array.from({ length: 5 }, (_, i) => ({
      slotKey: `slot_${i + 1}`,
      layerName: '메추리알장조림1808',
      layerIndex: i,
    })),
  },

  // --- aliexpress-1000x1000 (알리익스프레스) — 전용 프레임 없음, "쿠팡알리_..." 공용 프레임 사용 ---
  {
    layoutKey: 'LAYOUT_01',
    channelPresetId: 'aliexpress-1000x1000',
    templateFrameName: '쿠팡알리_1000_소고기장조림130_1',
    templateFrameNodeId: '69:2011',
    slotBindings: [{ slotKey: 'slot_1', layerName: 'image 312' }],
  },
  {
    layoutKey: 'LAYOUT_02',
    channelPresetId: 'aliexpress-1000x1000',
    templateFrameName: '쿠팡알리_1000_소고기장조림130_3',
    templateFrameNodeId: '69:2037',
    slotBindings: [
      { slotKey: 'slot_1', layerName: 'image 312' },
      { slotKey: 'slot_2', layerName: 'image 409' },
      { slotKey: 'slot_3', layerName: 'image 410' },
    ],
  },

  // --- alwayz-1000x1000 (올웨이즈) ---
  {
    layoutKey: 'LAYOUT_01',
    channelPresetId: 'alwayz-1000x1000',
    templateFrameName: '올웨이즈_1000_부추꼬막무침240g_1',
    templateFrameNodeId: '69:42563',
    slotBindings: [{ slotKey: 'slot_1', layerName: 'image 626' }],
  },
  {
    // 3슬롯 전부 동일 레이어 이름("image 626") — layerIndex로 구분.
    layoutKey: 'LAYOUT_02',
    channelPresetId: 'alwayz-1000x1000',
    templateFrameName: '올웨이즈_1000_부추꼬막무침240g_3',
    templateFrameNodeId: '69:42612',
    slotBindings: [0, 1, 2].map((i) => ({ slotKey: `slot_${i + 1}`, layerName: 'image 626', layerIndex: i })),
  },

  // --- eland-mall-1000x1000 (이랜드몰) — qty1은 실제 프레임 미확인, qty5/10은 실제로는
  // 슬롯이 2개뿐(이름만 "_5"/"_10")이라 제외. qty3만 바인딩. ---
  {
    layoutKey: 'LAYOUT_02',
    channelPresetId: 'eland-mall-1000x1000',
    templateFrameName: '이랜드몰_1000_부추꼬막무침240g_3',
    templateFrameNodeId: '69:43227',
    slotBindings: [0, 1, 2].map((i) => ({ slotKey: `slot_${i + 1}`, layerName: 'image 626', layerIndex: i })),
  },

  // --- lotte-on-1000x1000 (롯데온) ---
  {
    layoutKey: 'LAYOUT_01',
    channelPresetId: 'lotte-on-1000x1000',
    templateFrameName: '롯데온_1000_부추꼬막무침240g_1',
    templateFrameNodeId: '69:42932',
    slotBindings: [{ slotKey: 'slot_1', layerName: 'image 626' }],
  },
  {
    layoutKey: 'LAYOUT_02',
    channelPresetId: 'lotte-on-1000x1000',
    templateFrameName: '롯데온_1000_부추꼬막무침240g_3',
    templateFrameNodeId: '69:42981',
    slotBindings: [0, 1, 2].map((i) => ({ slotKey: `slot_${i + 1}`, layerName: 'image 626', layerIndex: i })),
  },
  {
    layoutKey: 'LAYOUT_03',
    channelPresetId: 'lotte-on-1000x1000',
    templateFrameName: '롯데온_1000_메추리알장조림180_5',
    templateFrameNodeId: '69:18924',
    slotBindings: Array.from({ length: 5 }, (_, i) => ({
      slotKey: `slot_${i + 1}`,
      layerName: '메추리알장조림1808',
      layerIndex: i,
    })),
  },
  {
    layoutKey: 'LAYOUT_04',
    channelPresetId: 'lotte-on-1000x1000',
    templateFrameName: '롯데온_1000_메추리알장조림180_10',
    templateFrameNodeId: '69:18951',
    slotBindings: Array.from({ length: 10 }, (_, i) => ({
      slotKey: `slot_${i + 1}`,
      layerName: '메추리알장조림1808',
      layerIndex: i,
    })),
  },
];

export function resolveTemplate(
  layoutKey: string,
  channelPresetId: string,
  bindings: FigmaTemplateBinding[] = FIGMA_TEMPLATE_BINDINGS,
): FigmaTemplateBinding | undefined {
  return bindings.find((b) => b.layoutKey === layoutKey && b.channelPresetId === channelPresetId);
}
