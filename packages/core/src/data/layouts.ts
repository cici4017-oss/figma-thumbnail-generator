import type { LayoutDefinition } from '../domain/layout';

/**
 * 실제 Figma(fileKey v6UalGGplex8w2hzfbqwhI)에서 screenshot + node 구조(rounded-rectangle
 * "image NNN" 레이어 수)로 실제 판매상품 슬롯 수와 배치가 프레임 이름의 수량과 일치하는 것을
 * 확인한 뒤 등록한 verified Layout이다. 냉동/실온/파우치 같은 보관 라벨, 로고 색상 등은
 * 슬롯이 아니라 옵션이므로 판매 슬롯 수 산정에서 제외했다(기존 원칙 그대로).
 *
 * geometryFamilies를 명시해서 aspectRatioFamily(square/wide)만으로는 구분되지 않는 실제
 * 비율까지 정확히 일치해야 매칭되게 한다(예: wide-16x9와 wide-2x1은 둘 다 aspectRatioFamily
 * 'wide'지만 실제 비율/배치가 달라 서로 재사용하지 않는다). LAYOUT_01~04는 네이버
 * 1000x1000(square-1x1) 채널 기준, LAYOUT_05~10은 wide-16x9/wide-2x1 기준으로 확인됐다.
 * channelIds는 지정하지 않는다 — Layout은 channelId가 아니라 geometryFamily가 같은 모든
 * 채널에서 재사용된다(카카오/홈앤쇼핑/제이슨딜이 wide-16x9를 공유하는 것을 실제 조사로 확인).
 */
