import type { ProductGroupId } from './product';
import type { AspectRatioFamily } from './channel';
import type { ThumbnailType } from './thumbnailType';
import type { LayoutSource } from './layoutSource';

export type ArrangementKind =
  | 'single-center'
  | 'triple-cascade'
  | 'triple-row'
  | 'penta-pyramid'
  | 'penta-row'
  | 'grid-cluster-10'
  | 'row-grid-10'
  | 'dense-grid-20'
  | 'duo-side-by-side'
  | 'duo-gift-overlay'
  | 'lifestyle-scene'
  /** generated fallback family (arrangementFamilyPolicy.ts) 공식이 생성하는 배치 종류 */
  | 'row-linear'
  | 'diagonal-cascade'
  | 'pyramid-stack'
  | 'grid-cluster';

/** 판매수량에 포함되는 슬롯인지(sale) 아니면 별도 증정품 슬롯인지(gift) */
export type LayoutSlotRole = 'sale' | 'gift';

export interface LayoutSlot {
  /** 렌더러가 실제 레이어에 매핑할 때 쓰는 식별자. 좌표는 여기 두지 않는다 — 기존 Figma 디자인이 source of truth. */
  slotKey: string;
  role: LayoutSlotRole;
}

export interface LayoutMatchCriteria {
  productGroups?: ProductGroupId[];
  compositions?: Array<'single' | 'mixed'>;
  aspectRatioFamilies?: AspectRatioFamily[];
  channelIds?: string[];
  thumbnailTypes?: ThumbnailType[];
}

export interface LayoutDefinition {
  layoutKey: string;
  arrangementKind: ArrangementKind;
  slots: LayoutSlot[];
  match: LayoutMatchCriteria;
  /** 여러 Layout이 동시에 match될 때 우선순위. 숫자가 클수록 우선. */
  priority: number;
  /** 실제 Figma에서 검증된 Layout인지, family 공식으로 자동 생성된 Layout인지. */
  source: LayoutSource;
}

export function getSaleSlotCount(layout: LayoutDefinition): number {
  return layout.slots.filter((s) => s.role === 'sale').length;
}

export function getGiftSlotCount(layout: LayoutDefinition): number {
  return layout.slots.filter((s) => s.role === 'gift').length;
}
