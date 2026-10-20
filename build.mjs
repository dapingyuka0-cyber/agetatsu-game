import {build} from 'esbuild';import fs from 'node:fs/promises';
await fs.mkdir('dist',{recursive:true});
await build({entryPoints:['src/main.js'],bundle:true,minify:true,loader:{'.png':'dataurl','.woff':'dataurl'},format:'iife',target:['safari15','chrome100','firefox100'],outfile:'dist/game.js',legalComments:'eof'});
for(const f of ['index.html','style.css'])await fs.copyFile(f,`dist/${f}`);
await fs.copyFile('node_modules/three/LICENSE','dist/THREE-LICENSE.txt');
await fs.copyFile('src/assets/SHARE-FONT-LICENSE.txt','dist/SHARE-FONT-LICENSE.txt');
const html=await fs.readFile('index.html','utf8'),css=await fs.readFile('style.css','utf8'),js=await fs.readFile('dist/game.js','utf8');
await fs.writeFile('AgeBiyori-Play.html',html.replace('<link rel="stylesheet" href="./style.css">',()=>`<style>${css}</style>`).replace('<script src="./game.js" defer></script>',()=>`<script>${js.replaceAll('</script','<\\/script')}</script>`));
console.log('Built game HTML and dist/. Result-link publishing requires the accompanying Worker.');
