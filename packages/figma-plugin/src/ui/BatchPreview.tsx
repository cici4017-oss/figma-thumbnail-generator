import React, { useState } from 'react';
import {
  readWorkOrderSheet,
  parseWorkOrderRows,
  composeBatchPreview,
  type BatchPreviewResult,
  type BatchPreviewRow,
  type BatchPreviewOutput,
  type BatchPreviewStatus,
} from '@thumbnail-generator/core/import';
import { checkRenderability } from '../renderPreflight';

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

export function BatchPreview() {
  const [preview, setPreview] = useState<BatchPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<BatchPreviewStatus | 'all'>('all');

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPreview(null);
    try {
      const bytes = await file.arrayBuffer();
      const rows = await readWorkOrderSheet(bytes);
      const batch = parseWorkOrderRows(rows, file.name);
      setPreview(composeBatchPreview(batch));
    } catch (err) {
      setError(`엑셀을 읽는 중 오류: ${(err as Error).message}`);
    }
  };

  // 필터는 작업ID(row) 단위 요약 상태(overallStatus) 기준 — 개별 output의 상태는
  // 항상 각 output 줄에 그대로 표시된다(요약이 개별 상태를 덮어쓰지 않는다).
  const visibleRows: BatchPreviewRow[] =
    preview?.rows.filter((r) => filter === 'all' || r.overallStatus === filter) ?? [];

  return (
    <div>
      <p style={{ margin: '4px 0', color: '#666' }}>
        표준 요청서(01_작업요청)를 선택하면 작업ID 기준으로 묶고, 채널에 등록된 출력
        규격(preset)마다 Layout 선택(verified/generated fallback)까지 시뮬레이션한
        미리보기를 보여줍니다. 한 채널이 여러 규격(예: 카카오 1000×1000 + 750×422)을 가지면
        작업ID 하나가 규격 수만큼 출력으로 나뉘고, 각 출력은 서로 독립적으로 판정됩니다.
        아직 실제 Figma 렌더링과는 연결되어 있지 않습니다(mock 기반 검증 단계).
      </p>
      <input type="file" accept=".xlsx" onChange={onFileChange} />

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
