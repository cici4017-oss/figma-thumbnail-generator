/**
 * 실제 Figma에서 검증된(verified) Layout과, family 공식으로 자동 생성된(generated) Layout을
 * 구분한다. verified는 실제 디자인 산출물을 근거로 하고, generated는 재사용 가능한 배치
 * family 공식으로 계산된 슬롯 배치다 — 실제 Figma 템플릿 바인딩이 없을 수 있으므로 항상
 * AUTO_GENERATED_REVIEW 같은 검토 영역으로 취급한다.
 */

/** 재사용 가능한 기본 배치 family. 실제 검증된 Layout들(LAYOUT_01~11)의 배치 패턴을 일반화한 것. */
export type ArrangementFamilyId =
  | 'single-center'
  | 'row-linear'
  | 'diagonal-cascade'
  | 'pyramid-stack'
  | 'grid-cluster';

export interface GeneratedLayoutParams {
  familyId: ArrangementFamilyId;
  slotCount: number;
}

export type LayoutSource =
  | { kind: 'verified' }
  | { kind: 'generated'; params: GeneratedLayoutParams };
