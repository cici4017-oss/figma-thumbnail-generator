/**
 * layoutKey + channelPresetId ↔ 실제 Figma 리소스 연결부.
 * Figma에 대한 지식은 core가 아니라 이 파일에만 있어야 한다.
 *
 * 주의: 원본 노드(69:307, 69:417 ...)는 Figma의 COMPONENT가 아니라 일반 FRAME이다.
 * 따라서 createInstance()가 아니라 frame.clone()으로 복제한다.
 */

export interface FigmaSlotBinding {
  /** core LayoutSlot.slotKey와 매칭 */
  slotKey: string;
  /** 복제된 프레임 안에서 찾을 실제 레이어 이름 */
  layerName: string;
}

export interface FigmaTemplateBinding {
  layoutKey: string;
  channelPresetId: string;

  /** V1 source of truth: 현재 열린 파일의 프레임 이름으로 조회 */
  templateFrameName: string;
  /** 동명 프레임이 여럿일 때 명확화용 (있으면 nodeId를 우선 사용) */
  templateFrameNodeId?: string;
  /** V1 미사용. 향후 Team Library 컴포넌트로 전환할 때 사용 */
  libraryComponentKey?: string;

  slotBindings: FigmaSlotBinding[];
  badgeLayerName?: string;
  storageLabelLayerNamesByType?: Record<string, string>;
  logoLayerNamesByVariant?: Record<'red' | 'gray', string>;
}

/**
 * 파일럿 범위: LAYOUT_02 하나만 바인딩한다.
 * 레이어 이름(image 313 / image 409 / image 410)은 Figma MCP로 조사한 실제 값이다.
 */
export const FIGMA_TEMPLATE_BINDINGS: FigmaTemplateBinding[] = [
  {
    layoutKey: 'LAYOUT_02',
    channelPresetId: 'naver-1000x1000',
    templateFrameName: '네이버_소고기장조림130_3',
    templateFrameNodeId: '69:417',
    slotBindings: [
      { slotKey: 'slot_1', layerName: 'image 313' },
      { slotKey: 'slot_2', layerName: 'image 409' },
      { slotKey: 'slot_3', layerName: 'image 410' },
    ],
  },
];

export function resolveTemplate(
  layoutKey: string,
  channelPresetId: string,
  bindings: FigmaTemplateBinding[] = FIGMA_TEMPLATE_BINDINGS,
): FigmaTemplateBinding | undefined {
  return bindings.find((b) => b.layoutKey === layoutKey && b.channelPresetId === channelPresetId);
}
