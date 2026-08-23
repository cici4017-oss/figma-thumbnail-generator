import type { LayoutDefinition } from '../domain/layout';

/**
 * 실제 Figma(네이버_소고기장조림130_1/3/5/10, fileKey v6UalGGplex8w2hzfbqwhI)에서
 * screenshot + node 구조(rounded-rectangle "image NNN" 레이어 수)로 실제 판매상품 슬롯 수와
 * 배치가 프레임 이름의 수량과 일치하는 것을 확인한 뒤 등록한 verified Layout이다.
 * 냉동/실온/파우치 같은 보관 라벨, 로고 색상 등은 슬롯이 아니라 옵션이므로 판매 슬롯 수
 * 산정에서 제외했다(기존 원칙 그대로).
 *
 * match 조건은 아직 모두 네이버(1000x1000, square) 채널 기준으로만 확인되었다 — 다른
 * 채널/aspectRatioFamily로 확장하려면 별도 확인이 필요하다.
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
 */
