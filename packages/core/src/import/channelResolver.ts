import type { ChannelTarget } from './types';

export function normalizeChannelLabel(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

/**
 * Excel의 "구분" 원문 라벨 → 하나 이상의 실제 채널 target.
 * - 값이 1개면 일반적인 경우.
 * - 값이 2개 이상이면 "옥션 지마켓"처럼 한 라벨이 여러 판매처를 동시에 의미하는 fanout.
 * - variantId는 동일 channelId의 하위 구분("네이버(광고용)", "쿠팡위탁" 등)을 표현한다.
 *
 * 문자열을 임의로 분해/추측하지 않는다 — 여기 명시적으로 등록되지 않은 라벨은
 * 항상 빈 배열([])을 반환하고, 호출부(workOrderParser)가 AMBIGUOUS_CHANNEL_LABEL로 처리한다.
 *
 * 시드 데이터: 지금까지 받은 작업지시 샘플에서 관측된 라벨만 등록했다.
 * 실제 운영 전 채널 목록에 맞게 계속 채워나가야 한다.
 */
export const CHANNEL_LABEL_MAP: Record<string, ChannelTarget[]> = {
  '네이버': [{ channelId: 'naver' }],
  '네이버 (광고용)': [{ channelId: 'naver', variantId: 'ad' }],
  '카카오': [{ channelId: 'kakao' }],
  '옥션 지마켓': [{ channelId: 'auction' }, { channelId: 'gmarket' }],
  '홈앤쇼핑': [{ channelId: 'home-and-shopping' }],
  '알리익스프레스': [{ channelId: 'aliexpress' }],
  'SSG': [{ channelId: 'ssg' }],
  'ssg닷컴': [{ channelId: 'ssg' }],
  'SK스토아': [{ channelId: 'sk-stoa' }],
  '쿠팡': [{ channelId: 'coupang' }],
  '쿠팡 위탁': [{ channelId: 'coupang', variantId: 'consignment' }],
  '쿠팡위탁': [{ channelId: 'coupang', variantId: 'consignment' }],
  'NS홈쇼핑': [{ channelId: 'ns-shopping' }],
  'GS샵': [{ channelId: 'gs-shop' }],
  '롯데온': [{ channelId: 'lotte-on' }],
  'SKT딜': [{ channelId: 'skt-deal' }],
  '올웨이즈': [{ channelId: 'alwayz' }],
  '이랜드몰': [{ channelId: 'eland-mall' }],
  '신세계티비쇼핑(위탁)': [{ channelId: 'shinsegae-tv-shopping', variantId: 'consignment' }],
  '11번가': [{ channelId: '11st' }],
  '11번가(위탁)': [{ channelId: '11st', variantId: 'consignment' }],
  '토스': [{ channelId: 'toss' }],
  '제이슨딜': [{ channelId: 'jasondeal' }],
};

export function resolveChannelLabel(rawLabel: string): ChannelTarget[] {
  const key = normalizeChannelLabel(rawLabel);
  const targets = CHANNEL_LABEL_MAP[key];
  return targets ? targets.slice() : [];
}
