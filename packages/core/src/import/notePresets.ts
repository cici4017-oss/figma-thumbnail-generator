/**
 * 반복적으로 등장하는 "비고" 문구를 위한 프리셋 등록부.
 *
 * V1 정책: 등록 여부와 무관하게 비고가 있으면 항상 최소 reviewRequired다.
 * 여기 등록된 프리셋은 "향후 자동 처리를 붙일 수 있는 후보"라는 표식일 뿐,
 * 지금 당장 review를 건너뛰게 하지는 않는다.
 */
export const NOTE_PRESETS: Record<string, string> = {
  '뷰티컷+시뮬': 'beauty-plus-simulation',
};

export function resolveNotePreset(rawNote: string): string | null {
  const key = rawNote.trim();
  return NOTE_PRESETS[key] ?? null;
}
