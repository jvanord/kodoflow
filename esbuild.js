const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

const config = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'out/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  sourcemap: !production,
  minify: production,
};

if (watch) {
  esbuild.context(config).then(ctx => ctx.watch()).catch(() => process.exit(1));
} else {
  esbuild.build(config).catch(() => process.exit(1));
}