export const LAYOUTS: LayoutDefinition[] = [
  {
    // 대표 Figma frame: 네이버_소고기장조림130_1 (node 69:307) — image 312 슬롯 1개 확인
    layoutKey: 'LAYOUT_01',
    arrangementKind: 'single-center',
    slots: [{ slotKey: 'slot_1', role: 'sale' }],
    match: {
      productGroups: ['simple-meal'],
      compositions: ['single', 'mixed'],
      aspectRatioFamilies: ['square'],
      geometryFamilies: ['square-1x1'],
      thumbnailTypes: ['basic'],
    },
    priority: 100,
    source: { kind: 'verified' },
  },
  {
    // 대표 Figma frame: 네이버_소고기장조림130_3 (node 69:417) — image 313/409/410 대각선 3슬롯 확인
    layoutKey: 'LAYOUT_02',
    arrangementKind: 'triple-cascade',
    slots: [
      { slotKey: 'slot_1', role: 'sale' },
      { slotKey: 'slot_2', role: 'sale' },
      { slotKey: 'slot_3', role: 'sale' },
    ],
    match: {
      productGroups: ['simple-meal'],
      compositions: ['single', 'mixed'],
      aspectRatioFamilies: ['square'],
      geometryFamilies: ['square-1x1'],
      thumbnailTypes: ['basic'],
    },
    priority: 100,
    source: { kind: 'verified' },
  },
  {
    // 대표 Figma frame: 네이버_소고기장조림130_5 (node 69:442) — 상단 3 + 하단 2 피라미드 배치, 5슬롯 확인
    layoutKey: 'LAYOUT_03',
    arrangementKind: 'penta-pyramid',
    slots: [
      { slotKey: 'slot_1', role: 'sale' },
      { slotKey: 'slot_2', role: 'sale' },
      { slotKey: 'slot_3', role: 'sale' },
      { slotKey: 'slot_4', role: 'sale' },
      { slotKey: 'slot_5', role: 'sale' },
    ],
    match: {
      productGroups: ['simple-meal'],
      compositions: ['single', 'mixed'],
      aspectRatioFamilies: ['square'],
      geometryFamilies: ['square-1x1'],
      thumbnailTypes: ['basic'],
    },
    priority: 100,
    source: { kind: 'verified' },
  },
  {
    // 대표 Figma frame: 네이버_소고기장조림130_10 (node 69:353) — 중앙 대형 1개(node 69:373,
    // "image 321", 549x549) + 주변 소형 9개(node 69:364~69:372, 각 343~344px 균일 크기)로
    // 구성된 main/sub 비대칭 클러스터. 실제 레이어 이름에는 "main"/"sub" 표기가 없어서(전부
    // "image NNN") slot 자체의 role로 명시한다(LayoutSlotRole = 'sale'|'gift'|'main'|'sub',
    // main/sub는 'sale'의 세부 구분 — getSaleSlotCount/assignSlots는 role!=='gift'를 판매
    // 슬롯으로 취급하므로 10개 전부 정상적으로 판매 슬롯 수에 포함된다).
    // V1 정책: assignSlots는 slot_1부터 순서대로 채우므로, Excel 순번이 가장 빠른 상품이
    // slot_1(main, 중앙 대형)에 배정된다. 실제 Figma 바인딩(templateMapper, 아직 미연결)을
    // 붙일 때 slot_1은 반드시 node 69:373("image 321")에, slot_2~10은 나머지 9개 소형
    // 슬롯에 매핑해야 한다.
    layoutKey: 'LAYOUT_04',
    arrangementKind: 'grid-cluster-10',
    slots: [
      { slotKey: 'slot_1', role: 'main' }, // 중앙 대형(549x549) — node 69:373 "image 321"
      { slotKey: 'slot_2', role: 'sub' },
      { slotKey: 'slot_3', role: 'sub' },
      { slotKey: 'slot_4', role: 'sub' },
      { slotKey: 'slot_5', role: 'sub' },
      { slotKey: 'slot_6', role: 'sub' },
      { slotKey: 'slot_7', role: 'sub' },
      { slotKey: 'slot_8', role: 'sub' },
      { slotKey: 'slot_9', role: 'sub' },
      { slotKey: 'slot_10', role: 'sub' },
    ],
    match: {
      productGroups: ['simple-meal'],
      compositions: ['single', 'mixed'],
      aspectRatioFamilies: ['square'],
      geometryFamilies: ['square-1x1'],
      thumbnailTypes: ['basic'],
    },
    priority: 100,
    source: { kind: 'verified' },
  },

  // --- wide-16x9 (카카오 750x422 / 홈앤쇼핑 640x350 / 제이슨딜 720x400 공유) ---
  // 세 채널 모두 "N개 균일 크기 슬롯을 가로로 나란히 배치"하는 동일 구조임을 실제
  // screenshot+node 구조로 확인했다(카카오 1/3/5 직접 확인, 홈앤쇼핑/제이슨딜은 3슬롯으로
  // 교차 확인) — main/sub 구분 없음. channelIds를 지정하지 않아 세 채널 모두에서 재사용된다.
  {
    // 대표 frame: 카카오_750_소고기장조림130_1 (node 69:2292) — image 418 슬롯 1개
    layoutKey: 'LAYOUT_05',
    arrangementKind: 'single-center',
    slots: [{ slotKey: 'slot_1', role: 'sale' }],
    match: {
      productGroups: ['simple-meal'],
      compositions: ['single', 'mixed'],
      aspectRatioFamilies: ['wide'],
      geometryFamilies: ['wide-16x9'],
      thumbnailTypes: ['basic'],
    },
    priority: 100,
    source: { kind: 'verified' },
  },
  {
    // 대표 frame: 카카오_750_소고기장조림130_3 (node 69:2306). 교차 확인:
    // 홈앤쇼핑_640_소고기장조림130_3(69:1872), 제이슨딜_720x400_소고기장조림130_3팩(69:1372)
    // — 세 채널 모두 균일 3슬롯 가로 배치.
    layoutKey: 'LAYOUT_06',
    arrangementKind: 'triple-row',
    slots: [
      { slotKey: 'slot_1', role: 'sale' },
      { slotKey: 'slot_2', role: 'sale' },
      { slotKey: 'slot_3', role: 'sale' },
    ],
    match: {
      productGroups: ['simple-meal'],
      compositions: ['single', 'mixed'],
      aspectRatioFamilies: ['wide'],
      geometryFamilies: ['wide-16x9'],
      thumbnailTypes: ['basic'],
    },
    priority: 100,
    source: { kind: 'verified' },
  },
  {
    // 대표 frame: 카카오_750_소고기장조림130_5 (node 69:2322) — image 418~422 균일 5슬롯 가로 배치
    layoutKey: 'LAYOUT_07',
    arrangementKind: 'penta-row',
    slots: [
      { slotKey: 'slot_1', role: 'sale' },
      { slotKey: 'slot_2', role: 'sale' },
      { slotKey: 'slot_3', role: 'sale' },
      { slotKey: 'slot_4', role: 'sale' },
      { slotKey: 'slot_5', role: 'sale' },
    ],
    match: {
      productGroups: ['simple-meal'],
      compositions: ['single', 'mixed'],
      aspectRatioFamilies: ['wide'],
      geometryFamilies: ['wide-16x9'],
      thumbnailTypes: ['basic'],
    },
    priority: 100,
    source: { kind: 'verified' },
  },

  // --- wide-2x1 (11번가 720x360) ---
  // wide-16x9와 배치 스타일(균일 슬롯 가로열)은 비슷하지만 실제 비율이 뚜렷이 달라(2:1 vs
  // ≈1.8:1) 별도 geometryFamily로 분리했다. 현재 wide-2x1 채널은 11번가 하나뿐이라 다른
  // 채널과의 교차 재사용은 아직 확인되지 않았다.
  {
    // 대표 frame: 11번가_720_소고기장조림130_1 (node 69:1952)
    layoutKey: 'LAYOUT_08',
    arrangementKind: 'single-center',
    slots: [{ slotKey: 'slot_1', role: 'sale' }],
    match: {
      productGroups: ['simple-meal'],
      compositions: ['single', 'mixed'],
      aspectRatioFamilies: ['wide'],
      geometryFamilies: ['wide-2x1'],
      thumbnailTypes: ['basic'],
    },
    priority: 100,
    source: { kind: 'verified' },
  },
  {
    // 대표 frame: 11번가_720_소고기장조림130_3 (node 69:1936) — image 412/413/414 균일 3슬롯
    layoutKey: 'LAYOUT_09',
    arrangementKind: 'triple-row',
    slots: [
      { slotKey: 'slot_1', role: 'sale' },
      { slotKey: 'slot_2', role: 'sale' },
      { slotKey: 'slot_3', role: 'sale' },
    ],
    match: {
      productGroups: ['simple-meal'],
      compositions: ['single', 'mixed'],
      aspectRatioFamilies: ['wide'],
      geometryFamilies: ['wide-2x1'],
      thumbnailTypes: ['basic'],
    },
    priority: 100,
    source: { kind: 'verified' },
  },
  {
    // 대표 frame: 11번가_720_소고기장조림130_5 (node 69:1966) — image 412~416 균일 5슬롯
    layoutKey: 'LAYOUT_10',
    arrangementKind: 'penta-row',
    slots: [
      { slotKey: 'slot_1', role: 'sale' },
      { slotKey: 'slot_2', role: 'sale' },
      { slotKey: 'slot_3', role: 'sale' },
      { slotKey: 'slot_4', role: 'sale' },
      { slotKey: 'slot_5', role: 'sale' },
    ],
    match: {
      productGroups: ['simple-meal'],
      compositions: ['single', 'mixed'],
      aspectRatioFamilies: ['wide'],
      geometryFamilies: ['wide-2x1'],
      thumbnailTypes: ['basic'],
    },
    priority: 100,
    source: { kind: 'verified' },
  },
];

