import type { LayoutDefinition } from '../domain/layout';

/**
 * 파일럿 범위: LAYOUT_02(TRIPLE_CASCADE)만 정의한다.
 * 대표 Figma frame: 네이버_소고기장조림130_3 (node 69:417)
 * 다른 LAYOUT_01, 03~11은 파일럿 검증 후 추가.
 */
export const LAYOUTS: LayoutDefinition[] = [
  {
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
  },
];
