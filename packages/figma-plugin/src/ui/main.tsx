import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

type PluginToUiMessage =
  | { type: 'products'; products: string[] }
  | { type: 'success'; nodeId: string }
  | { type: 'registered'; productKey: string }
  | { type: 'error'; message: string };

function post(message: unknown) {
  parent.postMessage({ pluginMessage: message }, '*');
}

function App() {
  const [products, setProducts] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(3);
  const [registerKey, setRegisterKey] = useState('소고기장조림130g');
  const [status, setStatus] = useState('상품 목록을 불러오는 중...');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    window.onmessage = (event: MessageEvent) => {
      const msg = event.data.pluginMessage as PluginToUiMessage | undefined;
      if (!msg) return;

      if (msg.type === 'products') {
        setProducts(msg.products);
        setSelectedProduct((prev) => (prev && msg.products.includes(prev) ? prev : msg.products[0] || ''));
        setStatus(
          msg.products.length > 0
            ? `PRODUCT_ASSETS에 등록된 상품 ${msg.products.length}개`
            : 'PRODUCT_ASSETS에 등록된 상품이 없습니다. 아래에서 먼저 상품을 등록해주세요.',
        );
        setIsError(msg.products.length === 0);
      } else if (msg.type === 'success') {
        setStatus(`생성 완료 — 원본 옆에 결과 프레임이 추가되었습니다. (node: ${msg.nodeId})`);
        setIsError(false);
      } else if (msg.type === 'registered') {
        setStatus(`"${msg.productKey}" 등록 완료`);
        setIsError(false);
      } else if (msg.type === 'error') {
        setStatus(msg.message);
        setIsError(true);
      }
    };

    post({ type: 'ready' });
  }, []);

  const onRegister = () => {
    if (!registerKey.trim()) {
      setStatus('상품 키를 입력해주세요.');
      setIsError(true);
      return;
    }
    setStatus('등록 중...');
    setIsError(false);
    post({ type: 'register', productKey: registerKey.trim() });
  };

  const onGenerate = () => {
    if (!selectedProduct) {
      setStatus('상품을 선택해주세요.');
      setIsError(true);
      return;
    }
    setStatus('생성 중...');
    setIsError(false);
    post({ type: 'generate', productKey: selectedProduct, quantity });
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', padding: 12, fontSize: 12 }}>
      <p style={{ marginTop: 0, fontWeight: 600 }}>LAYOUT_02 파일럿 · PRODUCT_ASSETS</p>

      <fieldset style={{ marginBottom: 16, border: '1px solid #ddd', borderRadius: 6, padding: 8 }}>
        <legend style={{ fontSize: 11, color: '#666' }}>관리자 — 기존 레이어를 상품으로 등록</legend>
        <p style={{ margin: '4px 0', color: '#666' }}>
          캔버스에서 재사용할 이미지 레이어(예: 기존 썸네일 안의 상품 이미지)를 먼저 선택한 뒤 등록하세요.
        </p>
        <input
          type="text"
          value={registerKey}
          onChange={(e) => setRegisterKey(e.target.value)}
          placeholder="상품 키 (예: 소고기장조림130g)"
          style={{ width: '100%', marginBottom: 6, boxSizing: 'border-box' }}
        />
        <button onClick={onRegister}>선택한 레이어로 등록</button>
      </fieldset>

      <fieldset style={{ border: '1px solid #ddd', borderRadius: 6, padding: 8 }}>
        <legend style={{ fontSize: 11, color: '#666' }}>생성</legend>
        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          disabled={products.length === 0}
          style={{ width: '100%', marginBottom: 6 }}
        >
          {products.length === 0 && <option value="">(등록된 상품 없음)</option>}
          {products.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <label style={{ display: 'block', marginBottom: 6 }}>
          수량:{' '}
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            style={{ width: 60 }}
          />
        </label>
        <button onClick={onGenerate} disabled={!selectedProduct}>
          결과 프레임 생성
        </button>
      </fieldset>

      <p style={{ marginTop: 12, color: isError ? '#c0392b' : '#333' }}>{status}</p>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<App />);
}
