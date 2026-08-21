/**
 * packages/core/test/*.test.ts 를 각각 esbuild로 번들링해서 node로 실행하는 초경량 테스트 러너.
 * 별도 테스트 프레임워크(jest/vitest) 없이, node:assert만으로 작성된 테스트를 돌린다.
 *
 * 왜 필요한가: 이 프로젝트는 회사 Figma 파일/데스크톱 앱 없이도 Excel parser, batch validation,
 * layout selection 같은 순수 로직을 로컬(집/외부 개발 환경)에서 반복 검증할 수 있어야 한다.
 * 이 러너는 그 자동 검증을 실행하는 진입점이다.
 */

import { execFileSync } from 'node:child_process';
import { readdirSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDir = path.resolve(__dirname, '../test');
// node_modules 해석이 되도록 패키지 안(임시, gitignore 대상)에 빌드 산출물을 둔다.
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
    esbuild.buildSync({
      entryPoints: [entry],
      outfile,
      bundle: true,
      platform: 'node',
      format: 'esm',
      packages: 'external',
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
