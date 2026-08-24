import assert from 'node:assert/strict';
import { buildExportFileName, dedupeFileNames, buildZipFileName, buildExportItems, selectExportableOutputs } from '../src/exportNaming';
import type { BatchRenderResult, BatchRenderOutputResult } from '../src/batchRenderer';

function output(partial: Partial<BatchRenderOutputResult> & Pick<BatchRenderOutputResult, 'outcome'>): BatchRenderOutputResult {
  return {
    workOrderId: 'WO-000',
    channelLabel: '네이버',
    channelPresetId: 'naver-1000x1000',
    frameWidth: 1000,
    frameHeight: 1000,
    layoutKey: 'LAYOUT_02',
    source: 'verified',
    ...partial,
  };
}

function main() {
  // 1) 파일명은 업무 정보(workOrderId + 채널라벨 + 실제 규격) 우선, layoutKey는 쓰지 않는다.
  {
    const name = buildExportFileName('WO-0001', '네이버', 1000, 1000);
    assert.equal(name, 'WO-0001_네이버_1000x1000.jpg');
  }
  {
    const name = buildExportFileName('WO-0002', '카카오', 750, 422);
    assert.equal(name, 'WO-0002_카카오_750x422.jpg');
  }
  console.log('  ✓ 파일명: {workOrderId}_{채널라벨}_{width}x{height}.jpg');

  // 2) 충돌 없는 이름은 그대로 유지된다.
  {
    const names = ['A_네이버_1000x1000.jpg', 'B_카카오_1000x1000.jpg'];
    assert.deepEqual(dedupeFileNames(names), names);
  }

  // 3) 동일 이름이 여러 번 나오면 두 번째부터 _2, _3 ... 접미사가 붙고, 개수/순서는 유지된다.
  {
    const names = ['X_네이버_1000x1000.jpg', 'X_네이버_1000x1000.jpg', 'X_네이버_1000x1000.jpg', 'Y_카카오_750x422.jpg'];
    const result = dedupeFileNames(names);
    assert.equal(result.length, 4, '파일 개수는 그대로 유지되어야 함(누락/병합 없음)');
    assert.deepEqual(result, [
      'X_네이버_1000x1000.jpg',
      'X_네이버_1000x1000_2.jpg',
      'X_네이버_1000x1000_3.jpg',
      'Y_카카오_750x422.jpg',
    ]);
    assert.equal(new Set(result).size, 4, '충돌 해소 후에는 전부 고유해야 함');
  }
  console.log('  ✓ 파일명 충돌: 뒤에 등장하는 것부터 _2, _3 ... 접미사, 개수/순서 유지, 전부 고유해짐');

  // 4) ZIP 파일명은 thumbnail_batch_YYYYMMDD.zip
  {
    const zipName = buildZipFileName(new Date(2026, 7, 24)); // month는 0-indexed(7=8월)
    assert.equal(zipName, 'thumbnail_batch_20260824.zip');
  }
  console.log('  ✓ ZIP 파일명: thumbnail_batch_YYYYMMDD.zip');

  // 5) export 대상은 outcome==='generated'이고 nodeId가 있는 output만 — skipped/failed는 제외.
  {
    const result: BatchRenderResult = {
      summary: {
        totalWorkOrders: 4,
        totalOutputs: 4,
        generatedCount: 2,
        skippedReviewRequiredCount: 1,
        skippedNotRenderableCount: 0,
        skippedErrorCount: 1,
        failedCount: 0,
      },
      outputs: [
        output({ workOrderId: 'WO-0001', channelLabel: '네이버', frameWidth: 1000, frameHeight: 1000, outcome: 'generated', nodeId: 'n1' }),
        output({ workOrderId: 'WO-0002', channelLabel: '카카오', frameWidth: 750, frameHeight: 422, outcome: 'generated', nodeId: 'n2' }),
        output({ workOrderId: 'WO-0003', outcome: 'skippedReviewRequired' }),
        output({ workOrderId: 'WO-0004', outcome: 'skippedError' }),
      ],
    };

    const exportable = selectExportableOutputs(result);
    assert.equal(exportable.length, 2, 'skipped/error output은 export 대상에서 제외되어야 함');
    assert.deepEqual(exportable.map((o) => o.workOrderId), ['WO-0001', 'WO-0002']);

    const items = buildExportItems(result);
    assert.equal(items.length, 2);
    assert.deepEqual(items, [
      { nodeId: 'n1', fileName: 'WO-0001_네이버_1000x1000.jpg' },
      { nodeId: 'n2', fileName: 'WO-0002_카카오_750x422.jpg' },
    ]);
  }
  console.log('  ✓ selectExportableOutputs/buildExportItems: 실제 생성된 output만, 원본 template은 애초에 대상이 아님');

  // 6) 같은 workOrderId/채널/규격 조합이 반복되면(이론상 방어적으로) 충돌 없이 파일명이 갈린다.
  {
    const result: BatchRenderResult = {
      summary: {
        totalWorkOrders: 2,
        totalOutputs: 2,
        generatedCount: 2,
        skippedReviewRequiredCount: 0,
        skippedNotRenderableCount: 0,
        skippedErrorCount: 0,
        failedCount: 0,
      },
      outputs: [
        output({ workOrderId: 'WO-DUP', outcome: 'generated', nodeId: 'n1' }),
        output({ workOrderId: 'WO-DUP', outcome: 'generated', nodeId: 'n2' }),
      ],
    };
    const items = buildExportItems(result);
    const names = items.map((i) => i.fileName);
    assert.equal(new Set(names).size, 2, '파일명이 중복되면 안 됨');
    assert.deepEqual(names, ['WO-DUP_네이버_1000x1000.jpg', 'WO-DUP_네이버_1000x1000_2.jpg']);
  }
  console.log('  ✓ buildExportItems: 파일명 충돌은 항상 해소되어 중복 없음');

  console.log('exportNaming.test.ts: 모든 검증 통과');
}

main();
