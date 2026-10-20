import {RECIPES} from '../src/simulation.js';

const MAX_BODY=10*1024*1024,MAX_PNG=4800000;
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=(id,type)=>`results/v1/${id}/${type}.png`;
const link=(origin,id)=>`${origin}/r/${id}/`;
function validate(data){
 if(!data||!Object.hasOwn(RECIPES,data.recipe)||!Number.isInteger(data.score)||data.score<0||data.score>100)throw new Error('invalid result');
 const rank=data.score>=90?'S':data.score>=80?'A':data.score>=65?'B':data.score>=40?'C':'D';
 if(data.rank!==rank||data.exploded&&data.score!==0)throw new Error('invalid rank');
 const result={recipe:data.recipe,name:RECIPES[data.recipe].name,score:data.score,rank,exploded:!!data.exploded,bestUpdated:!!data.bestUpdated};
 for(const field of ['comment','good','tip']){if(typeof data[field]!=='string'||(field!=='good'&&!data[field].trim())||data[field].length>100)throw new Error('invalid text');result[field]=data[field].trim();}
 return result;
}
async function boundedBody(request){
 if(Number(request.headers.get('content-length'))>MAX_BODY)throw new Error('too large');
 const reader=request.body?.getReader();if(!reader)throw new Error('empty body');let size=0;const chunks=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_BODY){await reader.cancel();throw new Error('too large');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}return bytes;
}
async function png(file,w,h){
 if(!file||file.type!=='image/png'||file.size>MAX_PNG||file.size<45)throw new Error('invalid image');
 const bytes=new Uint8Array(await file.arrayBuffer()),view=new DataView(bytes.buffer);
 if([137,80,78,71,13,10,26,10].some((b,i)=>bytes[i]!==b)||view.getUint32(8)!==13||view.getUint32(12)!==0x49484452||view.getUint32(16)!==w||view.getUint32(20)!==h)throw new Error('invalid PNG');
 // Only a complete PNG is accepted. No SVG, HTML or trailing payload is served.
 let p=8,hasData=false,ended=false;while(p+12<=bytes.length){const length=view.getUint32(p),type=view.getUint32(p+4);if(length>bytes.length-p-12)throw new Error('invalid chunk');if(type===0x49444154)hasData=true;p+=length+12;if(type===0x49454e44){ended=length===0&&p===bytes.length;break;}}
 if(!ended||!hasData)throw new Error('incomplete PNG');return bytes;
}
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
export async function resultRoutes(request,env){
 const url=new URL(request.url),path=url.pathname,ORIGIN=url.origin;
 if(path==='/api/results'){
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  if(request.headers.get('origin')!==ORIGIN)return json({error:'Invalid origin'},403);
  if(!env.BUCKET)return json({error:'画像保存を利用できません。画像を保存して共有できます。'},503);
  try{
   const type=request.headers.get('content-type')||'';if(!type.startsWith('multipart/form-data;'))return json({error:'Invalid content type'},415);
   const body=await boundedBody(request),form=await new Response(body,{headers:{'Content-Type':type}}).formData();
   const text=form.get('result');if(typeof text!=='string'||text.length>2000)throw new Error('invalid metadata');
   const data=validate(JSON.parse(text)),portrait=await png(form.get('portrait'),1080,1350),landscape=await png(form.get('landscape'),1200,630);
   const hashes=await Promise.all([portrait,landscape].map(p=>crypto.subtle.digest('SHA-256',p)));
   const id=hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(data)+hashes.map(hex).join(''))));
   const existing=await env.BUCKET.head(key(id,'portrait'));
   if(!existing){
    const options={httpMetadata:{contentType:'image/png',cacheControl:'public, max-age=31536000, immutable'}};
    await env.BUCKET.put(key(id,'landscape'),landscape,options);
    // Publish metadata last: a result page never points at an unfinished image pair.
    await env.BUCKET.put(key(id,'portrait'),portrait,{...options,customMetadata:{result:JSON.stringify(data)}});
   }
   return json({url:link(ORIGIN,id),image:link(ORIGIN,id)+'image.png',download:link(ORIGIN,id)+'download.png'});
  }catch(error){return json({error:/invalid|incomplete|empty|too large/i.test(error.message)?'画像または結果データを確認できませんでした。':'共有URLを保存できませんでした。時間をおいてもう一度お試しください。'},/invalid|incomplete|empty|too large/i.test(error.message)?400:503);}
 }
 const match=path.match(/^\/r\/([a-f0-9]{64})(?:\/(image\.png|download\.png)?)?$/);
 if(!match)return null;
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, HEAD'}});
 if(!env.BUCKET)return new Response('共有画像を利用できません。',{status:503});
 const [,id,file]=match;
 try{
  const object=await env.BUCKET[file&&request.method!=='HEAD'?'get':'head'](key(id,file==='image.png'?'landscape':'portrait'));
  if(!object)return new Response('この結果は見つかりませんでした。',{status:404,headers:{'Cache-Control':'no-store'}});
  if(file){const headers=new Headers({'Content-Type':'image/png','X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=31536000, immutable','Content-Length':String(object.size),'ETag':object.httpEtag});if(file==='download.png')headers.set('Content-Disposition','inline; filename="agemaster-result.png"');if(request.headers.get('if-none-match')===object.httpEtag)return new Response(null,{status:304,headers});return new Response(request.method==='HEAD'?null:object.body,{headers});}
  const data=JSON.parse(object.customMetadata.result),title=`${data.name}で${data.score}点！ | 揚げ物の達人`,description=`${data.comment}${data.good?' よかったところ：'+data.good:''} 次のコツ：${data.tip}${data.bestUpdated?' 自己ベスト更新！':''}`,page=link(ORIGIN,id),image=page+'image.png';
  const html=`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title><link rel="canonical" href="${page}"><meta name="description" content="${escape(description)}"><meta name="robots" content="noindex, follow"><meta property="og:type" content="website"><meta property="og:site_name" content="揚げ物の達人"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${page}"><meta property="og:image" content="${image}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:type" content="image/png"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}"><meta name="twitter:image" content="${image}"><meta name="twitter:image:alt" content="${escape(title+' '+description)}"><style>*{box-sizing:border-box}body{margin:0;background:#fff0d9;color:#4b210b;font-family:system-ui,sans-serif;text-align:center}main{max-width:600px;margin:auto;padding:18px 16px 30px}h1{font-size:24px;margin:6px}p{font-size:14px;line-height:1.7}img{display:block;width:100%;height:auto;border-radius:18px;box-shadow:0 8px 24px #62340920}a{display:block;margin:16px 0 8px;background:#ef861d;border:2px solid #dc7311;border-radius:16px;padding:16px;color:#fff;text-decoration:none;font-weight:800;font-size:20px}small{color:#88653f}</style></head><body><main><h1>揚げ物の達人</h1><p>${escape(data.name)}で${data.score}点！ ${escape(data.comment)}</p><img src="${page}download.png" width="1080" height="1350" alt="${escape(title+' '+description)}"><a href="${ORIGIN}/">あなたも揚げてみよう</a><small>#揚げ達 #ブラウザゲーム</small></main></body></html>`;
  return new Response(request.method==='HEAD'?null:html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"}});
 }catch{return new Response('共有画像を読み込めませんでした。時間をおいてお試しください。',{status:503,headers:{'Cache-Control':'no-store'}});}
}
