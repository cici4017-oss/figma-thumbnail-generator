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
 * 만드는 구조"로 판단). square Layout을 wide로 스케일해서 재사용하지 않는다 — wide는 아직
 * 검증된 Layout이 없으므로 resolveLayout이 자동으로 generated fallback을 사용한다.
 */
export const CHANNEL_PRESETS: ChannelPreset[] = [
  // --- 복수 규격 채널 (square + wide) ---
  {
    id: 'naver-1000x1000',
    channelId: 'naver',
    frameWidth: 1000,
    frameHeight: 1000,
    aspectRatioFamily: 'square',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    id: 'kakao-1000x1000',
    channelId: 'kakao',
    frameWidth: 1000,
    frameHeight: 1000,
    aspectRatioFamily: 'square',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    id: 'kakao-750x422',
    channelId: 'kakao',
    frameWidth: 750,
    frameHeight: 422,
    aspectRatioFamily: 'wide',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    id: 'home-and-shopping-1000x1000',
    channelId: 'home-and-shopping',
    frameWidth: 1000,
    frameHeight: 1000,
    aspectRatioFamily: 'square',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    id: 'home-and-shopping-640x350',
    channelId: 'home-and-shopping',
    frameWidth: 640,
    frameHeight: 350,
    aspectRatioFamily: 'wide',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    id: 'toss-1000x1000',
    channelId: 'toss',
    frameWidth: 1000,
    frameHeight: 1000,
    aspectRatioFamily: 'square',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    id: 'toss-600x240',
    channelId: 'toss',
    frameWidth: 600,
    frameHeight: 240,
    aspectRatioFamily: 'wide',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    id: 'jasondeal-1000x1000',
    channelId: 'jasondeal',
    frameWidth: 1000,
    frameHeight: 1000,
    aspectRatioFamily: 'square',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    id: 'jasondeal-720x400',
    channelId: 'jasondeal',
    frameWidth: 720,
    frameHeight: 400,
    aspectRatioFamily: 'wide',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    id: '11st-1000x1000',
    channelId: '11st',
    frameWidth: 1000,
    frameHeight: 1000,
    aspectRatioFamily: 'square',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    id: '11st-720x360',
    channelId: '11st',
    frameWidth: 720,
    frameHeight: 360,
    aspectRatioFamily: 'wide',
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
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    id: 'auction-1000x1000',
    channelId: 'auction',
    frameWidth: 1000,
    frameHeight: 1000,
    aspectRatioFamily: 'square',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    id: 'gmarket-1000x1000',
    channelId: 'gmarket',
    frameWidth: 1000,
    frameHeight: 1000,
    aspectRatioFamily: 'square',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    id: 'sk-stoa-1000x1000',
    channelId: 'sk-stoa',
    frameWidth: 1000,
    frameHeight: 1000,
    aspectRatioFamily: 'square',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    id: 'skt-deal-1000x1000',
    channelId: 'skt-deal',
    frameWidth: 1000,
    frameHeight: 1000,
    aspectRatioFamily: 'square',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    id: 'coupang-1000x1000',
    channelId: 'coupang',
    frameWidth: 1000,
    frameHeight: 1000,
    aspectRatioFamily: 'square',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    id: 'aliexpress-1000x1000',
    channelId: 'aliexpress',
    frameWidth: 1000,
    frameHeight: 1000,
    aspectRatioFamily: 'square',
    storageLabelSupported: true,
    badgeSupported: true,
  },
  {
    id: 'ns-shopping-1000x1000',
    channelId: 'ns-shopping',
    frameWidth: 1000,
    frameHeight: 1000,
    aspectRatioFamily: 'square',
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
    storageLabelSupported: true,
    badgeSupported: true,
  },
];
