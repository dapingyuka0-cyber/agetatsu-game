import {RECIPES} from './simulation.js';
import {resultShare,intentURL} from './share-result.js';
import {drawShareCard,drawLinkCard,canvasPNG} from './share-card.js';
import {shareFonts} from './share-font.js';

export function canShareImage(nav,file){try{return !!file&&typeof nav?.share==='function'&&typeof nav?.canShare==='function'&&nav.canShare({files:[file]});}catch{return false;}}
export class ResultImageShare{
 constructor(env=globalThis){this.env=env;this.record=null;this.dialog=null;this.busy=false;this.blockedUntil=0;}
 bind(root,s,g,{key,capture,ready=Promise.resolve()}={}){
  const rank=root.querySelector('.rank-medal b')?.textContent?.trim()||'',comment=root.querySelector('.result-comment')?.textContent?.trim()||'';
  const signature=key||JSON.stringify([s.id,g.score,rank,comment,s.exploded,s.heat,s.toppings,s.craft?.revision]);
  if(this.record?.key!==signature){this.dispose();const share=resultShare(s,g,rank,comment);
   this.record={key:signature,share,data:Object.freeze({recipe:s.id,zeroReason:g.zeroReason,good:g.zeroReason?'':root.querySelectorAll('.result-feedback p')[0]?.textContent?.split('・')[0]||'最後まで揚げきった！',tip:g.zeroReason?root.querySelector('.result-feedback p')?.textContent||'':root.querySelectorAll('.result-feedback p')[1]?.textContent?.split('・')[0]||'この揚げ加減を覚えよう',bestUpdated:!!(s.record?.saved&&s.record.updated),name:RECIPES[s.id].name,score:g.score,rank,comment,exploded:!!s.exploded,url:share.url,scoreLabel:s.individual&&RECIPES[s.id].quantity>1?`${s.pieceIndex+1}個目のスコア`:'今回のスコア'}),filename:`agemaster-${s.id}-${g.score}.png`,capture,ready};
  }
  const button=root.querySelector('#shareImage');if(button)button.onclick=()=>this.open();
  for(const id of ['#shareX','#shareOther']){const b=root.querySelector(id);if(b)b.onclick=()=>this.open();}
 }
 async prepare(record){
  if(record.asset)return record.asset;if(record.pending)return record.pending;
  record.pending=(async()=>{
   await Promise.all([record.ready,shareFonts()]);
   await new Promise(resolve=>this.env.requestAnimationFrame(resolve));
   if(this.record!==record)throw new Error('この結果は終了しました。');
   const hero=record.capture();if(!hero?.width||!hero?.height)throw new Error('料理の画像を取得できませんでした。');
   const canvas=this.env.document.createElement('canvas');
   let blob,linkBlob;try{drawShareCard(canvas,record.data,hero);blob=await canvasPNG(canvas);drawLinkCard(canvas,record.data,hero);linkBlob=await canvasPNG(canvas);}finally{canvas.width=canvas.height=0;if(!record.data.exploded)hero.width=hero.height=0;}
   if(this.record!==record)throw new Error('この結果は終了しました。');
   const file=new this.env.File([blob],record.filename,{type:'image/png'}),url=this.env.URL.createObjectURL(blob);
   return record.asset={blob,file,url,linkBlob};
  })().catch(error=>{record.pending=null;throw error;});return record.pending;
 }
 async publish(record){
  if(record.published)return record.published;if(record.upload)return record.upload;
  record.upload=(async()=>{const asset=await this.prepare(record),form=new this.env.FormData();
   form.set('result',JSON.stringify(record.data));form.set('portrait',asset.blob,record.filename);form.set('landscape',asset.linkBlob,'link.png');
   record.abort=new this.env.AbortController();const timer=this.env.setTimeout(()=>record.abort.abort(),30000);
   try{const response=await this.env.fetch('/api/results',{method:'POST',body:form,signal:record.abort.signal});const data=await response.json();
    if(!response.ok)throw new Error(data.error||'共有URLを保存できませんでした。');
    const url=new URL(data.url),base=new URL(record.share.url);if(url.origin!==base.origin||!/^\/r\/[a-f0-9]{64}\/$/.test(url.pathname))throw new Error('共有URLを確認できませんでした。');
    if(this.record!==record)throw new Error('この結果は終了しました。');record.published=url.href;return record.published;
   }finally{this.env.clearTimeout(timer);}
  })().catch(error=>{record.upload=null;throw error;});return record.upload;
 }
 async open(){
  if(this.busy||!this.record)return;const record=this.record,doc=this.env.document;
  if(this.dialog?.open)return;
  const dialog=doc.createElement('dialog');dialog.className='share-image-dialog';dialog.setAttribute('aria-labelledby','shareImageTitle');
  dialog.innerHTML=`<div class="share-image-head"><div><h2 id="shareImageTitle">この一皿を、みんなに。</h2><p>料理とスコアを１枚の画像に</p></div><button class="share-image-close secondary" aria-label="リザルトに戻る">×</button></div><div class="share-image-art"><p class="share-image-loading" role="status">共有画像を仕上げています…</p><img class="share-image-preview" alt="今回の料理と採点結果の共有画像" hidden></div><div class="share-image-controls"><div class="share-image-primary"><button class="primary" data-image-share disabled>画像付きで共有</button><button class="secondary" data-image-save disabled>画像を保存</button></div><div class="share-image-secondary"><button class="secondary" data-image-copy>投稿文をコピー</button><button class="secondary" data-image-x>結果URLをXで共有</button></div><p class="share-image-status" role="status">画像を準備しています。</p><textarea class="share-image-text" aria-label="手動コピーする投稿文" readonly hidden></textarea><p class="share-image-note">結果専用URLには今回の画像が設定されます。Xのカード表示はX側の取得状況によって遅れる場合があります。画像ファイルの共有・保存もできます。</p></div>`;
  this.dialog=dialog;doc.body.append(dialog);const close=()=>dialog.close();dialog.querySelector('.share-image-close').onclick=close;
  dialog.addEventListener('close',()=>{dialog.remove();if(this.dialog===dialog)this.dialog=null;doc.querySelector('#shareImage')?.focus();},{once:true});dialog.showModal();
  record.linkPreparing=true;
  const q=s=>dialog.querySelector(s),status=message=>{q('.share-image-status').textContent=message;};
  const share=()=>({...record.share,url:record.published||record.share.url}),post=()=>share().text+'\n'+share().url;
  const manual=()=>{const field=q('textarea');field.hidden=false;field.value=post();field.focus();field.select();field.setSelectionRange?.(0,post().length);status('文章を長押ししてコピーしてください。');};
  const readyUI=()=>{const asset=record.asset;q('[data-image-share]').disabled=this.busy||record.linkPreparing||!asset||!canShareImage(this.env.navigator,asset.file);q('[data-image-save]').disabled=this.busy||!asset;for(const b of dialog.querySelectorAll('[data-image-x],[data-image-copy]'))b.disabled=this.busy||(b.hasAttribute('data-image-copy')&&record.linkPreparing);};
  const run=async fn=>{if(this.busy||Date.now()<this.blockedUntil)return;this.busy=true;readyUI();try{await fn();}finally{this.busy=false;this.blockedUntil=Date.now()+600;if(this.dialog===dialog)readyUI();}};
  q('[data-image-copy]').onclick=()=>run(async()=>{try{if(!this.env.navigator?.clipboard?.writeText){manual();return;}await this.env.navigator.clipboard.writeText(post());status('投稿文をコピーしました。');}catch{manual();}});
  q('[data-image-x]').onclick=()=>run(async()=>{const popup=this.env.window.open('about:blank','agemaster-share','popup,width=600,height=650');if(!popup){status('投稿画面を開けませんでした。ブラウザのポップアップ設定をご確認ください。');return;}popup.opener=null;try{status('結果専用URLを準備しています…');await this.publish(record);if(this.record!==record){popup.close();return;}popup.location.href=intentURL(share());status('今回の料理と得点のリンクをXの投稿画面に渡しました。');}catch(error){popup.close();status(error.message||'共有URLを準備できませんでした。画像保存は利用できます。');}});
  q('[data-image-save]').onclick=()=>run(()=>{if(!record.asset)return;const a=doc.createElement('a');a.href=record.asset.url;a.download=record.filename;a.target='_blank';a.rel='noopener';doc.body.append(a);a.click();a.remove();status('保存操作を開始しました。保存先は端末・ブラウザで確認できます。');});
  q('[data-image-share]').onclick=()=>run(async()=>{
   if(!canShareImage(this.env.navigator,record.asset?.file)){status('画像共有は非対応です。画像を保存し、投稿文をコピーしてXを開いてください。');return;}
   try{
    // The File is already prepared: share() runs synchronously inside this tap.
    await this.env.navigator.share({files:[record.asset.file],title:record.share.title,text:post()});
    status('共有画面を閉じました。文章が付かない場合は「投稿文をコピー」を使えます。');
   }catch(error){if(error?.name==='AbortError'){status('共有をキャンセルしました。画像はそのまま使えます。');return;}status('画像を渡せませんでした。画像保存と投稿文コピーから共有できます。');}
  });
  try{const asset=await this.prepare(record);if(this.dialog!==dialog)return;const preview=q('img');preview.src=asset.url;await preview.decode?.();if(this.dialog!==dialog)return;preview.hidden=false;q('.share-image-loading').hidden=true;readyUI();status('画像を用意しました。結果専用URLを保存しています…');try{await this.publish(record);if(this.dialog===dialog)status('結果URLを用意しました。Xでは今回の画像付きリンクとして共有できます。');}catch(error){if(this.dialog===dialog)status('結果URLを保存できませんでした。画像共有・画像保存は使えます。Xボタンで再試行できます。');}finally{record.linkPreparing=false;if(this.dialog===dialog)readyUI();}}
  catch(error){if(this.dialog!==dialog)return;q('.share-image-loading').textContent='画像を作成できませんでした。';record.linkPreparing=false;readyUI();status(error.message||'一度閉じて、もう一度お試しください。');}
 }
 dispose(){const record=this.record;this.record=null;record?.abort?.abort();const dialog=this.dialog;this.dialog=null;if(dialog){dialog.close();dialog.remove();}if(record?.asset)this.env.URL.revokeObjectURL(record.asset.url);}
}
