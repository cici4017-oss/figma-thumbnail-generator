export type AspectRatioFamily = 'square' | 'wide' | 'portrait';

/**
 * aspectRatioFamily보다 세분화된 실제 비율 식별자. 같은 aspectRatioFamily(wide) 안에서도
 * 750x422(≈1.78:1)와 600x240(2.5:1)처럼 실제 비율이 크게 다르면 상품 슬롯 배치가 달라질 수
 * 있으므로, verified Layout의 재사용 여부는 aspectRatioFamily가 아니라 이 값을 기준으로
 * 판단한다. 새 비율이 확인되면 여기에 값을 추가한다(자동 계산하지 않고 실제 Figma 조사로
 * 확인된 값만 명시적으로 등록한다).
 */
export type GeometryFamily = 'square-1x1' | 'wide-16x9' | 'wide-2x1' | 'wide-5x2';

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
  storageLabelSupported: boolean;
  badgeSupported: boolean;
}
