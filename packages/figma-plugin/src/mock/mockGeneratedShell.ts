import { MockNode, type MockFigmaHandle } from './mockFigma';
import type { GeneratedRendererSupport } from '../generatedRenderer';
import { SUPPORTED_GENERATED_FAMILIES } from '../generatedLayoutGeometry';

/**
 * generatedRenderer.ts가 clone하는 "base shell"(로고/배경/고정 요소 + 기존 상품 슬롯 1개)을
 * 회사 Figma 파일 없이 재현하는 mock. 실제 회사 데이터(네이버_소고기장조림130_1, "image 312" 등)는
 * 여기 들어오지 않는다 — 실제 바인딩은 generatedRenderer.ts의 GENERATED_RENDERER_SUPPORT를 본다.
 */

export const MOCK_SHELL_FRAME_NAME = 'MOCK_GENERATED_SHELL';
export const MOCK_SHELL_FIXED_LOGO_NAME = 'mock_logo';
export const MOCK_SHELL_EXISTING_SLOT_NAME = 'mock_existing_slot';

export function seedMockGeneratedShell(handle: MockFigmaHandle): void {
  const shell = new MockNode('FRAME', MOCK_SHELL_FRAME_NAME);
  shell.width = 1000;
  shell.height = 1000;

  const logo = new MockNode('RECTANGLE', MOCK_SHELL_FIXED_LOGO_NAME);
  logo.x = 10;
  logo.y = 10;
  logo.width = 100;
  logo.height = 40;
  logo.fills = [{ type: 'SOLID' }];
  shell.appendChild(logo);

  const existingSlot = new MockNode('RECTANGLE', MOCK_SHELL_EXISTING_SLOT_NAME);
  existingSlot.x = 125;
  existingSlot.y = 113;
  existingSlot.width = 750;
  existingSlot.height = 750;
  existingSlot.fills = [{ type: 'IMAGE', imageHash: 'mockhash-old-single-product', scaleMode: 'FILL' }];
  shell.appendChild(existingSlot);

  handle.currentPage.appendChild(shell);
}

/** core의 productGroup='simple-meal'/thumbnailType='basic'/channelPresetId='naver-1000x1000' plan을 mock shell에 연결. */
export const MOCK_GENERATED_SUPPORT: GeneratedRendererSupport = {
  channelPresetId: 'naver-1000x1000',
  productGroup: 'simple-meal',
  thumbnailType: 'basic',
  familyIds: SUPPORTED_GENERATED_FAMILIES,
  baseShellFrameName: MOCK_SHELL_FRAME_NAME,
  existingSlotLayerNames: [MOCK_SHELL_EXISTING_SLOT_NAME],
};
