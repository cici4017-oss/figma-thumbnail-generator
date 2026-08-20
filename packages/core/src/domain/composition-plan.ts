import type { LayoutSlotRole } from './layout';
import type { ProductGroupId } from './product';

export interface CompositionPlanSlot {
  slotKey: string;
  assetKey: string;
  role: LayoutSlotRole;
}

/** 렌더러 독립적인 "내용 계획". 좌표를 포함하지 않는다 — 실제 배치는 각 렌더러(Figma 템플릿 등)가 결정. */
export interface CompositionPlan {
  layoutKey: string;
  channelPresetId: string;
  productGroup: ProductGroupId;
  slots: CompositionPlanSlot[];
  options: {
    badge?: { enabled: boolean; label?: string };
    storageLabel?: { enabled: boolean; type?: string };
    logoVariant: 'red' | 'gray' | 'none';
  };
}
