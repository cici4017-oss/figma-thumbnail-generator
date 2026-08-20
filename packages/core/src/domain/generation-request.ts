export interface GenerationRequestItem {
  productId: string;
  quantity: number;
}

export interface GenerationRequestOptions {
  badge?: { enabled: boolean; label?: string };
  storageLabel?: { enabled: boolean; type?: 'frozen' | 'refrigerated' | 'roomTemp' | 'pouch' };
  logoVariant?: 'red' | 'gray' | 'none';
}

export interface GenerationRequest {
  /** 판매수량. slotCount 매칭 대상 (Excel 붙여넣기/UI 입력 모두 이 구조로 수렴). */
  items: GenerationRequestItem[];
  /** 판매수량에 포함되지 않는 증정품. gift 슬롯에만 매핑된다. */
  giftItems?: GenerationRequestItem[];
  channelPresetId: string;
  options?: GenerationRequestOptions;
}
