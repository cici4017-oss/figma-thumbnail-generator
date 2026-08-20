const esbuild = require('esbuild');
const fs = require('fs');

async function build() {
  fs.mkdirSync('dist', { recursive: true });

  await esbuild.build({
    entryPoints: ['src/code.ts'],
    outfile: 'dist/code.js',
    bundle: true,
    target: 'es2017',
    platform: 'browser',
  });

  const uiResult = await esbuild.build({
    entryPoints: ['src/ui/main.tsx'],
    bundle: true,
    write: false,
    target: 'es2017',
    platform: 'browser',
    jsx: 'automatic',
  });

  const js = uiResult.outputFiles[0].text;
  const html = `<!DOCTYPE html><html><body><div id="root"></div><script>${js}</script></body></html>`;
  fs.writeFileSync('dist/ui.html', html);

  console.log('build complete: dist/code.js, dist/ui.html');
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});
