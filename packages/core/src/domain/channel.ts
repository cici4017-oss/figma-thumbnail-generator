export type AspectRatioFamily = 'square' | 'wide' | 'portrait';

/**
 * aspectRatioFamily보다 세분화된 실제 비율 식별자. 같은 aspectRatioFamily(wide) 안에서도
 * 750x422(≈1.78:1)와 600x240(2.5:1)처럼 실제 비율이 크게 다르면 상품 슬롯 배치가 달라질 수
 * 있으므로, verified Layout의 재사용 여부는 aspectRatioFamily가 아니라 이 값을 기준으로
 * 판단한다. 새 비율이 확인되면 여기에 값을 추가한다(자동 계산하지 않고 실제 Figma 조사로
 * 확인된 값만 명시적으로 등록한다).
 */
export type GeometryFamily = 'square-1x1' | 'wide-16x9' | 'wide-2x1' | 'wide-5x2';

/**
 * verified Layout이 없을 때 이 채널 규격이 generated fallback을 허용하는지 정하는 정책.
 * - 'verified-or-generated'(기본): 검증된 Layout이 없으면 family 공식으로 generated
 *   fallback을 시도한다(기존 정책 그대로).
 * - 'verified-only': 실제 디자인이 "N개 균일 상품 슬롯" 같은 일반적인 구조가 아니라 이
 *   preset 고유의 구조(예: 토스 600x240의 hero 이미지 + 아이콘 + 소형 슬롯 혼합)라서,
 *   generic한 family 공식을 적용할 수 없는 경우에 쓴다. 검증된 Layout이 없으면 자동 생성을
 *   시도하지 않고 reviewRequired로 사람이 수동 처리하게 한다.
 */
export type ChannelFallbackPolicy = 'verified-or-generated' | 'verified-only';

export interface Channel {
  id: string;
  label: string;
}

export interface ChannelPreset {
  id: string;
  channelId: string;
  frameWidth: number;
  frameHeight: number;
  aspectRatioFamily: AspectRatioFamily;
  geometryFamily: GeometryFamily;
  fallbackPolicy: ChannelFallbackPolicy;
  storageLabelSupported: boolean;
  badgeSupported: boolean;
}
