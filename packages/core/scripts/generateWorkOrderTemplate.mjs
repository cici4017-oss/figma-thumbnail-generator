/**
 * generateWorkOrderTemplate.ts(TS 소스, 실제 로직)를 esbuild로 번들링해서 node로 실행하는
 * 초경량 런처. scripts/runTests.mjs와 동일한 방식 — 이 저장소는 별도 ts-node 의존성 없이
 * esbuild만으로 스크립트에서 TS 소스(워크북 빌더 + data/products.ts 등)를 그대로 쓴다.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const entry = path.resolve(__dirname, 'generateWorkOrderTemplate.ts');
const buildDir = path.resolve(__dirname, '../.script-build');
const outfile = path.join(buildDir, 'generateWorkOrderTemplate.mjs');

rmSync(buildDir, { recursive: true, force: true });
mkdirSync(buildDir, { recursive: true });

try {
  // packages: 'external' — exceljs 같은 실제 npm 의존성은 번들에 포함하지 않고 Node의 기본
  // require/resolve에 맡긴다(로컬 상대경로 TS 소스만 번들링). exceljs를 통째로 번들링하면
  // 내부에서 쓰는 Node 내장 모듈(crypto 등) require가 esbuild의 ESM 출력과 충돌한다.
  esbuild.buildSync({
    entryPoints: [entry],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
  });
  execFileSync(process.execPath, [outfile], { stdio: 'inherit' });
} finally {
  rmSync(buildDir, { recursive: true, force: true });
}
