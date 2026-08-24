import {
  type GenerationRequest,
  type Product,
  type ProductGroupId,
  CHANNEL_PRESETS,
  LAYOUTS,
  DOMAIN_PRODUCTS,
  composePlan,
} from '@thumbnail-generator/core';
// 타입만 가져온다 — BatchGenerationRequest는 '/import'(exceljs 포함)에 정의되어 있지만,
// `import type`은 esbuild가 완전히 지워버려서 code.js 번들에 exceljs가 섞여 들어가지 않는다.
// (실제 엑셀 파싱은 UI 쪽에서 이미 끝내고, code.ts는 파싱된 결과만 받는다.)
import type { BatchGenerationRequest } from '@thumbnail-generator/core/import';
import { renderPlan } from './renderer';
import { listProductAssets, registerProductAssetFromSelection } from './assetResolver';
import { renderBatch, type BatchRenderResult } from './batchRenderer';
import { exportNodesAsJpg, type ExportRequestItem } from './exportRenderer';

figma.showUI(__html__, { width: 460, height: 560 });

/**
 * 이 플러그인 인스턴스가 열려 있는 "현재 파일"에 대한 설정.
 * 간편식/영유아는 서로 다른 Figma 파일에서 관리되므로, 각 파일에서 실행되는 플러그인이
 * 자기 파일에 맞는 productGroup을 가진다 (파일마다 별도로 값을 바꿔서 사용).
 */
const CURRENT_FILE_PRODUCT_GROUP: ProductGroupId = 'simple-meal';

type UiToPluginMessage =
  | { type: 'ready' }
  | { type: 'generate'; productKey: string; quantity: number }
  | { type: 'register'; productKey: string }
  | { type: 'renderBatch'; batch: BatchGenerationRequest; includeReviewRequired: boolean }
  | { type: 'exportBatch'; items: ExportRequestItem[] };

type PluginToUiMessage =
  | { type: 'products'; products: string[] }
  | { type: 'success'; nodeId: string }
  | { type: 'registered'; productKey: string }
  | { type: 'error'; message: string }
  | { type: 'batchRenderResult'; result: BatchRenderResult }
  | { type: 'exportBatchResult'; files: { fileName: string; bytes: Uint8Array }[]; failures: { fileName: string; message: string }[] };

function post(message: PluginToUiMessage) {
  figma.ui.postMessage(message);
}

async function sendProductList() {
  const products = await listProductAssets();
  post({ type: 'products', products });
}

figma.ui.onmessage = async (msg: UiToPluginMessage) => {
  if (msg.type === 'ready') {
    await sendProductList();
    return;
  }

  if (msg.type === 'register') {
    const result = await registerProductAssetFromSelection(msg.productKey);
    if (!result.ok) {
      post({ type: 'error', message: result.message });
      return;
    }
    post({ type: 'registered', productKey: msg.productKey });
    await sendProductList();
    return;
  }

  if (msg.type === 'generate') {
    try {
      if (!msg.productKey) {
        post({ type: 'error', message: '상품을 선택해주세요.' });
        return;
      }
      if (!Number.isInteger(msg.quantity) || msg.quantity <= 0) {
        post({ type: 'error', message: '수량은 1 이상의 정수여야 합니다.' });
        return;
      }

      // 파일럿 범위: 실제 상품 DB가 아직 없으므로 PRODUCT_ASSETS에 등록된 이름을
      // 그대로 productId/assetKey로 사용해 요청 내에서 임시 Product를 구성한다.
      const product: Product = {
        id: msg.productKey,
        name: msg.productKey,
        productGroup: CURRENT_FILE_PRODUCT_GROUP,
        assetKey: msg.productKey,
      };

      const request: GenerationRequest = {
        items: [{ productId: product.id, quantity: msg.quantity }],
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
    return;
  }

  if (msg.type === 'renderBatch') {
    try {
      const result = await renderBatch(
        msg.batch,
        { products: DOMAIN_PRODUCTS, channelPresets: CHANNEL_PRESETS, layouts: LAYOUTS },
        { includeReviewRequired: msg.includeReviewRequired },
      );
      post({ type: 'batchRenderResult', result });
    } catch (e) {
      post({ type: 'error', message: `Batch Render 중 오류: ${(e as Error).message}` });
    }
    return;
  }

  if (msg.type === 'exportBatch') {
    try {
      const { files, failures } = await exportNodesAsJpg(msg.items);
      post({ type: 'exportBatchResult', files, failures });
    } catch (e) {
      post({ type: 'error', message: `JPEG export 중 오류: ${(e as Error).message}` });
    }
    return;
  }
};
