import type { ChannelPreset } from '../domain/channel';

/**
 * 실제 Figma(fileKey v6UalGGplex8w2hzfbqwhI)의 프레임 크기를 채널별로 재확인해서 등록한
 * 출력 규격이다. 한 채널(channelId)이 여러 ChannelPreset을 가질 수 있다 — 그 fan-out은
 * 여기(데이터) 책임이 아니라 engine/composeChannelOutputs.ts가 담당한다.
 *
 * badgeSupported/storageLabelSupported는 네이버에서 실제로 확인된 값(냉동/실온/파우치 라벨,
 * 딱지 배지)을 그대로 이어받은 기본값이다 — 채널별로 각각 재검증한 것은 아니므로, 실제 렌더링
 * 연결 시 채널별로 다시 확인이 필요할 수 있다.
 *
 * 복수 규격(square + wide) 채널 5개는 같은 상품·수량·딱지 조합이 두 규격 모두에 짝으로
 * 존재하는 패턴을 프레임 데이터에서 확인한 뒤 등록했다("한 채널 요청마다 두 규격을 모두
 * 만드는 구조"로 판단).
 *
 * geometryFamily: aspectRatioFamily(square/wide/portrait)보다 세분화된 실제 비율. wide
 * 안에서도 750x422(≈1.78:1)/640x350(≈1.83:1)/720x400(1.8:1)은 실제 Figma 조사로 동일한
 * "N개 균일 슬롯 가로 배치" 구조임을 확인해서 wide-16x9로 묶었고, 720x360(2:1)은 구조는
 * 비슷하지만 다른 채널과 교차 확인되지 않아 별도 wide-2x1로 분리했다. 600x240(2.5:1, 토스)은
 * 배경 hero 이미지 + 마스크 아이콘 + N개 소형 슬롯이라는, 다른 wide와 확연히 다른 구조라
 * wide-5x2로 분리하고 verified Layout은 아직 등록하지 않았다(추가 확인 필요).
 * square Layout을 wide로, 혹은 서로 다른 geometryFamily끼리 스케일해서 재사용하지 않는다.
 *
 * fallbackPolicy: verified Layout이 없을 때 generated fallback을 허용할지 정하는 preset별
 * 정책. 대부분은 'verified-or-generated'(기본)지만, toss-600x240은 hero 이미지+아이콘+소형
 * 슬롯이 섞인 채널 고유 구조라 generic family 공식이 맞지 않아 'verified-only'로 설정했다 —
 * 검증된 Layout이 없으면 자동 생성하지 않고 reviewRequired로 사람이 수동 처리한다.
 */
