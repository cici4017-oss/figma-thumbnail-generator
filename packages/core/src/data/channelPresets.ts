import type { ChannelPreset } from '../domain/channel';

/**
 * 파일럿 범위: 네이버 1000x1000 하나만 정의한다.
 * 다른 채널/사이즈는 파일럿 검증 후 확장.
 */
export const CHANNEL_PRESETS: ChannelPreset[] = [
  {
    id: 'naver-1000x1000',
    channelId: 'naver',
    frameWidth: 1000,
    frameHeight: 1000,
    aspectRatioFamily: 'square',
    storageLabelSupported: true,
    badgeSupported: true,
  },
];
