import type { ProductGroupId } from '../domain/product';

export type RowStatus = 'valid' | 'reviewRequired' | 'error';

export type WorkOrderIssueCode =
  | 'UNKNOWN_PRODUCT_GROUP'
  | 'UNKNOWN_CHANNEL'
  | 'UNKNOWN_PRODUCT_NAME'
  | 'PRODUCT_CODE_MISSING'
  | 'PRODUCT_GROUP_MISMATCH'
  | 'INVALID_QUANTITY'
  | 'UNKNOWN_BADGE_VALUE'
  | 'MISSING_SEQ'
  | 'DUPLICATE_SEQ'
  | 'MISSING_WORK_ID'
  | 'INCONSISTENT_PRODUCT_GROUP'
  | 'INCONSISTENT_CHANNEL'
  | 'INCONSISTENT_BADGE'
  | 'HAS_NOTE';

export interface WorkOrderIssue {
  code: WorkOrderIssueCode;
  message: string;
  /** 특정 행에서 발생한 문제면 그 행 번호. 작업ID 그룹 전체에 대한 문제면 비어 있음. */
  rowIndex?: number;
}

/** 표준 요청서(01_작업요청)에서 그대로 읽은 한 행. 병합 셀이 없으므로 상속 로직이 필요 없다. */
export interface RawWorkOrderRow {
  rowIndex: number;
  workId: string;
  seq: number | null;
  productGroup: string;
  channel: string;
  productName: string;
  /** F열(상품코드) 수식의 계산 결과. 값이 비어 있으면 상품명이 상품목록에 없거나 수식이 깨진 것. */
  productCode: string;
  quantity: number | null;
  badgeRaw: string | null;
  note: string | null;
}

export interface WorkOrderLine {
  rowIndex: number;
  seq: number | null;
  productGroupLabel: string;
  productGroup: ProductGroupId | null;
  channelLabel: string;
  channelId: string | null;
  productName: string;
  productCode: string | null;
  quantity: number | null;
  badge: boolean | null;
  note: string | null;
  issues: WorkOrderIssue[];
}

/** 작업ID(=썸네일 1개) 단위로 묶은 결과. 단일상품이면 lines가 1개, 혼합상품이면 여러 개. */
export interface WorkOrder {
  workId: string;
  status: RowStatus;
  issues: WorkOrderIssue[];
  productGroup: ProductGroupId | null;
  channelId: string | null;
  channelLabel: string | null;
  badge: boolean | null;
  composition: 'single' | 'mixed';
  totalQuantity: number;
  note: string | null;
  lines: WorkOrderLine[];
}

export interface BatchSummary {
  totalWorkOrders: number;
  valid: number;
  reviewRequired: number;
  error: number;
}

export interface BatchGenerationRequest {
  sourceFileName: string;
  parsedAt: string;
  workOrders: WorkOrder[];
  summary: BatchSummary;
}
