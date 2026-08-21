import type { Product } from '../domain/product';
import type { ChannelPreset } from '../domain/channel';
import type { LayoutDefinition } from '../domain/layout';
import type { GenerationRequest, GenerationRequestItem } from '../domain/generation-request';
import type { CompositionPlan } from '../domain/composition-plan';
import { DEFAULT_THUMBNAIL_TYPE } from '../domain/thumbnailType';
import { selectLayout, type SelectLayoutFailureReason } from './selectLayout';
import { assignSlots, type AssignSlotsFailureReason } from './assignSlots';

export type ComposePlanFailureReason =
  | SelectLayoutFailureReason
  | AssignSlotsFailureReason
  | 'PRODUCT_NOT_FOUND'
  | 'CHANNEL_PRESET_NOT_FOUND'
  | 'INCONSISTENT_PRODUCT_GROUP'
  | 'EMPTY_ITEMS';

export type ComposePlanResult =
  | { ok: true; plan: CompositionPlan }
  | { ok: false; reason: ComposePlanFailureReason; message: string };

function expandItems(items: GenerationRequestItem[]): string[] {
  const out: string[] = [];
  for (const item of items) {
    for (let i = 0; i < item.quantity; i++) out.push(item.productId);
  }
  return out;
}

export function composePlan(
  request: GenerationRequest,
  deps: { products: Product[]; channelPresets: ChannelPreset[]; layouts: LayoutDefinition[] },
): ComposePlanResult {
  const channelPreset = deps.channelPresets.find((c) => c.id === request.channelPresetId);
  if (!channelPreset) {
    return {
      ok: false,
      reason: 'CHANNEL_PRESET_NOT_FOUND',
      message: `channelPresetId "${request.channelPresetId}"를 찾을 수 없습니다.`,
    };
  }

  if (request.items.length === 0) {
    return { ok: false, reason: 'EMPTY_ITEMS', message: '판매 상품 항목(items)이 비어 있습니다.' };
  }

  const saleProductIds = expandItems(request.items);
  const giftProductIds = expandItems(request.giftItems ?? []);

  const productLookup = new Map(deps.products.map((p) => [p.id, p] as const));
  for (const id of [...saleProductIds, ...giftProductIds]) {
    if (!productLookup.has(id)) {
      return { ok: false, reason: 'PRODUCT_NOT_FOUND', message: `productId "${id}"를 찾을 수 없습니다.` };
    }
  }

  const groups = new Set(
    [...saleProductIds, ...giftProductIds].map((id) => productLookup.get(id)!.productGroup),
  );
  if (groups.size > 1) {
    return {
      ok: false,
      reason: 'INCONSISTENT_PRODUCT_GROUP',
      message: `요청에 서로 다른 productGroup이 섞여 있습니다: ${[...groups].join(', ')}`,
    };
  }
  const productGroup = [...groups][0];

  const composition: 'single' | 'mixed' =
    new Set(request.items.map((i) => i.productId)).size > 1 ? 'mixed' : 'single';

  const thumbnailType = request.thumbnailType ?? DEFAULT_THUMBNAIL_TYPE;

  const selection = selectLayout(
    {
      productGroup,
      composition,
      totalQuantity: saleProductIds.length,
      giftQuantity: giftProductIds.length,
      channelId: channelPreset.channelId,
      aspectRatioFamily: channelPreset.aspectRatioFamily,
      thumbnailType,
    },
    deps.layouts,
  );

  if (!selection.ok) {
    return { ok: false, reason: selection.reason, message: selection.message };
  }

  // 상품→슬롯 배치는 selectLayout의 책임이 아니라 assignSlots의 책임이다.
  // saleProductIds/giftProductIds는 이미 "작업ID 내 순번 오름차순 × quantity만큼 expand"된
  // 상태(items 배열 순서를 그대로 따름)이므로, 여기서는 재정렬 없이 그대로 넘긴다.
  const assignment = assignSlots({
    layout: selection.layout,
    saleAssetKeys: saleProductIds.map((id) => productLookup.get(id)!.assetKey),
    giftAssetKeys: giftProductIds.map((id) => productLookup.get(id)!.assetKey),
  });

  if (!assignment.ok) {
    return { ok: false, reason: assignment.reason, message: assignment.message };
  }

  return {
    ok: true,
    plan: {
      layoutKey: selection.layout.layoutKey,
      channelPresetId: channelPreset.id,
      productGroup,
      thumbnailType,
      slots: assignment.slots,
      options: {
        badge: request.options?.badge,
        storageLabel: request.options?.storageLabel,
        logoVariant: request.options?.logoVariant ?? 'red',
      },
    },
  };
}
