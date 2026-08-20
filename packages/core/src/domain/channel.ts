export type AspectRatioFamily = 'square' | 'wide' | 'portrait';

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
  storageLabelSupported: boolean;
  badgeSupported: boolean;
}
