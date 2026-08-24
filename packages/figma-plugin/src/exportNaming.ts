import type { BatchRenderResult, BatchRenderOutputResult } from './batchRenderer';

/**
 * JPEG 일괄 export 파일명 규칙 + export 대상 선정. figma 전역에 의존하지 않는 순수 함수라
 * code.ts/UI 양쪽에서 안전하게 쓸 수 있고, 별도 Figma 파일 없이 유닛 테스트로 검증할 수 있다
 * (batchRenderer.ts에서 타입만 가져온다 — 이 파일 자체는 실제로 figma API를 호출하지 않는다).
 *
 * 내부 layoutKey/channelPresetId 대신 업무 정보(workOrderId + 채널 라벨 + 실제 규격)를
 * 우선한다 — 사람이 파일명만 보고 어떤 작업의 어떤 출력인지 바로 알 수 있어야 한다.
 */

export function buildExportFileName(
  workOrderId: string,
  channelLabel: string,
  frameWidth: number,
  frameHeight: number,
): string {
  return `${workOrderId}_${channelLabel}_${frameWidth}x${frameHeight}.jpg`;
}

/**
 * 동일 파일명이 여러 개면 뒤에 등장하는 것부터 `_2`, `_3` ... 접미사를 붙인다.
 * 원래 순서/개수는 그대로 유지한다(파일을 빠뜨리거나 합치지 않음).
 */
export function dedupeFileNames(names: string[]): string[] {
  const seenCount = new Map<string, number>();
  return names.map((name) => {
    const count = seenCount.get(name) ?? 0;
    seenCount.set(name, count + 1);
    if (count === 0) return name;

    const dotIndex = name.lastIndexOf('.');
    const base = dotIndex >= 0 ? name.slice(0, dotIndex) : name;
    const ext = dotIndex >= 0 ? name.slice(dotIndex) : '';
    return `${base}_${count + 1}${ext}`;
  });
}

export function buildZipFileName(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `thumbnail_batch_${y}${m}${d}.zip`;
}

/** Batch Render 결과 중 실제로 clone이 생성된 output만 export 후보다(skipped/failed 제외). */
export function selectExportableOutputs(
  result: BatchRenderResult | null,
): (BatchRenderOutputResult & { nodeId: string })[] {
  return (result?.outputs ?? []).filter(
    (o): o is BatchRenderOutputResult & { nodeId: string } => o.outcome === 'generated' && !!o.nodeId,
  );
}

/** export 대상 nodeId + 최종 파일명(충돌 해소 완료) 목록을 만든다. */
export function buildExportItems(result: BatchRenderResult | null): { nodeId: string; fileName: string }[] {
  const generated = selectExportableOutputs(result);
  const rawNames = generated.map((o) =>
    buildExportFileName(o.workOrderId, o.channelLabel ?? o.channelPresetId, o.frameWidth, o.frameHeight),
  );
  const finalNames = dedupeFileNames(rawNames);
  return generated.map((o, i) => ({ nodeId: o.nodeId, fileName: finalNames[i] }));
}
