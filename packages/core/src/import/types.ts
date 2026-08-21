export type RowStatus = 'valid' | 'reviewRequired' | 'error';

export type WorkOrderIssueCode =
  | 'AMBIGUOUS_CHANNEL_LABEL'
  | 'PRODUCT_NAME_UNPARSEABLE'
  | 'PRODUCT_NOT_MATCHED'
  | 'PRODUCT_MATCHED_MULTIPLE'
  | 'QUANTITY_UNRESOLVED'
  | 'UNKNOWN_BADGE_VALUE'
  | 'INVALID_PRICE'
  | 'HAS_NOTE';

export interface WorkOrderIssue {
  code: WorkOrderIssueCode;
  message: string;
}

/** 라벨 하나가 가리키는 실제 채널. variantId는 "네이버(광고용)", "쿠팡위탁"처럼 동일 channelId의 하위 구분. */
export interface ChannelTarget {
  channelId: string;
  variantId?: string;
}

/** Excel에서 그대로 읽어온 한 행 (병합 셀은 이미 상속 처리된 상태). */
export interface RawWorkOrderRow {
  rowIndex: number;
  channelLabel: string;
  productNameRaw: string;
  optionNameRaw: string;
  regularPriceRaw: string | number | null;
  eventPriceRaw: string | number | null;
  badgeRaw: string | null;
  noteRaw: string | null;
}

/** 상품명 문자열 파싱 결과. assetKey는 여기서 만들지 않는다 — Product Resolver의 책임. */
export interface ParsedProductName {
  raw: string;
  brand: string | null;
  name: string | null;
  capacity: string | null;
  /** 상품명 자체에 있던 수량 후보. "N개" 하나면 [N], "N개/M개 골라담기"면 [N, M]. */
  quantities: number[];
  isChoiceListing: boolean;
  /** 사람이 읽기 좋은 정규화 표기 ("본죽 메추리알 장조림 180g"). assetKey가 아님. */
  normalizedLabel: string | null;
}

export interface ProductMatch {
  assetKey: string | null;
  matchedCount: number;
}

export interface QuantityResolution {
  value: number | null;
  source: 'productName' | 'optionName' | null;
  isOverride: boolean;
}

export interface WorkOrderLine {
  rowIndex: number;
  status: RowStatus;
  issues: WorkOrderIssue[];

  channel: {
    label: string;
    /** 0개=미해결, 1개=일반, 2개 이상=fanout(예: "옥션 지마켓" → auction + gmarket) */
    targets: ChannelTarget[];
  };

  product: ParsedProductName;
  productMatch: ProductMatch;

  option: { raw: string; isOverride: boolean };
  quantity: { value: number | null; source: 'productName' | 'optionName' | null };

  badge: boolean | null;
  price: { regular: number | null; event: number | null };
  note: { raw: string | null; presetCode: string | null };
}

export interface BatchSummary {
  total: number;
  valid: number;
  reviewRequired: number;
  error: number;
  /** channelId 또는 "channelId:variantId" 별 집계 */
  byChannel: Record<string, number>;
}

export interface BatchGenerationRequest {
  sourceFileName: string;
  parsedAt: string;
  lines: WorkOrderLine[];
  summary: BatchSummary;
}
