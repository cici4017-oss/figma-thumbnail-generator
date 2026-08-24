import React, { useEffect, useState } from 'react';
// JSZip은 여기(UI 번들)에서만 import한다 — code.ts(Figma main thread)는 이 파일을 import하지
// 않으므로 JSZip이 code.js에 섞여 들어가지 않는다(exceljs를 core/import로 분리한 것과 동일한
// 원칙: 무거운 라이브러리는 실제로 쓰는 쪽 번들에만 있어야 한다).
import JSZip from 'jszip';
import { PRODUCTS, CHANNELS } from '@thumbnail-generator/core';
import {
  readWorkOrderSheet,
  parseWorkOrderRows,
  parseClipboardTable,
  composeBatchPreview,
  buildWorkOrderTemplateWorkbook,
  type BatchGenerationRequest,
  type BatchPreviewResult,
  type BatchPreviewRow,
  type BatchPreviewOutput,
  type BatchPreviewStatus,
} from '@thumbnail-generator/core/import';
import { checkRenderability } from '../renderPreflight';
import {
  AUTO_GENERATED_VERIFIED_PAGE_NAME,
  AUTO_GENERATED_REVIEW_PAGE_NAME,
  type BatchRenderResult,
} from '../batchRenderer';
import { selectExportableOutputs, buildExportItems, buildZipFileName } from '../exportNaming';

/**
 * batchRenderer.ts(renderBatch)와 exportRenderer.ts(exportNodesAsJpg)는 figma 전역이 있어야
 * 동작한다 — 이 컴포넌트는 code.ts가 showUI로 띄우는 iframe(ui.html) 안에서 실행되므로 figma
 * 전역이 없다. 그래서 직접 호출하지 않고 code.ts로 postMessage를 보내 실행을 위임하고,
 * 응답을 window.onmessage로 받는다(main.tsx의 PilotApp과 동일한 패턴).
 */
function post(message: unknown) {
  parent.postMessage({ pluginMessage: message }, '*');
}

type PluginToUiMessage =
  | { type: 'batchRenderResult'; result: BatchRenderResult }
  | { type: 'exportBatchResult'; files: { fileName: string; bytes: Uint8Array }[]; failures: { fileName: string; message: string }[] }
  | { type: 'error'; message: string };

const STATUS_LABEL: Record<BatchPreviewStatus, string> = {
  ready: '생성가능',
  reviewRequired: '검토필요',
  error: '오류',
};

const STATUS_COLOR: Record<BatchPreviewStatus, string> = {
  ready: '#1e8e3e',
  reviewRequired: '#b58105',
  error: '#c0392b',
};

const SOURCE_LABEL: Record<'verified' | 'generated', string> = {
  verified: 'VERIFIED',
  generated: 'GENERATED',
};

/**
 * plan status(위 STATUS_*, core가 판정하는 "이 조합이 논리적으로 유효한가")와 renderability
 * (아래, 이 output을 지금 실제 Figma에서 만들 수 있는가)는 서로 다른 질문이라 섞어 보여주지
 * 않는다 — status가 'ready'/'reviewRequired'여도(=layoutKey가 있어도) 실제 template
 * binding/generated renderer 지원이 없으면 지금 당장 생성은 안 될 수 있다.
 */
function renderabilityLabel(output: BatchPreviewOutput): { text: string; color: string } {
  if (!output.layoutKey || !output.layoutSource) {
    return { text: '-', color: '#999' };
  }
  const result = checkRenderability({
    layoutKey: output.layoutKey,
    channelPresetId: output.channelPresetId,
    layoutSource: output.layoutSource,
    arrangementFamily: output.arrangementFamily,
  });
  if (result.renderable) return { text: '생성 가능', color: '#1e8e3e' };
  if (result.reason === 'NO_FIGMA_TEMPLATE_BINDING') return { text: '템플릿 없음', color: '#c0392b' };
  return { text: 'generated 미지원', color: '#c0392b' };
}

