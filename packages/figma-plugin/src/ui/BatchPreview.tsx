import React, { useState } from 'react';
import {
  readWorkOrderSheet,
  parseWorkOrderRows,
  composeBatchPreview,
  type BatchPreviewResult,
  type BatchPreviewRow,
  type BatchPreviewStatus,
} from '@thumbnail-generator/core/import';

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
  verified: 'verified',
  generated: 'generated',
};

const cellStyle: React.CSSProperties = { border: '1px solid #eee', padding: '4px 6px', verticalAlign: 'top' };

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

  const visibleRows: BatchPreviewRow[] =
    preview?.rows.filter((r) => filter === 'all' || r.status === filter) ?? [];

  return (
    <div>
      <p style={{ margin: '4px 0', color: '#666' }}>
        표준 요청서(01_작업요청)를 선택하면 작업ID 기준으로 묶어 Layout 선택(verified/generated
        fallback)까지 시뮬레이션한 미리보기를 보여줍니다. 아직 실제 Figma 렌더링과는 연결되어
        있지 않습니다(mock 기반 검증 단계).
      </p>
      <input type="file" accept=".xlsx" onChange={onFileChange} />

      {error && <p style={{ color: STATUS_COLOR.error }}>{error}</p>}

      {preview && (
        <>
          <p style={{ marginTop: 12 }}>
            총 작업 {preview.summary.total}건 — 생성가능 {preview.summary.ready} / 검토필요{' '}
            {preview.summary.reviewRequired} / 오류 {preview.summary.error}
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

          <div style={{ maxHeight: 360, overflow: 'auto', border: '1px solid #ddd' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ position: 'sticky', top: 0, background: '#f5f5f5' }}>
                  <th style={cellStyle}>작업ID</th>
                  <th style={cellStyle}>채널</th>
                  <th style={cellStyle}>상품 구성</th>
                  <th style={cellStyle}>총수량</th>
                  <th style={cellStyle}>layoutKey</th>
                  <th style={cellStyle}>family</th>
                  <th style={cellStyle}>source</th>
                  <th style={cellStyle}>상태</th>
                  <th style={cellStyle}>오류/검토 사유</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.workId}>
                    <td style={cellStyle}>{row.workId}</td>
                    <td style={cellStyle}>{row.channelLabel ?? row.channelId ?? '(불일치/미확인)'}</td>
                    <td style={cellStyle}>{row.productSummary}</td>
                    <td style={cellStyle}>{row.totalQuantity}</td>
                    <td style={cellStyle}>{row.layoutKey ?? '-'}</td>
                    <td style={cellStyle}>{row.arrangementFamily ?? '-'}</td>
                    <td style={cellStyle}>{row.layoutSource ? SOURCE_LABEL[row.layoutSource] : '-'}</td>
                    <td style={{ ...cellStyle, color: STATUS_COLOR[row.status], fontWeight: 600 }}>
                      {STATUS_LABEL[row.status]}
                    </td>
                    <td style={cellStyle}>{row.reason ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
