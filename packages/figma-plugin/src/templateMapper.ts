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
 * ⚠ PRODUCTION 전용 데이터 — 실제 회사 Figma 파일(프레임 "네이버_소고기장조림130_3" 등)을 가리킨다.
 *
 * 개발 단계에서는 이 바인딩이 실제로 동작하는 것을 전제로 하지 않는다: 회사 PC는 개발 중인
 * 플러그인 파일을 자유롭게 반입할 수 없고, 회사 Figma 파일도 외부로 반출할 수 없기 때문이다.
 * 로컬(집/외부) 개발·테스트는 src/mock의 mock Figma + mock 템플릿/에셋으로 한다
 * (packages/figma-plugin/test/assetMapping.test.ts 참고, `npm run test`로 실행).
 *
 * 이 바인딩을 실제로 company Figma에서 실행하는 것은 개발 완료 후 별도의 승인/배포 단계에서만
 * 이루어진다 — 자세한 내용은 저장소 루트 README.md의 "개발 단계 vs 배포 단계" 참고.
 *
 * 첫 렌더링 테스트 범위: LAYOUT_02/LAYOUT_03(네이버)와 LAYOUT_06(카카오, wide-16x9)만
 * 바인딩한다. 전부 fileKey v6UalGGplex8w2hzfbqwhI("썸네일 (Copy)")를 Figma MCP로 read-only
 * 조사해서 확인한 실제 프레임/레이어 이름이다. generated Layout(예: GENERATED_PYRAMID-
 * STACK_9)은 실제 프레임이 없으므로 의도적으로 바인딩하지 않는다 — resolveTemplate이
 * undefined를 반환하고 renderPlan이 "템플릿 매핑이 없습니다"로 명확히 실패하는 것이 맞는
 * 동작이다(임의로 다른 템플릿을 대신 쓰지 않음).
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
  {
    layoutKey: 'LAYOUT_03',
    channelPresetId: 'naver-1000x1000',
    templateFrameName: '네이버_소고기장조림130_5',
    templateFrameNodeId: '69:442',
    slotBindings: [
      { slotKey: 'slot_1', layerName: 'image 411' },
      { slotKey: 'slot_2', layerName: 'image 412' },
      { slotKey: 'slot_3', layerName: 'image 413' },
      { slotKey: 'slot_4', layerName: 'image 414' },
      { slotKey: 'slot_5', layerName: 'image 415' },
    ],
  },
  {
    layoutKey: 'LAYOUT_06',
    channelPresetId: 'kakao-750x422',
    templateFrameName: '카카오_750_소고기장조림130_3',
    templateFrameNodeId: '69:2306',
    slotBindings: [
      { slotKey: 'slot_1', layerName: 'image 418' },
      { slotKey: 'slot_2', layerName: 'image 419' },
      { slotKey: 'slot_3', layerName: 'image 420' },
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
