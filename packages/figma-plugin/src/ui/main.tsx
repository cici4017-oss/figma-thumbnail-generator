import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

type PluginToUiMessage =
  | { type: 'success'; nodeId: string }
  | { type: 'error'; message: string };

function App() {
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [status, setStatus] = useState(
    '상품 이미지를 선택하세요 (1종 상품 × 3개 슬롯에 동일 이미지가 적용됩니다)',
  );
  const [isError, setIsError] = useState(false);

  window.onmessage = (event: MessageEvent) => {
    const msg = event.data.pluginMessage as PluginToUiMessage | undefined;
    if (!msg) return;
    if (msg.type === 'success') {
      setStatus(`생성 완료 — 원본 옆에 결과 프레임이 추가되었습니다. (node: ${msg.nodeId})`);
      setIsError(false);
    } else if (msg.type === 'error') {
      setStatus(msg.message);
      setIsError(true);
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    setBytes(new Uint8Array(buf));
    setStatus(`선택됨: ${file.name}`);
    setIsError(false);
  };

  const onGenerate = () => {
    if (!bytes) {
      setStatus('이미지를 먼저 선택해주세요.');
      setIsError(true);
      return;
    }
    setStatus('생성 중...');
    setIsError(false);
    parent.postMessage({ pluginMessage: { type: 'generate', bytes: Array.from(bytes) } }, '*');
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', padding: 12, fontSize: 12 }}>
      <p style={{ marginTop: 0, fontWeight: 600 }}>LAYOUT_02 파일럿</p>
      <p style={{ color: '#666' }}>네이버_소고기장조림130_3 · 상품 1종 × 3개</p>
      <input type="file" accept="image/*" onChange={onFileChange} />
      <div style={{ marginTop: 12 }}>
        <button onClick={onGenerate} disabled={!bytes}>
          결과 프레임 생성
        </button>
      </div>
      <p style={{ marginTop: 12, color: isError ? '#c0392b' : '#333' }}>{status}</p>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<App />);
}