const cellStyle: React.CSSProperties = { border: '1px solid #eee', padding: '4px 6px', verticalAlign: 'top' };
const groupCellStyle: React.CSSProperties = { ...cellStyle, background: '#fafafa', fontWeight: 600 };

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function BatchPreview() {
  const [preview, setPreview] = useState<BatchPreviewResult | null>(null);
  const [batch, setBatch] = useState<BatchGenerationRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<BatchPreviewStatus | 'all'>('all');
  const [includeReviewRequired, setIncludeReviewRequired] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderResult, setRenderResult] = useState<BatchRenderResult | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [clipboardText, setClipboardText] = useState('');

  useEffect(() => {
    window.onmessage = (event: MessageEvent) => {
      const msg = event.data.pluginMessage as PluginToUiMessage | undefined;
      if (!msg) return;

      if (msg.type === 'batchRenderResult') {
        setRenderResult(msg.result);
        setRendering(false);
      } else if (msg.type === 'exportBatchResult') {
        setExporting(false);
        if (msg.files.length === 0) {
          setExportNotice('export된 파일이 없습니다.');
          return;
        }
        const zip = new JSZip();
        for (const file of msg.files) {
          zip.file(file.fileName, file.bytes);
        }
        zip.generateAsync({ type: 'blob' }).then((blob) => {
          downloadBlob(blob, buildZipFileName());
          const failedNote =
            msg.failures.length > 0
              ? ` (실패 ${msg.failures.length}건: ${msg.failures.map((f) => f.fileName).join(', ')})`
              : '';
          setExportNotice(`JPG ${msg.files.length}개를 ZIP으로 저장했습니다.${failedNote}`);
        });
      } else if (msg.type === 'error') {
        setError(msg.message);
        setRendering(false);
        setExporting(false);
      }
    };
    return () => {
      window.onmessage = null;
    };
  }, []);

  const onDownloadTemplate = async () => {
    setError(null);
    setDownloadingTemplate(true);
    try {
      // PRODUCTS/CHANNELS는 현재 플러그인에 포함된 최신 Product Registry/채널 데이터 그대로다 —
      // generateWorkOrderTemplate.mjs가 저장소용 정적 파일을 만들 때 쓰는 것과 동일한 빌더를
      // 그대로 호출하므로, 하드코딩 상품/채널 목록을 이 파일에 따로 유지하지 않는다.
      const workbook = buildWorkOrderTemplateWorkbook({ products: PRODUCTS, channels: CHANNELS });
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      downloadBlob(blob, '썸네일_자동화_요청서.xlsx');
    } catch (err) {
      setError(`Excel 양식 생성 중 오류: ${(err as Error).message}`);
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // Excel 표 붙여넣기(회사 환경 기본 사용법) — 파일을 만들거나 서버로 보내지 않고, 클립보드
  // 텍스트를 RawWorkOrderRow[]로 바꾼 뒤에는 xlsx 업로드 경로와 완전히 동일한 파이프라인
  // (parseWorkOrderRows -> composeBatchPreview -> ... -> batchRenderer)을 그대로 탄다.
  const processClipboardText = (text: string) => {
    setError(null);
    setRenderResult(null);
    setExportNotice(null);
    if (!text.trim()) {
      setError('붙여넣은 내용이 비어 있습니다.');
      return;
    }
    try {
      const rows = parseClipboardTable(text);
      if (rows.length === 0) {
        setError('붙여넣은 내용에서 읽을 수 있는 행을 찾지 못했습니다. 작업ID~비고 열을 포함해 복사했는지 확인해주세요.');
        return;
      }
      const parsedBatch = parseWorkOrderRows(rows, '클립보드 붙여넣기');
      setBatch(parsedBatch);
      setPreview(composeBatchPreview(parsedBatch));
    } catch (err) {
      setError(`붙여넣은 표를 읽는 중 오류: ${(err as Error).message}`);
    }
  };

  const onClipboardPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;
    e.preventDefault();
    setClipboardText(text);
    processClipboardText(text);
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPreview(null);
    setBatch(null);
    setRenderResult(null);
    setExportNotice(null);
    setClipboardText('');
    try {
      const bytes = await file.arrayBuffer();
      const rows = await readWorkOrderSheet(bytes);
      const parsedBatch = parseWorkOrderRows(rows, file.name);
      setBatch(parsedBatch);
      setPreview(composeBatchPreview(parsedBatch));
    } catch (err) {
      setError(`엑셀을 읽는 중 오류: ${(err as Error).message}`);
    }
  };

  const onRenderBatch = () => {
    if (!batch) return;
    setRendering(true);
    setError(null);
    setRenderResult(null);
    setExportNotice(null);
    post({ type: 'renderBatch', batch, includeReviewRequired });
  };

  const onExportBatch = () => {
    const items = buildExportItems(renderResult);
    if (items.length === 0) return;
    setExporting(true);
    setError(null);
    setExportNotice(null);
    post({ type: 'exportBatch', items });
  };

  const generatedCount = selectExportableOutputs(renderResult).length;

  // 실제로 결과가 생긴 페이지만 알려준다(예: verified만 생성됐으면 AUTO_GENERATED_REVIEW는
  // 언급하지 않음). 페이지 이동은 batchRenderer.ts가 하고, 여기서는 완료 메시지만 만든다 —
  // 배치 완료 후 selection은 하지 않는다(서로 다른 페이지 노드를 한 번에 selection할 수 없음).
  const generatedPages = Array.from(
    new Set(
      (renderResult?.outputs ?? [])
        .filter((o) => o.outcome === 'generated')
        .map((o) => (o.source === 'verified' ? AUTO_GENERATED_VERIFIED_PAGE_NAME : AUTO_GENERATED_REVIEW_PAGE_NAME)),
    ),
  );

  // 필터는 작업ID(row) 단위 요약 상태(overallStatus) 기준 — 개별 output의 상태는
  // 항상 각 output 줄에 그대로 표시된다(요약이 개별 상태를 덮어쓰지 않는다).
  const visibleRows: BatchPreviewRow[] =
    preview?.rows.filter((r) => filter === 'all' || r.overallStatus === filter) ?? [];

  return (
    <div>
      <p style={{ margin: '4px 0', color: '#666' }}>
        작업 목록을 넣으면 작업ID 기준으로 묶고, 채널에 등록된 출력 규격(preset)마다 Layout
        선택(verified/generated fallback)까지 시뮬레이션한 미리보기를 보여줍니다. 한 채널이 여러
        규격(예: 카카오 1000×1000 + 750×422)을 가지면 작업ID 하나가 규격 수만큼 출력으로 나뉘고,
        각 출력은 서로 독립적으로 판정됩니다. 아래 "Figma에 일괄 생성"은 미리보기 판정을 그대로
        다시 계산해 실제로 clone을 만듭니다 — 기존 원본/템플릿 프레임은 수정하지 않고, 결과는
        AUTO_GENERATED_VERIFIED / AUTO_GENERATED_REVIEW 페이지에 정리됩니다.
      </p>

      <div style={{ border: '1px solid #18a0fb', borderRadius: 6, padding: 10, margin: '8px 0' }}>
        <p style={{ margin: '0 0 6px 0', fontWeight: 600 }}>Excel 표 붙여넣기</p>
        <p style={{ margin: '0 0 6px 0', fontSize: 11, color: '#666' }}>
          회사 Excel에서 작업 행(작업ID~비고 열)을 드래그해 Ctrl+C한 뒤, 아래 칸을 클릭하고
          Ctrl+V만 하면 바로 미리보기가 만들어집니다. 파일을 따로 저장하거나 사외로 반출할 필요가
          없습니다. 헤더(첫 줄 컬럼명)를 함께 복사해도, 안 해도 됩니다.
        </p>
        <textarea
          value={clipboardText}
          onChange={(e) => setClipboardText(e.target.value)}
          onPaste={onClipboardPaste}
          placeholder="Excel에서 작업 행을 복사한 뒤 여기에 붙여넣으세요 (Ctrl+V)"
          style={{ width: '100%', height: 110, boxSizing: 'border-box', fontFamily: 'monospace', fontSize: 11 }}
        />
        <div style={{ marginTop: 6 }}>
          <button onClick={() => processClipboardText(clipboardText)} disabled={!clipboardText.trim()}>
            붙여넣은 내용으로 미리보기 만들기
          </button>
        </div>
      </div>

      <details style={{ margin: '8px 0' }}>
        <summary style={{ cursor: 'pointer', color: '#666' }}>
          보조 기능: Excel 파일로 진행(사외 반출 승인이 필요할 수 있습니다)
        </summary>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0' }}>
          <button onClick={onDownloadTemplate} disabled={downloadingTemplate}>
            {downloadingTemplate ? '양식 만드는 중…' : 'Excel 양식 다운로드'}
          </button>
          <label
            style={{
              display: 'inline-block',
              padding: '4px 10px',
              border: '1px solid #888',
              borderRadius: 4,
              cursor: 'pointer',
              background: '#f5f5f5',
            }}
          >
            작성한 Excel 업로드
            <input type="file" accept=".xlsx" onChange={onFileChange} style={{ display: 'none' }} />
          </label>
        </div>
        <p style={{ margin: '0 0 8px 0', fontSize: 11, color: '#666' }}>
          Excel 파일이 없다면 먼저 "Excel 양식 다운로드"로 받아 작성한 뒤, 같은 파일을 "작성한 Excel
          업로드"에 올려주세요. 상품목록/채널목록은 항상 최신 데이터로 자동 채워집니다.
        </p>
      </details>

      {error && <p style={{ color: STATUS_COLOR.error }}>{error}</p>}

      {preview && (
        <>
          <p style={{ marginTop: 12, marginBottom: 2 }}>
            작업ID {preview.summary.totalWorkOrders}건 — 생성가능 {preview.summary.workOrderStatusSummary.ready} /
            검토필요 {preview.summary.workOrderStatusSummary.reviewRequired} / 오류{' '}
            {preview.summary.workOrderStatusSummary.error}
          </p>
          <p style={{ margin: 0, color: '#666' }}>
            실제 출력(썸네일) {preview.summary.totalOutputs}건 — 생성가능{' '}
            {preview.summary.outputStatusSummary.ready} / 검토필요{' '}
            {preview.summary.outputStatusSummary.reviewRequired} / 오류{' '}
            {preview.summary.outputStatusSummary.error}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0' }}>
            <button onClick={onRenderBatch} disabled={rendering || !batch}>
              {rendering ? '생성 중…' : 'Figma에 일괄 생성'}
            </button>
            <label style={{ fontSize: 11, color: '#666' }}>
              <input
                type="checkbox"
                checked={includeReviewRequired}
                onChange={(e) => setIncludeReviewRequired(e.target.checked)}
              />{' '}
              검토필요(reviewRequired)도 생성 (기본 꺼짐 — generated renderer가 지원하는 경우만
              적용됨)
            </label>
          </div>

          {renderResult && (
            <>
              <p style={{ margin: '0 0 8px 0', fontSize: 12 }}>
                실제 생성 {renderResult.summary.generatedCount}건 / 검토 스킵{' '}
                {renderResult.summary.skippedReviewRequiredCount}건 / 미지원 스킵{' '}
                {renderResult.summary.skippedNotRenderableCount}건 / 오류 스킵{' '}
                {renderResult.summary.skippedErrorCount}건
                {renderResult.summary.failedCount > 0 && (
                  <span style={{ color: STATUS_COLOR.error }}> / 렌더 실패 {renderResult.summary.failedCount}건</span>
                )}
              </p>

              {generatedCount > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 4px 0' }}>
                    <span style={{ fontWeight: 600 }}>{generatedCount}개 생성 완료</span>
                    <button onClick={onExportBatch} disabled={exporting}>
                      {exporting ? '내보내는 중…' : 'JPEG 일괄 저장'}
                    </button>
                  </div>
                  <p style={{ margin: '0 0 8px 0', fontSize: 11, color: '#666' }}>
                    생성된 페이지: {generatedPages.join(', ')}
                  </p>
                </>
              )}

              {exportNotice && <p style={{ margin: '0 0 8px 0', fontSize: 12, color: '#1e8e3e' }}>{exportNotice}</p>}
            </>
          )}

          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {(['all', 'ready', 'reviewRequired', 'error'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                style={{
                  fontWeight: filter === s ? 700 : 400,
                  textDecoration: filter === s ? 'underline' : 'none',
                }}
              >
                {s === 'all' ? '전체' : STATUS_LABEL[s]}
              </button>
            ))}
          </div>

          <div style={{ maxHeight: 420, overflow: 'auto', border: '1px solid #ddd' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ position: 'sticky', top: 0, background: '#f5f5f5' }}>
                  <th style={cellStyle}>작업ID</th>
                  <th style={cellStyle}>채널</th>
                  <th style={cellStyle}>상품 구성</th>
                  <th style={cellStyle}>총수량</th>
                  <th style={cellStyle}>출력 규격</th>
                  <th style={cellStyle}>layoutKey</th>
                  <th style={cellStyle}>family</th>
                  <th style={cellStyle}>source</th>
                  <th style={cellStyle}>상태</th>
                  <th style={cellStyle} title="이 조합을 지금 실제 Figma에서 생성할 수 있는지(별개 판정)">
                    Figma 생성
                  </th>
                  <th style={cellStyle}>오류/검토 사유</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => {
                  // parser 단계에서 이미 확정되어 outputs가 없는 경우(비고/오류) 한 줄만 표시
                  const lineCount = Math.max(row.outputs.length, 1);
                  return (
                    <React.Fragment key={row.workId}>
                      {row.outputs.length === 0 ? (
                        <tr>
                          <td style={groupCellStyle}>{row.workId}</td>
                          <td style={groupCellStyle}>{row.channelLabel ?? row.channelId ?? '(불일치/미확인)'}</td>
                          <td style={groupCellStyle}>{row.productSummary}</td>
                          <td style={groupCellStyle}>{row.totalQuantity}</td>
                          <td style={cellStyle} colSpan={6}>
                            (채널 fan-out 미시도)
                          </td>
                          <td style={{ ...cellStyle, color: STATUS_COLOR[row.overallStatus], fontWeight: 600 }}>
                            {STATUS_LABEL[row.overallStatus]} — {row.parserReason ?? ''}
                          </td>
                        </tr>
                      ) : (
                        row.outputs.map((output, i) => (
                          <tr key={`${row.workId}-${output.channelPresetId}`}>
                            {i === 0 && (
                              <>
                                <td style={groupCellStyle} rowSpan={lineCount}>
                                  {row.workId}
                                </td>
                                <td style={groupCellStyle} rowSpan={lineCount}>
                                  {row.channelLabel ?? row.channelId ?? '(불일치/미확인)'}
                                </td>
                                <td style={groupCellStyle} rowSpan={lineCount}>
                                  {row.productSummary}
                                </td>
                                <td style={groupCellStyle} rowSpan={lineCount}>
                                  {row.totalQuantity}
                                </td>
                              </>
                            )}
                            <td style={cellStyle}>
                              {output.frameWidth}×{output.frameHeight} ({output.aspectRatioFamily})
                            </td>
                            <td style={cellStyle}>{output.layoutKey ?? '-'}</td>
                            <td style={cellStyle}>{output.arrangementFamily ?? '-'}</td>
                            <td style={cellStyle}>{output.layoutSource ? SOURCE_LABEL[output.layoutSource] : '-'}</td>
                            <td style={{ ...cellStyle, color: STATUS_COLOR[output.status], fontWeight: 600 }}>
                              {STATUS_LABEL[output.status]}
                            </td>
                            {(() => {
                              const renderability = renderabilityLabel(output);
                              return (
                                <td style={{ ...cellStyle, color: renderability.color, fontWeight: 600 }}>
                                  {renderability.text}
                                </td>
                              );
                            })()}
                            <td style={cellStyle}>{output.reason ?? ''}</td>
                          </tr>
                        ))
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
