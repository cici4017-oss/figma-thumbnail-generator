/**
 * 판매채널은 실제 출력 규격/템플릿이 달라지는 판매채널 단위로만 관리한다
 * ("광고용"/"위탁" 같은 표기는 공식 분류가 아니므로 채널에 섞지 않는다).
 *
 * 대신 결과물 자체가 달라지는 특수 썸네일(예: 라이프스타일 연출컷)을 위해
 * thumbnailType을 별도 축으로 둔다. V1에서는 basic | staged만 지원하고,
 * 실제로 반복되는 유형이 확인될 때만 종류를 추가한다.
 */
export type ThumbnailType = 'basic' | 'staged';

export const DEFAULT_THUMBNAIL_TYPE: ThumbnailType = 'basic';
