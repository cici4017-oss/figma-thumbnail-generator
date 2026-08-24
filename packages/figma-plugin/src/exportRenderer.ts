/**
 * Batch Render로 실제 생성에 성공한 frame만 JPG로 export한다(원본 template frame은 이
 * 함수에 절대 전달하지 않는다 — 호출부인 code.ts가 batchRenderer.ts의 결과 중
 * outcome==='generated'인 nodeId만 items로 넘긴다).
 *
 * figma.exportAsync는 main thread(code.ts)에서만 호출할 수 있다 — UI(iframe)에는 figma
 * 전역이 없다. 그래서 이 파일은 renderer.ts/generatedRenderer.ts와 마찬가지로 code.ts에서만
 * import한다. ZIP으로 묶고 다운로드를 트리거하는 건 UI 쪽 책임이다(BatchPreview.tsx).
 */

export interface ExportRequestItem {
  nodeId: string;
  fileName: string;
}

export interface ExportedFile {
  fileName: string;
  bytes: Uint8Array;
  width: number;
  height: number;
}

export interface ExportFailure {
  fileName: string;
  message: string;
}

export interface ExportBatchOutcome {
  files: ExportedFile[];
  failures: ExportFailure[];
}

export async function exportNodesAsJpg(items: ExportRequestItem[]): Promise<ExportBatchOutcome> {
  const files: ExportedFile[] = [];
  const failures: ExportFailure[] = [];

  for (const item of items) {
    const node = await figma.getNodeByIdAsync(item.nodeId);
    if (!node) {
      failures.push({ fileName: item.fileName, message: `노드 "${item.nodeId}"를 찾을 수 없습니다.` });
      continue;
    }
    if (!('exportAsync' in node) || !('width' in node) || !('height' in node)) {
      failures.push({ fileName: item.fileName, message: `노드 "${node.name}"는 JPG export를 지원하지 않습니다.` });
      continue;
    }

    try {
      // constraint를 지정하지 않으면 1x(원본 frame 크기 그대로) — 임의로 스케일을 바꾸지 않는다.
      const bytes = await (node as unknown as ExportMixin).exportAsync({ format: 'JPG' });
      const { width, height } = node as unknown as { width: number; height: number };
      files.push({ fileName: item.fileName, bytes, width, height });
    } catch (e) {
      failures.push({ fileName: item.fileName, message: (e as Error).message });
    }
  }

  return { files, failures };
}