export const CHANNEL_PRESETS: ChannelPreset[] = [
  // --- 복수 규격 채널 (square + wide) ---
  {
    id: 'naver-1000x1000',
    channelId: 'naver',
    frameWidth: 1000,
    frameHeight: 1000,
    aspectRatioFamily: 'square',
    geometryFamily: 'square-1x1',
    fallbackPolicy: 'verified-or-generated',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    id: 'kakao-1000x1000',
    channelId: 'kakao',
    frameWidth: 1000,
    frameHeight: 1000,
    aspectRatioFamily: 'square',
    geometryFamily: 'square-1x1',
    fallbackPolicy: 'verified-or-generated',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    // 750x422 ≈ 1.78:1 — 실제 조사로 홈앤쇼핑/제이슨딜과 동일한 "N개 균일 슬롯 가로 배치"
    // 구조임을 확인(wide-16x9). 대표: 카카오_750_소고기장조림130_1/3/5 (69:2292/69:2306/69:2322)
    id: 'kakao-750x422',
    channelId: 'kakao',
    frameWidth: 750,
    frameHeight: 422,
    aspectRatioFamily: 'wide',
    geometryFamily: 'wide-16x9',
    fallbackPolicy: 'verified-or-generated',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    id: 'home-and-shopping-1000x1000',
    channelId: 'home-and-shopping',
    frameWidth: 1000,
    frameHeight: 1000,
    aspectRatioFamily: 'square',
    geometryFamily: 'square-1x1',
    fallbackPolicy: 'verified-or-generated',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    // 640x350 ≈ 1.83:1 — 카카오/제이슨딜과 동일 구조 확인(3슬롯, 69:1872). wide-16x9.
    id: 'home-and-shopping-640x350',
    channelId: 'home-and-shopping',
    frameWidth: 640,
    frameHeight: 350,
    aspectRatioFamily: 'wide',
    geometryFamily: 'wide-16x9',
    fallbackPolicy: 'verified-or-generated',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    id: 'toss-1000x1000',
    channelId: 'toss',
    frameWidth: 1000,
    frameHeight: 1000,
    aspectRatioFamily: 'square',
    geometryFamily: 'square-1x1',
    fallbackPolicy: 'verified-or-generated',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    // 600x240 = 2.5:1 — hero 배경 이미지 + 마스크 아이콘 + N개 소형 슬롯이라는 독특한 구조
    // (다른 wide처럼 균일 슬롯 가로 배치가 아님, 69:2553/69:2588/69:2601 조사 결과). 다른
    // wide 규격과 다른 별도 geometryFamily(wide-5x2)로 분리 — verified Layout 미등록.
    // fallbackPolicy를 'verified-only'로 설정 — 채널 고유 구조라 generic family 공식으로
    // generated fallback을 만들면 실제 디자인과 전혀 다른 결과가 나오므로, verified Layout이
    // 없으면 자동 생성하지 않고 reviewRequired로 사람이 수동 처리하게 한다.
    id: 'toss-600x240',
    channelId: 'toss',
    frameWidth: 600,
    frameHeight: 240,
    aspectRatioFamily: 'wide',
    geometryFamily: 'wide-5x2',
    fallbackPolicy: 'verified-only',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    id: 'jasondeal-1000x1000',
    channelId: 'jasondeal',
    frameWidth: 1000,
    frameHeight: 1000,
    aspectRatioFamily: 'square',
    geometryFamily: 'square-1x1',
    fallbackPolicy: 'verified-or-generated',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    // 720x400 = 1.8:1 — 카카오/홈앤쇼핑과 동일 구조 확인(3슬롯, 69:1372). wide-16x9.
    id: 'jasondeal-720x400',
    channelId: 'jasondeal',
    frameWidth: 720,
    frameHeight: 400,
    aspectRatioFamily: 'wide',
    geometryFamily: 'wide-16x9',
    fallbackPolicy: 'verified-or-generated',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    id: '11st-1000x1000',
    channelId: '11st',
    frameWidth: 1000,
    frameHeight: 1000,
    aspectRatioFamily: 'square',
    geometryFamily: 'square-1x1',
    fallbackPolicy: 'verified-or-generated',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    // 720x360 = 2:1 — 균일 슬롯 가로 배치 구조는 wide-16x9와 비슷하지만 비율이 뚜렷이 달라
    // (2:1 vs ≈1.8:1) 별도 geometryFamily(wide-2x1)로 분리. 다른 채널과 교차 확인은 아직
    // 안 됐음(현재 wide-2x1은 11번가 하나뿐). 대표: 11번가_720_소고기장조림130_1/3/5
    // (69:1952/69:1936/69:1966)
    id: '11st-720x360',
    channelId: '11st',
    frameWidth: 720,
    frameHeight: 360,
    aspectRatioFamily: 'wide',
    geometryFamily: 'wide-2x1',
    fallbackPolicy: 'verified-or-generated',
    storageLabelSupported: true,
    badgeSupported: true,
  },

  // --- 단일 규격(1000x1000) 채널 — 프레임 데이터상 예외 없이 정사각형만 확인됨 ---
  {
    id: 'ssg-1000x1000',
    channelId: 'ssg',
    frameWidth: 1000,
    frameHeight: 1000,
    aspectRatioFamily: 'square',
    geometryFamily: 'square-1x1',
    fallbackPolicy: 'verified-or-generated',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    id: 'auction-1000x1000',
    channelId: 'auction',
    frameWidth: 1000,
    frameHeight: 1000,
    aspectRatioFamily: 'square',
    geometryFamily: 'square-1x1',
    fallbackPolicy: 'verified-or-generated',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    id: 'gmarket-1000x1000',
    channelId: 'gmarket',
    frameWidth: 1000,
    frameHeight: 1000,
    aspectRatioFamily: 'square',
    geometryFamily: 'square-1x1',
    fallbackPolicy: 'verified-or-generated',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    id: 'sk-stoa-1000x1000',
    channelId: 'sk-stoa',
    frameWidth: 1000,
    frameHeight: 1000,
    aspectRatioFamily: 'square',
    geometryFamily: 'square-1x1',
    fallbackPolicy: 'verified-or-generated',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    id: 'skt-deal-1000x1000',
    channelId: 'skt-deal',
    frameWidth: 1000,
    frameHeight: 1000,
    aspectRatioFamily: 'square',
    geometryFamily: 'square-1x1',
    fallbackPolicy: 'verified-or-generated',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    id: 'coupang-1000x1000',
    channelId: 'coupang',
    frameWidth: 1000,
    frameHeight: 1000,
    aspectRatioFamily: 'square',
    geometryFamily: 'square-1x1',
    fallbackPolicy: 'verified-or-generated',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    id: 'aliexpress-1000x1000',
    channelId: 'aliexpress',
    frameWidth: 1000,
    frameHeight: 1000,
    aspectRatioFamily: 'square',
    geometryFamily: 'square-1x1',
    fallbackPolicy: 'verified-or-generated',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    id: 'ns-shopping-1000x1000',
    channelId: 'ns-shopping',
    frameWidth: 1000,
    frameHeight: 1000,
    aspectRatioFamily: 'square',
    geometryFamily: 'square-1x1',
    fallbackPolicy: 'verified-or-generated',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    // 표본 2개(반례 없음, 신뢰도 낮음) — 추가 확인 전까지는 사용에 주의
    id: 'alwayz-1000x1000',
    channelId: 'alwayz',
    frameWidth: 1000,
    frameHeight: 1000,
    aspectRatioFamily: 'square',
    geometryFamily: 'square-1x1',
    fallbackPolicy: 'verified-or-generated',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    // 표본 2개(반례 없음, 신뢰도 낮음) — 추가 확인 전까지는 사용에 주의
    id: 'eland-mall-1000x1000',
    channelId: 'eland-mall',
    frameWidth: 1000,
    frameHeight: 1000,
    aspectRatioFamily: 'square',
    geometryFamily: 'square-1x1',
    fallbackPolicy: 'verified-or-generated',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    // 표본 2개(반례 없음, 신뢰도 낮음) — 추가 확인 전까지는 사용에 주의
    id: 'lotte-on-1000x1000',
    channelId: 'lotte-on',
    frameWidth: 1000,
    frameHeight: 1000,
    aspectRatioFamily: 'square',
    geometryFamily: 'square-1x1',
    fallbackPolicy: 'verified-or-generated',
    storageLabelSupported: true,
    badgeSupported: true,
  },
];
