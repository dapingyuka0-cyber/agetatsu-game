import fs from 'node:fs/promises';
import {build} from 'esbuild';

await import('./build.mjs');
await build({entryPoints:['worker/index.js'],bundle:true,minify:true,format:'esm',platform:'browser',target:'es2022',outfile:'dist/_worker.js',legalComments:'eof'});
await fs.writeFile('dist/_routes.json',JSON.stringify({version:1,include:['/api/results','/r/*'],exclude:[]}));
console.log('Cloudflare Pages output: dist/ (static game + result sharing Worker).');
