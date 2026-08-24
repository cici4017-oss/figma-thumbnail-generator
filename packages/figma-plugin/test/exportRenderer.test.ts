import assert from 'node:assert/strict';
import { installMockFigma, uninstallMockFigma, MockNode } from '../src/mock/mockFigma';
import { exportNodesAsJpg } from '../src/exportRenderer';

/**
 * exportRenderer.ts는 code.ts(main thread)에서만 호출되는 실제 figma.exportAsync 래퍼다.
 * 실제 이미지 인코딩은 mock으로 검증할 수 없지만(실제 Figma에서만 가능 — 실사용 검증은
 * "썸네일 (Copy)"에서 별도로 확인함), 여기서는 계약(어떤 노드를 어떤 포맷/이름으로 export
 * 요청했는지, 실패가 개별적으로 격리되는지)을 검증한다.
 */

function makeFrame(name: string, width: number, height: number): MockNode {
  const frame = new MockNode('FRAME', name);
  frame.width = width;
  frame.height = height;
  return frame;
}

async function testExportsRequestedNodesAsJpg() {
  const handle = installMockFigma();
  try {
    const a = makeFrame('WO-0001__naver-1000x1000__LAYOUT_02__VERIFIED', 1000, 1000);
    const b = makeFrame('WO-0002__kakao-750x422__LAYOUT_06__VERIFIED', 750, 422);
    handle.currentPage.appendChild(a);
    handle.currentPage.appendChild(b);

    const result = await exportNodesAsJpg([
      { nodeId: a.id, fileName: 'WO-0001_네이버_1000x1000.jpg' },
      { nodeId: b.id, fileName: 'WO-0002_카카오_750x422.jpg' },
    ]);

    assert.equal(result.files.length, 2, 'export 성공 파일 수 = 요청한 노드 수');
    assert.equal(result.failures.length, 0);

    const fileA = result.files.find((f) => f.fileName === 'WO-0001_네이버_1000x1000.jpg')!;
    assert.ok(fileA);
    assert.equal(fileA.width, 1000);
    assert.equal(fileA.height, 1000, 'square 규격 유지');
    assert.ok(fileA.bytes.length > 0);
    assert.ok(
      new TextDecoder().decode(fileA.bytes).startsWith('JPG:'),
      'exportAsync 호출 시 format이 JPG로 전달되어야 함(PNG를 기본값으로 쓰지 않음)',
    );

    const fileB = result.files.find((f) => f.fileName === 'WO-0002_카카오_750x422.jpg')!;
    assert.equal(fileB.width, 750);
    assert.equal(fileB.height, 422, 'wide 규격 유지');

    console.log('  ✓ 요청한 노드 전부 JPG로 export되고, 각 파일의 width/height가 원본 규격과 일치함');
  } finally {
    uninstallMockFigma();
  }
}

async function testMissingNodeFailsIndividuallyWithoutBlockingOthers() {
  const handle = installMockFigma();
  try {
    const ok = makeFrame('WO-0003__naver-1000x1000__LAYOUT_01__VERIFIED', 1000, 1000);
    handle.currentPage.appendChild(ok);

    const result = await exportNodesAsJpg([
      { nodeId: 'mock:not-a-real-id', fileName: 'missing.jpg' },
      { nodeId: ok.id, fileName: 'WO-0003_네이버_1000x1000.jpg' },
    ]);

    assert.equal(result.files.length, 1, '존재하는 노드는 정상적으로 export되어야 함');
    assert.equal(result.failures.length, 1);
    assert.equal(result.failures[0].fileName, 'missing.jpg');

    console.log('  ✓ 존재하지 않는 노드 하나가 실패해도 나머지 export는 계속 진행됨(부분 실패 허용)');
  } finally {
    uninstallMockFigma();
  }
}

async function main() {
  await testExportsRequestedNodesAsJpg();
  await testMissingNodeFailsIndividuallyWithoutBlockingOthers();
  console.log('exportRenderer.test.ts: 모든 검증 통과');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
