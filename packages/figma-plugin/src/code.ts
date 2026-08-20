import { type GenerationRequest, type Product, CHANNEL_PRESETS, LAYOUTS, composePlan } from '@thumbnail-generator/core';
import { renderPlan } from './renderer';

figma.showUI(__html__, { width: 320, height: 280 });

type UiToPluginMessage = { type: 'generate'; bytes: number[] };
type PluginToUiMessage =
  | { type: 'success'; nodeId: string }
  | { type: 'error'; message: string };

function post(message: PluginToUiMessage) {
  figma.ui.postMessage(message);
}

figma.ui.onmessage = async (msg: UiToPluginMessage) => {
  if (msg.type !== 'generate') return;

  try {
    if (!msg.bytes || msg.bytes.length === 0) {
      post({ type: 'error', message: '이미지를 먼저 선택해주세요.' });
      return;
    }

    const bytes = new Uint8Array(msg.bytes);
    const image = figma.createImage(bytes);

    // 파일럿 범위: 상품 1종 x 3개 고정. 실제 상품 DB는 아직 없으므로 이 요청 안에서만 임시 Product를 구성한다.
    const product: Product = {
      id: 'pilot-product',
      name: '파일럿 상품',
      productGroup: 'simple-meal',
      assetKey: image.hash,
    };

    const request: GenerationRequest = {
      items: [{ productId: product.id, quantity: 3 }],
      channelPresetId: 'naver-1000x1000',
    };

    const composeResult = composePlan(request, {
      products: [product],
      channelPresets: CHANNEL_PRESETS,
      layouts: LAYOUTS,
    });

    if (!composeResult.ok) {
      post({ type: 'error', message: `[${composeResult.reason}] ${composeResult.message}` });
      return;
    }

    const renderResult = await renderPlan(composeResult.plan);
    if (!renderResult.ok) {
      post({ type: 'error', message: renderResult.message });
      return;
    }

    post({ type: 'success', nodeId: renderResult.nodeId });
  } catch (e) {
    post({ type: 'error', message: `예상하지 못한 오류: ${(e as Error).message}` });
  }
};
