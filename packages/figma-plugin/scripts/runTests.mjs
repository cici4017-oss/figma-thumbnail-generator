/**
 * packages/figma-plugin/test/*.test.ts 를 esbuild로 번들링해서 node로 실행하는 초경량 테스트 러너.
 * (packages/core/scripts/runTests.mjs와 동일한 방식.)
 *
 * 이 테스트는 회사 Figma 파일이나 데스크톱 앱 없이, mock Figma(src/mock)만으로
 * templateMapper/renderer/assetResolver(에셋 매핑 구조)를 검증한다.
 */

import { execFileSync } from 'node:child_process';
import { readdirSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDir = path.resolve(__dirname, '../test');
const buildDir = path.resolve(__dirname, '../.test-build');

const files = readdirSync(testDir).filter((f) => f.endsWith('.test.ts'));

if (files.length === 0) {
  console.log('테스트 파일이 없습니다.');
  process.exit(0);
}

rmSync(buildDir, { recursive: true, force: true });
mkdirSync(buildDir, { recursive: true });

let failed = 0;

for (const file of files) {
  const entry = path.join(testDir, file);
  const outfile = path.join(buildDir, file.replace(/\.ts$/, '.mjs'));

  try {
    // packages:'external'을 쓰지 않는다 — '@thumbnail-generator/core'는 컴파일된 JS가 아니라
    // TS 소스를 가리키는 워크스페이스 패키지라서, Node가 네이티브로 resolve할 수 없다.
    // production 빌드(build.js)와 동일하게 esbuild가 전부 번들링하게 둔다.
    esbuild.buildSync({
      entryPoints: [entry],
      outfile,
      bundle: true,
      platform: 'node',
      format: 'esm',
    });
  } catch (e) {
    console.error(`❌ ${file} (빌드 실패)\n${e.message}`);
    failed++;
    continue;
  }

  try {
    execFileSync(process.execPath, [outfile], { stdio: 'inherit' });
    console.log(`✅ ${file}`);
  } catch {
    console.error(`❌ ${file}`);
    failed++;
  }
}

rmSync(buildDir, { recursive: true, force: true });

if (failed > 0) {
  console.error(`\n${failed}/${files.length}개 테스트 실패`);
  process.exit(1);
}

console.log(`\n모든 테스트(${files.length}개) 통과`);
