import React, { useState } from 'react';
import {
  readWorkOrderSheet,
  parseWorkOrderRows,
  type BatchGenerationRequest,
  type RowStatus,
} from '@thumbnail-generator/core/import';

const STATUS_LABEL: Record<RowStatus, string> = {
  valid: '정상',
  reviewRequired: '검토필요',
  error: '오류',
};

const STATUS_COLOR: Record<RowStatus, string> = {
  valid: '#1e8e3e',
  reviewRequired: '#b58105',
  error: '#c0392b',
};

const cellStyle: React.CSSProperties = { border: '1px solid #eee', padding: '4px 6px', verticalAlign: 'top' };

export function BatchPreview() {
  const [batch, setBatch] = useState<BatchGenerationRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<RowStatus | 'all'>('all');

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setBatch(null);
    try {
      const bytes = await file.arrayBuffer();
      const rows = await readWorkOrderSheet(bytes);
      const result = parseWorkOrderRows(rows, file.name);
      setBatch(result);
    } catch (err) {
      setError(`엑셀을 읽는 중 오류: ${(err as Error).message}`);
    }
  };

  const visibleWorkOrders = batch?.workOrders.filter((w) => filter === 'all' || w.status === filter) ?? [];

  return (
    <div>
      <p style={{ margin: '4px 0', color: '#666' }}>
        표준 요청서(01_작업요청)를 선택하면 작업ID 기준으로 묶어 정상/검토필요/오류만 미리
        확인합니다. 아직 실제 생성과는 연결되어 있지 않습니다.
      </p>
      <input type="file" accept=".xlsx" onChange={onFileChange} />

      {error && <p style={{ color: STATUS_COLOR.error }}>{error}</p>}

      {batch && (
        <>
          <p style={{ marginTop: 12 }}>
            총 작업 {batch.summary.totalWorkOrders}건 — 정상 {batch.summary.valid} / 검토필요{' '}
            {batch.summary.reviewRequired} / 오류 {batch.summary.error}
          </p>

          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {(['all', 'valid', 'reviewRequired', 'error'] as const).map((s) => (
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

          <div style={{ maxHeight: 320, overflow: 'auto', border: '1px solid #ddd' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ position: 'sticky', top: 0, background: '#f5f5f5' }}>
                  <th style={cellStyle}>작업ID</th>
                  <th style={cellStyle}>상태</th>
                  <th style={cellStyle}>상품군</th>
                  <th style={cellStyle}>채널</th>
                  <th style={cellStyle}>구성</th>
                  <th style={cellStyle}>총수량</th>
                  <th style={cellStyle}>딱지</th>
                  <th style={cellStyle}>상품 목록</th>
                  <th style={cellStyle}>이슈</th>
                </tr>
              </thead>
              <tbody>
                {visibleWorkOrders.map((wo) => (
                  <tr key={wo.workId}>
                    <td style={cellStyle}>{wo.workId}</td>
                    <td style={{ ...cellStyle, color: STATUS_COLOR[wo.status], fontWeight: 600 }}>
                      {STATUS_LABEL[wo.status]}
                    </td>
                    <td style={cellStyle}>{wo.productGroup ?? '(불일치)'}</td>
                    <td style={cellStyle}>{wo.channelId ?? '(불일치/미확인)'}</td>
                    <td style={cellStyle}>{wo.composition === 'mixed' ? '혼합' : '단일'}</td>
                    <td style={cellStyle}>{wo.totalQuantity}</td>
                    <td style={cellStyle}>{wo.badge === null ? '?' : wo.badge ? 'O' : 'X'}</td>
                    <td style={cellStyle}>
                      {wo.lines.map((l) => (
                        <div key={l.rowIndex}>
                          {l.seq ?? '?'}. {l.productName} × {l.quantity ?? '?'}
                          {l.productCode ? '' : ' (코드 미확인)'}
                        </div>
                      ))}
                    </td>
                    <td style={cellStyle}>
                      {wo.issues.map((issue, idx) => (
                        <div key={idx}>{issue.message}</div>
                      ))}
                    </td>
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
