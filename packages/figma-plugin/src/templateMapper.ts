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
 * 원칙(중요 — 재발 방지):
 * - LayoutDefinition(logical Layout, core/data/layouts.ts)은 geometryFamily가 같으면 여러
 *   채널에서 재사용될 수 있다. 이건 "배치 구조가 같다"는 뜻일 뿐이다.
 * - FIGMA_TEMPLATE_BINDINGS는 그와 별개로 channelPresetId마다 실제로 확인된 실제 Figma
 *   frame을 각각 가리켜야 한다. 로고/배경/기존 디자인 요소가 채널마다 다른 실제 template이기
 *   때문에, 같은 layoutKey라도 다른 channelPresetId에는 절대 같은 frame을 재사용하지 않는다
 *   (한 번 naver의 69:417을 kakao-1000x1000에도 재사용하도록 잘못 연결했다가 발견해 수정한 적
 *   있음 — logical Layout 재사용과 physical Figma template 재사용을 혼동하지 말 것).
 * - 그래서 아래 목록은 "해당 channelPreset의 실제 frame이 read-only 조사로 확인된 것만" 담는다.
 *   확인되지 않은 channelPreset은 같은 geometryFamily/layoutKey라도 바인딩하지 않는다.
 *
 * 전부 fileKey v6UalGGplex8w2hzfbqwhI("썸네일 (Copy)")를 Figma MCP로 read-only 조사해서
 * 확인한 실제 프레임/레이어 이름이다. 페이지 목록은 get_metadata가 아니라 Plugin API
 * figma.root.children 기준으로 확인했다 — get_metadata(nodeId 없이 호출)는 문서의 페이지
 * 전체를 반환하지 않는 것으로 확인됐다(실제로는 13개 페이지가 있고, 검증된 template frame은
 * 전부 "장조림" 페이지에 있다).
 *
 * generated Layout(예: GENERATED_PYRAMID-STACK_9)은 실제 프레임이 없으므로 의도적으로
 * 바인딩하지 않는다 — resolveTemplate이 undefined를 반환하고 renderPlan이 "템플릿 매핑이
 * 없습니다"로 명확히 실패하는 것이 맞는 동작이다(임의로 다른 템플릿을 대신 쓰지 않음).
 */
export const FIGMA_TEMPLATE_BINDINGS: FigmaTemplateBinding[] = [
  // --- naver-1000x1000 (square-1x1) ---
  {
    layoutKey: 'LAYOUT_01',
    channelPresetId: 'naver-1000x1000',
    templateFrameName: '네이버_소고기장조림130_1',
    templateFrameNodeId: '69:307',
    slotBindings: [{ slotKey: 'slot_1', layerName: 'image 312' }],
  },
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
    // slot_1(main, 중앙 대형 549x549) = "image 321"(69:373). slot_2~10(sub, 소형 9개)은
    // 레이어 이름의 숫자 순서(image 312~320)로 결정론적으로 매핑했다 — 물리적 위치가 role별로
    // 구분되어 있지 않아(전부 "sub"), 어떤 소형 슬롯이 어떤 slotKey인지는 배치상 의미가 없다.
    layoutKey: 'LAYOUT_04',
    channelPresetId: 'naver-1000x1000',
    templateFrameName: '네이버_소고기장조림130_10',
    templateFrameNodeId: '69:353',
    slotBindings: [
      { slotKey: 'slot_1', layerName: 'image 321' },
      { slotKey: 'slot_2', layerName: 'image 312' },
      { slotKey: 'slot_3', layerName: 'image 313' },
      { slotKey: 'slot_4', layerName: 'image 314' },
      { slotKey: 'slot_5', layerName: 'image 315' },
      { slotKey: 'slot_6', layerName: 'image 316' },
      { slotKey: 'slot_7', layerName: 'image 317' },
      { slotKey: 'slot_8', layerName: 'image 318' },
      { slotKey: 'slot_9', layerName: 'image 319' },
      { slotKey: 'slot_10', layerName: 'image 320' },
    ],
  },

  // --- kakao-1000x1000 (square-1x1) ---
  {
    // 카카오 square 3슬롯의 실제 frame은 "카카오_1000_소고기장조림130_3"(69:2368)이다
    // (네이버의 69:417과는 별개 frame).
    layoutKey: 'LAYOUT_02',
    channelPresetId: 'kakao-1000x1000',
    templateFrameName: '카카오_1000_소고기장조림130_3',
    templateFrameNodeId: '69:2368',
    slotBindings: [
      { slotKey: 'slot_1', layerName: 'image 416' },
      { slotKey: 'slot_2', layerName: 'image 417' },
      { slotKey: 'slot_3', layerName: 'image 418' },
    ],
  },

  // --- kakao-750x422 (wide-16x9) ---
  {
    layoutKey: 'LAYOUT_05',
    channelPresetId: 'kakao-750x422',
    templateFrameName: '카카오_750_소고기장조림130_1',
    templateFrameNodeId: '69:2292',
    slotBindings: [{ slotKey: 'slot_1', layerName: 'image 418' }],
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
  {
    layoutKey: 'LAYOUT_07',
    channelPresetId: 'kakao-750x422',
    templateFrameName: '카카오_750_소고기장조림130_5',
    templateFrameNodeId: '69:2322',
    slotBindings: [
      { slotKey: 'slot_1', layerName: 'image 418' },
      { slotKey: 'slot_2', layerName: 'image 419' },
      { slotKey: 'slot_3', layerName: 'image 420' },
      { slotKey: 'slot_4', layerName: 'image 421' },
      { slotKey: 'slot_5', layerName: 'image 422' },
    ],
  },

  // --- 11st-720x360 (wide-2x1) ---
  // home-and-shopping/jasondeal(wide-16x9)과 달리 wide-2x1 채널은 11번가 하나뿐이라
  // 다른 채널과의 교차 재사용은 확인되지 않았다(layouts.ts 주석 참고) — 11번가 실제
  // frame만 바인딩한다.
  {
    layoutKey: 'LAYOUT_08',
    channelPresetId: '11st-720x360',
    templateFrameName: '11번가_720_소고기장조림130_1',
    templateFrameNodeId: '69:1952',
    slotBindings: [{ slotKey: 'slot_1', layerName: 'image 413' }],
  },
  {
    layoutKey: 'LAYOUT_09',
    channelPresetId: '11st-720x360',
    templateFrameName: '11번가_720_소고기장조림130_3',
    templateFrameNodeId: '69:1936',
    slotBindings: [
      { slotKey: 'slot_1', layerName: 'image 412' },
      { slotKey: 'slot_2', layerName: 'image 413' },
      { slotKey: 'slot_3', layerName: 'image 414' },
    ],
  },
  {
    layoutKey: 'LAYOUT_10',
    channelPresetId: '11st-720x360',
    templateFrameName: '11번가_720_소고기장조림130_5',
    templateFrameNodeId: '69:1966',
    slotBindings: [
      { slotKey: 'slot_1', layerName: 'image 412' },
      { slotKey: 'slot_2', layerName: 'image 413' },
      { slotKey: 'slot_3', layerName: 'image 414' },
      { slotKey: 'slot_4', layerName: 'image 415' },
      { slotKey: 'slot_5', layerName: 'image 416' },
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
