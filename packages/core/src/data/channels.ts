import type { Channel } from '../domain/channel';

/**
 * 실제 출력 규격/템플릿이 달라지는 판매채널 단위로만 관리한다.
 * "광고용"/"위탁" 같은 표기는 공식 분류가 아니므로 포함하지 않는다.
 *
 * 표준 요청서(templates/썸네일_자동화_요청서.xlsx)의 03_채널목록과 반드시 동기화해야 한다.
 * (생성 스크립트: packages/core/scripts/generateWorkOrderTemplate.mjs)
 */
export const CHANNELS: Channel[] = [
  { id: 'naver', label: '네이버' },
  { id: 'kakao', label: '카카오' },
  { id: 'auction', label: '옥션' },
  { id: 'gmarket', label: '지마켓' },
  { id: 'home-and-shopping', label: '홈앤쇼핑' },
  { id: 'aliexpress', label: '알리익스프레스' },
  { id: 'ssg', label: 'SSG' },
  { id: 'sk-stoa', label: 'SK스토아' },
  { id: 'coupang', label: '쿠팡' },
  { id: 'ns-shopping', label: 'NS홈쇼핑' },
  { id: 'gs-shop', label: 'GS샵' },
  { id: 'lotte-on', label: '롯데온' },
  { id: 'skt-deal', label: 'SKT딜' },
  { id: 'alwayz', label: '올웨이즈' },
  { id: 'eland-mall', label: '이랜드몰' },
  { id: 'shinsegae-tv-shopping', label: '신세계TV쇼핑' },
  { id: '11st', label: '11번가' },
  { id: 'toss', label: '토스' },
  { id: 'jasondeal', label: '제이슨딜' },
];