/**
 * 아직 등록하지 않은 후보 — 코드에는 반영하지 않고 기록만 남긴다:
 * - 네이버_연출_소고기장조림130_1/3/5 (node 69:469/69:492/69:517, staged 후보였음): 조사 결과
 *   레이어 이름·위치·크기·렌더링된 이미지까지 각 basic 대응 프레임(69:307/69:417/69:442)과
 *   완전히 동일함(픽셀 단위로 동일한 스크린샷) — "연출"이라는 이름만 있을 뿐 실제로는 basic
 *   프레임의 복제본으로 보이고, staged 고유의 배치/소품/배경 요소가 전혀 없다. 반복 가능한
 *   실제 템플릿으로 확인되지 않았으므로 staged verified 후보에서 제외한다. 실제 staged
 *   디자인은 이 파일에서 아직 발견되지 않은 상태.
 * - 네이버_대용량메추리알1+1_증정_* (gift 후보, 2슬롯): 상품(대용량메추리알1kg) 자체가 아직 Product Registry에 없음.
 * - 토스 600x240(wide-5x2, node 69:2553/69:2588/69:2601 = 1/3/10): 다른 wide와 달리
 *   "image 210"(고정 위치 300x300 hero 이미지, 수량과 무관하게 세 프레임 모두 x=15,y=-60,
 *   w=300,h=300로 동일) + 원형 마스크 아이콘("Mask group") + N개의 소형 패키지 슬롯("image
 *   420~"), 총 3종류의 서로 다른 이미지 레이어가 섞여 있다. hero 이미지가 수량과 무관하게
 *   고정이라 배경/브랜딩 요소로 보이지만, 상품이 바뀌면 이 hero도 함께 바뀌어야 하는지(즉
 *   "수량과 무관한 1개의 대표 상품 슬롯"인지) 확인되지 않았다 — 이는 지금까지의 "슬롯 수 =
 *   판매수량" 1:1 모델과 다른 새로운 슬롯 개념이 필요할 수 있어 임의로 결정하지 않는다.
 *   또한 "_3"과 "_낱개_3" 두 계열의 이름이 병존하고(69:2588 vs 69:2569), "_낱개_3"에는
 *   같은 위치(x=350,y=24)에 겹친 중복 레이어(image 424/425)가 있어 명명/데이터 자체도
 *   정리가 덜 된 상태로 보인다. 따라서 wide-5x2는 verified Layout을 등록하지 않고 현재
 *   generated fallback 정책을 그대로 사용한다 — 추가 확인(hero 슬롯의 실제 역할, 두 계열
 *   중 어느 쪽이 표준인지) 후 재검토가 필요하다.
 */
