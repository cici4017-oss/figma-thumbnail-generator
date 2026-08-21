import type { LayoutSlotRole } from './layout';
import type { LayoutSource } from './layoutSource';
import type { ProductGroupId } from './product';
import type { ThumbnailType } from './thumbnailType';

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
  thumbnailType: ThumbnailType;
  slots: CompositionPlanSlot[];
  layoutSource: LayoutSource;
  /** layoutSource.kind === 'generated'와 동일한 값의 편의 필드. */
  generatedLayout: boolean;
  /**
   * true면 이 plan은 검증된 Layout이 아닌 generated fallback으로 만들어졌다는 뜻이며,
   * 향후 AUTO_GENERATED_REVIEW 같은 별도 검토 영역으로 보내야 한다(현재는 표시만 한다).
   */
  reviewRequired: boolean;
  options: {
    badge?: { enabled: boolean; label?: string };
    storageLabel?: { enabled: boolean; type?: string };
    logoVariant: 'red' | 'gray' | 'none';
  };
}
