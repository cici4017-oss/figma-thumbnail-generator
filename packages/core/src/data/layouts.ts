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
    // 대표 Figma frame: 네이버_소고기장조림130_10 (node 69:353) — 중앙 대형 1개 + 주변 9개 클러스터, 10슬롯 확인
    layoutKey: 'LAYOUT_04',
    arrangementKind: 'grid-cluster-10',
    slots: Array.from({ length: 10 }, (_, i) => ({ slotKey: `slot_${i + 1}`, role: 'sale' as const })),
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
 * 아직 등록하지 않은 후보(추가 확인 필요) — 코드에는 반영하지 않고 기록만 남긴다:
 * - 네이버_연출_소고기장조림130_1/3/5 (staged 후보): basic 확인 후 반복 사용 가능한 구조인지 조사 예정.
 * - 네이버_대용량메추리알1+1_증정_* (gift 후보, 2슬롯): 상품(대용량메추리알1kg) 자체가 아직 Product Registry에 없음.
 */
