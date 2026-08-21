import { MockNode, type MockFigmaHandle } from './mockFigma';
import type { FigmaTemplateBinding } from '../templateMapper';

/**
 * 실제 회사 Figma 파일과 "같은 구조"(프레임 하나 안에 이미지 슬롯 레이어 여러 개 + 별도
 * PRODUCT_ASSETS 페이지)를 갖되, 이름/이미지는 전부 가짜인 최소 mock 문서.
 *
 * 실제 회사 데이터(프레임 이름 "네이버_소고기장조림130_3", 레이어 이름 "image 313" 등)는
 * 절대 여기 들어오지 않는다 — 이 파일은 회사 Figma 파일 없이 개발/테스트하기 위한 것이다.
 * 실제 회사 바인딩은 templateMapper.ts의 FIGMA_TEMPLATE_BINDINGS를 본다.
 */

export const MOCK_TEMPLATE_FRAME_NAME = 'MOCK_썸네일_3종';
export const MOCK_SLOT_LAYER_NAMES = ['mock_slot_1', 'mock_slot_2', 'mock_slot_3'] as const;
export const MOCK_PRODUCT_ASSETS_PAGE_NAME = 'PRODUCT_ASSETS';

export interface MockProductSeed {
  key: string;
  imageHash: string;
}

export const MOCK_PRODUCTS: MockProductSeed[] = [
  { key: 'MOCK_PRODUCT_A', imageHash: 'mockhash-a' },
  { key: 'MOCK_PRODUCT_B', imageHash: 'mockhash-b' },
  { key: 'MOCK_PRODUCT_C', imageHash: 'mockhash-c' },
];

/** mock 문서에 LAYOUT_02 구조(슬롯 3개)의 템플릿 프레임 + PRODUCT_ASSETS 페이지를 채운다. */
export function seedMockTemplate(handle: MockFigmaHandle): void {
  const templateFrame = new MockNode('FRAME', MOCK_TEMPLATE_FRAME_NAME);
  templateFrame.width = 1000;
  templateFrame.height = 1000;

  MOCK_SLOT_LAYER_NAMES.forEach((layerName, i) => {
    const slot = new MockNode('RECTANGLE', layerName);
    slot.width = 300;
    slot.height = 300;
    slot.x = i * 320;
    slot.y = 350;
    // 처음엔 이미지가 아니라 임의의 색 fill — 렌더러가 실제로 IMAGE로 "교체"하는지 확인하기 위함.
    slot.fills = [{ type: 'SOLID' }];
    templateFrame.appendChild(slot);
  });

  handle.currentPage.appendChild(templateFrame);

  const productAssetsPage = handle.addPage(MOCK_PRODUCT_ASSETS_PAGE_NAME);
  for (const product of MOCK_PRODUCTS) {
    const node = new MockNode('RECTANGLE', product.key);
    node.width = 400;
    node.height = 400;
    node.fills = [{ type: 'IMAGE', imageHash: product.imageHash, scaleMode: 'FILL' }];
    productAssetsPage.appendChild(node);
  }
}

/** core의 LAYOUT_02(슬롯 3개)를 mock 프레임/레이어에 연결하는 바인딩. */
export const MOCK_TEMPLATE_BINDING: FigmaTemplateBinding = {
  layoutKey: 'LAYOUT_02',
  channelPresetId: 'naver-1000x1000',
  templateFrameName: MOCK_TEMPLATE_FRAME_NAME,
  slotBindings: [
    { slotKey: 'slot_1', layerName: MOCK_SLOT_LAYER_NAMES[0] },
    { slotKey: 'slot_2', layerName: MOCK_SLOT_LAYER_NAMES[1] },
    { slotKey: 'slot_3', layerName: MOCK_SLOT_LAYER_NAMES[2] },
  ],
};
