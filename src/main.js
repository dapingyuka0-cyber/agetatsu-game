import {ResultImageShare} from './share-image.js';
import {cookedCounter} from './cooked-count.js';
import {bindResultShare} from './share-result.js';
import {churroTemplate,applyChurroTemplate} from './churro-flow.js';
import {makeBlastScreen} from './blast-screen.js';
import {prepGesture} from './prep-gesture.js';
import {saveBest} from './bests.js';
import {Comedy} from './comedy.js';
import {cookingLook} from './cooking-look.js';
import {isCraft,craftHint,craftGesture} from './craft.js';
import {kitchen} from './kitchen.js';
import {loadFoodMaps} from './food-assets.js';
import {foodTextureURLs} from './food-texture-urls.js';
import {createBatch,choosePiece,advanceBatch,actBatch} from './batch.js';
import {resultCard} from './results.js';
import {icon} from './icons.js';
import {KitchenAudio} from './audio.js';
import {RECIPES,fresh,advance,action,grade,awardGrade,clamp} from './simulation.js';
const $=s=>document.querySelector(s),panel=$('#panel'),audio=new KitchenAudio();
let s=fresh(),mode='menu',elapsed=0,previous=performance.now(),uiTick=0,thickness=1,thumbs={},world;
const blastScreen=makeBlastScreen($('#scene'));
const resultImageShare=new ResultImageShare();
const comedy=new Comedy();let noticePaused=false,explodedDish=null;
let cookedTotal=null;
const counter=cookedCounter(count=>{cookedTotal=count;const label=$('.community-count');if(label)label.textContent=count===null?'累計品数を読み込めませんでした':`累計 ${count.toLocaleString('ja-JP')}品が揚がりました！`;},(count,dish)=>{
 dish.completionCount=count;
 const pop=$('#countPop');pop.hidden=false;pop.classList.remove('count-pop-active');void pop.offsetWidth;pop.classList.add('count-pop-active');
 clearTimeout(pop.timer);pop.timer=setTimeout(()=>{pop.hidden=true;pop.classList.remove('count-pop-active');},1800);
 const result=$('#resultCount');if(result&&s===dish)result.textContent=`+1  累計 ${count.toLocaleString('ja-JP')}品が揚がりました！`;
});
let batch=createBatch('shrimp');batch.pieces[0]=s;
const settings={volume:.65,muted:false,quality:'high'};
try{Object.assign(settings,JSON.parse(localStorage.getItem('agemaster-settings')||'{}'));}catch{}
function viewport(){document.documentElement.style.setProperty('--vh',`${Math.round(window.visualViewport?.height||window.innerHeight)}px`);}
viewport();window.addEventListener('resize',viewport);window.visualViewport?.addEventListener('resize',viewport);
try{world=kitchen($('#scene'));thumbs=world.thumbnails();world.setPickHandler?.(selectPiece);world.quality(settings.quality);}catch(e){$('#error').hidden=false;$('#error').textContent='3D画面を開始できませんでした。Safari / Chromeで開き直してください。原因：'+e.message;console.error(e);}
world?.setCraftHandler?.((type,p)=>{
 if(mode!=='cook'||explodedDish||['blast','grow'].includes(comedy.active?.type)||$('#modal').open)return false;if(s.prepWork){const handled=prepGesture(s,type,p);if(handled){if(type==='down')enableAudio().catch(()=>{});updateUI();}return handled;}if(!isCraft(s.id))return false;
 const handled=craftGesture(s,type,p);
 if(handled){if(type==='down')enableAudio().catch(()=>{});if(s.id==='churros')audio.piping(s.craft.drawing&&!s.paused);
  if((type==='up'||type==='cancel')&&s.id==='churros'&&s.craft.ready){render();}else updateUI();
 }return handled;
});
function audioIndicator(){ $('#sound').innerHTML=icon(settings.muted?'mute':'sound');$('#sound').setAttribute('aria-label',settings.muted?'効果音をオン':'効果音をミュート');$('#sound').setAttribute('aria-pressed',String(!settings.muted));}
audio.onState=t=>{if($('#audioStatus'))$('#audioStatus').textContent=t;audioIndicator();};audio.set(settings.volume,settings.muted);
$('#settings').innerHTML=icon('gear');$('#timerIcon').innerHTML=icon('timer');$('#tempIcon').innerHTML=icon('thermometer');
const foodMapsReady=loadFoodMaps(foodTextureURLs);
foodMapsReady.then(()=>{if(world){thumbs=world.thumbnails();if(mode==='select')render();updateUI();}}).catch(()=>toast('食材の質感を読み込めませんでした。ページを開き直してください。'));
function save(){try{localStorage.setItem('agemaster-settings',JSON.stringify(settings));}catch{}}
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),2600);}
function enableAudio(effect){const p=audio.start();p.then(()=>{if(effect)audio.effect(effect);}).catch(()=>toast('音声を開始できませんでした。「音」から再開・テストできます。'));return p;}
function temperature(){return `<div class="temperature"><div class="slider-column"><label for="temperature">${icon('thermometer')}油の設定温度</label><input id="temperature" class="range" type="range" min="140" max="200" step="5" value="${s.target}" aria-label="油温140度から200度"><div class="range-labels"><span>140</span><span>160</span><span>170</span><span>180</span><span>200</span></div></div><output><span id="target">${s.target}</span><small>℃</small></output></div>`;}
function controls(){if(s.id==='churros'&&(s.stage==='prep'||s.craft.drawing))return temperature();return `${s.stage==='fry'?`<div class="tool-actions">${[['move','トングで動かす'],['baste','油をかける'],['check',s.checking?'油に戻す':'持ち上げて確認'],['stir','かき混ぜる']].map(([a,label])=>`<button class="mini" data-act="${a}">${label}</button>`).join('')}</div>`:''}<div class="gauge-wrap"><div class="gauge" role="meter" aria-label="揚げ色" aria-valuemin="0" aria-valuemax="100" id="fryGauge"><span id="gaugePointer" class="gauge-pointer">▼</span></div><div class="gauge-labels"><span>生の衣</span><b>きつね色</b><span>焦げ</span></div></div><div class="actions">${[['drop','投入',s.stage==='prep'&&s.prep===RECIPES[s.id].steps.length&&!s.prepBusy],['flip','ひっくり返す',s.stage==='fry'&&!s.paused],['lift','取り出す',s.stage==='fry']].map(([a,label,enabled])=>`<button class="action-button ${enabled?'hot':''}" data-act="${a}" ${enabled?'':'disabled'}>${icon(a)}<span>${label}</span></button>`).join('')}</div>${temperature()}`;}
function prepInstructions(){
 const steps=RECIPES[s.id].steps;
 if(s.prepWork)return {text:`② 画面中央の食材を指で押したまま、手前・奥・左右になぞる（${Math.round(s.prepWork.progress*100)}%）`,hint:'食材を押したまま、手前・奥・左右になぞろう！',progress:Math.round(s.prepWork.progress*100)};
 if(s.prepBusy)return {text:'パン粉が全体に付いています。少し待とう。',hint:'パン粉を付けています…'};
 if(s.prep>=steps.length)return {text:'衣づけ完了！ 下の「投入」を押して油へ。',hint:'衣づけ完了！「投入」を押そう。'};
 const step=steps[s.prep],next=steps[s.prep-1];
 return {text:`① 下の「${s.prep+1} ${step}」ボタンを1回押す${next?`（${next}は完了！）`:''}`,hint:`下の「${s.prep+1} ${step}」を押そう。`};
}
function render(){
 document.body.dataset.mode=mode;document.body.dataset.stage=s.stage;document.body.dataset.food=s.id;document.body.dataset.churroWorkbench=String(mode==='cook'&&s.id==='churros'&&(s.stage==='prep'||s.craft.drawing));
 if(mode==='menu'){
  panel.innerHTML=`<div class="title-card"><h1 class="title-logo">揚げ物の達人</h1><p class="catch">〜目指せ、揚げ物マスター！〜</p><div class="tagline">今日もジュワッと！<br>🔥 サクサク？それとも真っ黒焦げ？</div><p class="community-count" aria-live="polite">${cookedTotal===null?'累計品数を読み込み中…':`累計 ${cookedTotal.toLocaleString('ja-JP')}品が揚がりました！`}</p><p>好きな食材を選んで、最高の揚げ加減を目指そう！</p><button class="primary" data-act="select">ゲームスタート ▶</button><div class="menu-tools"><button data-act="help">遊び方</button><button data-act="settings">設定・効果音テスト</button></div></div>`;
  $('#hint').textContent='好きな加減で、じゅわっと。';$('#sceneLabel').textContent='目指せ、揚げ物マスター！';return;
 }
 if(mode==='select'){
  panel.innerHTML=`<div class="selection-head"><h1>何を揚げる？</h1><button class="mini" data-act="menu">戻る</button></div><div class="food-list">${Object.entries(RECIPES).map(([id,r])=>`<button class="food-card" data-food="${id}"><img src="${thumbs[id]||''}" alt="${r.name}の3Dモデル"><strong>${r.name}</strong><small>${r.difficulty} · ${r.temp}℃${r.quantity>1?` · ${r.quantity}${id==='fries'?'本':'個'}`:''}</small></button>`).join('')}</div>`;$('#hint').textContent='好きな食材を選ぼう。';$('#sceneLabel').textContent='食材選択';return;
 }
 if(explodedDish){panel.innerHTML=`<div class="stage-row"><span>爆発！ 調理終了・0点</span>${comedy.active?.type==='blast'?'':`<button class="primary" data-act="score">結果を見る →</button>`}</div>`;$('#sceneLabel').textContent=RECIPES[s.id].name+' · 調理終了';$('#hint').textContent='大爆発！ 今回は0点……。';updateUI();return;}
 const r=RECIPES[s.id];let body='';
 if(s.stage==='prep'||(s.id==='churros'&&s.craft.drawing)){
  const labels=r.steps;body=s.id==='gyoza'?`<div class="gyoza-steps" aria-label="包む工程"><span class="${s.prep===0?'next':s.prep>0?'done':''}">① 具をのせる</span><span class="${s.prep===1?'next':s.prep>1?'done':''}">② 皮を折る</span><span class="${s.prep===2?'next':s.prep>2?'done':''}">③ ひだ <b id="gyozaPleats">${s.craft.pleats.length}/5</b></span></div>`:isCraft(s.id)?`<div class="prep-row craft-row"><strong id="craftProgress">絞り出し</strong></div>`:labels.length?`<div class="prep-row"><span>衣づけ</span>${labels.map((n,i)=>`<button class="prep-step ${s.prep>i?'done':s.prep===i?'next':''}" data-act="prep" ${s.prep===i&&!s.prepBusy?'':'disabled'}>${s.prep>i?'✓':i+1} ${n}</button>`).join('')}</div><div class="prep-guide" role="status"><span class="prep-guide-text"></span><div class="prep-progress" hidden><span></span></div></div>`:'';
  if(s.id==='churros')body=churroModes();
  $('#hint').textContent=s.prep<labels.length?`${labels[s.prep]}を、まんべんなく。`:'下準備完了。油に入れよう。';
 }else if(s.stage==='drain'){
  body=s.id==='gyoza'?`<div class="stage-row gyoza-drain"><span id="gyozaDrainStatus" role="status">金網で油切り <b id="drainTime">${Math.floor(s.drain)}</b> / 2秒</span><button class="primary" data-act="score">採点へ →</button></div>`:`<div class="stage-row"><span>油切り <b id="drainTime">${Math.floor(s.drain)}</b> 秒</span><button class="primary" data-act="plate">お皿に盛り付ける →</button></div>`;$('#hint').textContent=s.id==='gyoza'?'金網で2秒ほど油を切ろう。皿には盛り付けません。':r.difficulty==='むずかしい'?'取り出すと金網で自動的に油切り。少し待ってから盛り付けへ。':r.difficulty==='かんたん'?'金網に置きました。盛り付けへ進めます。':'少し油を切ると、さっくり軽く。';
 }else if(s.stage==='plate'){
  body=`<div class="stage-row"><span><b>${grade(s).score}</b> / 100点</span><button class="mini" data-act="score">採点を見る</button></div>${s.id==='bread'?`<div class="tool-actions toppings">${[['sugar','砂糖','🤍'],['cocoa','ココア','🤎'],['kinako','きな粉','💛'],['matcha','抹茶','💚']].map(([id,n,heart])=>`<button class="mini" data-act="${id}" aria-label="${n}を追加">${heart} ${n}${s.toppings[id]?` ×${s.toppings[id]}`:''}</button>`).join('')}</div>`:''}`;$('#hint').textContent=s.id==='bread'?'好きな粉を、何度でも重ねがけ。':'こんがり、できあがり！';
 }
 if(s.stage==='plate'&&s.id==='churros')body+=`<div class="craft-row">🤍 チュロスの上をスワイプして砂糖をまぶす <b id="sugarCount"></b></div>`;panel.innerHTML=piecePicker()+body+controls();$('#sceneLabel').textContent=r.name+' · '+({prep:'下準備',fry:'調理中',drain:'油切り',plate:'完成'}[s.stage]);bindInputs();updateUI();
}
function shapeIcon(id){
 const path=churroTemplate(id),xs=path.map(p=>p.x),zs=path.map(p=>p.z),x=(Math.min(...xs)+Math.max(...xs))/2,z=(Math.min(...zs)+Math.max(...zs))/2,k=50/Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...zs)-Math.min(...zs));
 const d=path.map((p,i)=>`${i?'L':'M'}${(32+(p.x-x)*k).toFixed(1)},${(32+(p.z-z)*k).toFixed(1)}`).join(' ');
 return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="${d}" fill="none" stroke="#a95316" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#efb357" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function churroModes(){const locked=s.craft.used;return `<div class="churro-modes"><div class="mode-switch">${[['free','✏️ 自由に描く'],['template','💗 かんたん型作り']].map(([id,label])=>`<button data-churro-mode="${id}" aria-pressed="${s.craft.mode===id}" ${locked?'disabled':''}>${label}</button>`).join('')}</div>${s.craft.mode==='template'?`<div class="churro-shapes">${[['heart','ハート'],['star','星'],['spiral','ぐるぐる'],['ribbon','リボン']].map(([id,label])=>`<button data-churro-shape="${id}" aria-label="${label}の型" ${locked?'disabled':''}>${shapeIcon(id)}<span>${label}</span></button>`).join('')}</div>`:'<p class="churro-instruction">ひと筆で自由に。指を離すと絞り終わり</p>'}</div>`;}

function piecePicker(){const visible=s.id==='churros'?batch.pieces.map((p,i)=>({p,i})).slice(Math.max(0,batch.selected-7),Math.max(16,batch.selected+9)):batch.pieces.map((p,i)=>({p,i}));return batch.pieces.length<2?'':`<div class="piece-picker"><span>選択<br><b>${batch.selected+1}/${batch.pieces.length}</b></span><div class="piece-strip">${visible.map(({p,i})=>`<button data-piece="${i}" class="piece ${i===batch.selected?'selected':''} ${p.stage}" aria-label="${i+1}個目：${({prep:'下準備',fry:'調理中',drain:'油切り',plate:'完成'})[p.stage]}" aria-pressed="${i===batch.selected}"><b>${i+1}</b><small>${({prep:p.prepBusy?'衣づけ中':'準備',fry:p.checking?'確認中':'油の中',drain:'油切り',plate:'完成'})[p.stage]}</small></button>`).join('')}</div><button class="mini" data-act="next-piece">次の${s.id==='fries'?'1本':'1個'} ›</button></div>`;}
function bindInputs(){const temp=$('#temperature');if(temp)temp.oninput=()=>{s.target=Number(temp.value);$('#target').textContent=s.target;};}
function format(t){return String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0');}
function updateUI(){
 for(const button of panel.querySelectorAll('[data-churro-mode],[data-churro-shape]'))button.disabled=Boolean(s.craft?.used);
 const drop=panel.querySelector('[data-act="drop"]');if(drop)drop.disabled=s.id==='churros'||s.stage!=='prep'||s.prep!==RECIPES[s.id].steps.length||s.prepBusy>0;
 if(isCraft(s.id)){if($('#craftProgress'))$('#craftProgress').textContent=s.id==='churros'?(s.craft.ready?'形ができました':'指で絞り出す'):['① 具をのせる','② 皮を折る',`③ ひだ ${s.craft.pleats.length}/5`,'下準備完了'][s.prep];if($('#gyozaPleats'))$('#gyozaPleats').textContent=`${s.craft.pleats.length}/5`;for(const [i,step] of [...panel.querySelectorAll('.gyoza-steps span')].entries()){step.classList.toggle('next',s.prep===i);step.classList.toggle('done',s.prep>i);}if($('#sugarCount'))$('#sugarCount').textContent=`${Math.round(s.sugar*100)}%`; }
 const prep=panel.querySelector('.prep-step.next');if(prep)prep.disabled=s.prepBusy>0;
 if(mode==='cook'&&s.stage==='prep'){
  if(panel.querySelector('.prep-guide')){const guide=prepInstructions(),bar=panel.querySelector('.prep-progress');panel.querySelector('.prep-guide-text').textContent=guide.text;bar.hidden=guide.progress===undefined;if(guide.progress!==undefined)bar.firstElementChild.style.width=guide.progress+'%';$('#hint').textContent=guide.hint;}
  else $('#hint').textContent=s.prepBusy>0?'下準備中…':s.prep<RECIPES[s.id].steps.length?RECIPES[s.id].steps[s.prep]+'を、まんべんなく。':'この1個を油へ。';
 }
 if(mode==='cook'&&isCraft(s.id)&&(s.stage==='prep'||s.stage==='plate'))$('#hint').textContent=craftHint(s);
 for(const button of panel.querySelectorAll('[data-piece]')){const p=batch.pieces[Number(button.dataset.piece)],b=button.querySelector('small');if(b)b.textContent=({prep:p.prepBusy?'衣づけ中':'準備',fry:p.checking?'確認中':'油の中',drain:'油切り',plate:'完成'})[p.stage];}

 $('#hudTemp').textContent=Math.round(s.oil);$('#hudTime').textContent=format(s.time);$('#hudFood').textContent=RECIPES[s.id].name;
 if(thumbs[s.id]&&$('#hudFoodImage').getAttribute('src')!==thumbs[s.id])$('#hudFoodImage').src=thumbs[s.id];
 $('#pauseTop').hidden=Boolean(explodedDish)||comedy.active?.type==='blast'||mode!=='cook'||!batch.pieces.some(p=>p.stage==='fry');$('#pauseTop').textContent=s.paused?'▶':'Ⅱ';$('#pauseTop').setAttribute('aria-label',s.paused?'調理を再開':'一時停止');
 if($('#drainTime'))$('#drainTime').textContent=Math.floor(s.drain);
 if(mode==='cook'&&s.id==='gyoza'&&s.stage==='drain'){const done=s.drain>=2,status=$('#gyozaDrainStatus');if(status){if(done&&!status.classList.contains('done'))status.textContent='✓ 油切り完了';status.classList.toggle('done',done);}$('#hint').textContent=done?'油切り完了！「採点へ」を押そう。':'金網で2秒ほど油を切ろう。皿には盛り付けません。';}
 const look=cookingLook(s),h=look.faces[1-s.side].heat,pct=Math.round(look.gauge);
 if($('#gaugePointer')){$('#gaugePointer').style.left=pct+'%';$('#fryGauge').setAttribute('aria-valuenow',String(pct));$('#fryGauge').setAttribute('aria-valuetext',look.label);}
 const flip=panel.querySelector('[data-act="flip"]');if(flip)flip.disabled=s.stage!=='fry'||s.paused||s.craft?.drawing||s.time-(s.lastFlip??-100)<1.2;const lift=panel.querySelector('[data-act="lift"]');if(lift&&s.id==='churros')lift.disabled=s.stage!=='fry'||s.craft.drawing;
 for(const a of ['move','baste','check','stir']){const b=panel.querySelector(`[data-act="${a}"]`);if(b){b.disabled=s.paused||s.craft?.drawing||(a!=='check'&&(s.checking||s.toolCooldown>0))||(a==='stir'&&RECIPES[s.id].quantity<2);if(a==='baste'&&s.time-(s.lastBaste??-100)<4)b.disabled=true;if(a==='check')b.textContent=s.checking?'油に戻す':'持ち上げて確認';}}

 if(mode==='cook'&&!explodedDish&&s.stage==='fry'){$('#hint').textContent=s.paused?'一時停止中。▶で再開。':s.checking?'持ち上げ中。色を見て油に戻そう。':s.rupture?'衣が割れて、中身がこぼれた！':look.scoreBurnt?(look.gauge>=85?'焦げの領域に入った！取り出そう。':'裏側に焦げが出ています。ひっくり返して確認しよう。'):h>1.25?'濃いきつね色。香ばしく揚がっています。':h>.8?'こんがり、いい色になってきた。':'ジュワジュワ。反対側も揚げてみよう。';if(s.id==='bread'&&!s.paused&&!s.checking&&!s.rupture)$('#hint').textContent=look.scoreBurnt?'焦げ色が濃くなっています。':look.underdone&&h>.8?'表面が色づいています。裏面と中はまだ加熱中。':h>1.4?'濃いきつね色。香ばしい仕上がりです。':h>1.02?'きつね色に色づいています。':h>.72?'こんがり、いい色になってきた。':h>.28?'だんだん色づいてきた！':'まだ少し白いね。';if(s.id==='churros'&&s.craft.drawing&&!s.paused)$('#hint').textContent='そのまま絞り続けられます。離すと1本が完成。';}
 if(['blast','grow'].includes(comedy.active?.type)){for(const control of panel.querySelectorAll('button,input'))control.disabled=true;if(comedy.active?.type==='blast')$('#hint').textContent='';if(canRescueBlast()&&lift)lift.disabled=false;}
}
function canRescueBlast(){const e=comedy.active;return e?.type==='blast'&&e.p===s&&!e.p.exploded&&e.p.stage==='fry';}
function begin(id){resultImageShare.dispose();blastScreen.clear();$('#growNotice').hidden=true;explodedDish=null;comedy.reset(true);batch=createBatch(id,id==='pork'?thickness:1);for(const p of batch.pieces)p.target=p.oil=RECIPES[id].temp;s=batch.pieces[0];world?.select(id,s.thickness,batch);mode='cook';render();}
function selectPiece(i){if(explodedDish||comedy.active?.type==='blast')return;s=choosePiece(batch,i);world?.choose?.(i);render();}
function menu(){resultImageShare.dispose();blastScreen.clear();$('#growNotice').hidden=true;explodedDish=null;comedy.reset();s.paused=true;mode='menu';render();counter.refresh();}
let beforeModal=false;
function showModal(content){if(!$('#modal').open){beforeModal=s.paused;s.paused=true;}$('#modalContent').innerHTML=content;if(!$('#modal').open)$('#modal').showModal();updateUI();}
$('#modal').addEventListener('close',()=>{s.paused=beforeModal;updateUI();});
function help(){showModal(`<div class="help-guide">
 <h2>遊び方</h2>
 <p class="help-lead">まずはこの3ステップ。細かい操作は下から必要な分だけ開けます。</p>
 <ol class="help-steps">
  <li><span class="help-icon">🥣</span><div><b>食材を選んで準備</b><small>衣づけは下の工程ボタンを押してから、画面中央の食材をなぞります。</small></div></li>
  <li><span class="help-icon">🍳</span><div><b>油に入れて揚げる</b><small>温度を決めて投入。色を見ながら、頃合いで裏返します。</small></div></li>
  <li><span class="help-icon">🍽️</span><div><b>取り出して結果を見る</b><small>取り出したら仕上げ。完成後に得点を確認しましょう。</small></div></li>
 </ol>
 <h3 class="help-subhead">操作ガイド</h3>
 <details open><summary>衣の付け方（小麦粉・卵・パン粉）</summary><ol><li>下にある「1 小麦粉」を<b>1回押す</b>。ボタンを押すだけでは進みません。</li><li>画面中央の食材の上に指を置き、<b>押したまま手前・奥・左右になぞる</b>。進み具合が100%になるまで続けます。食材の周りの台では進みません。</li><li>「2 卵」が押せるようになったら同じように進める。「3 パン粉」は<b>ボタンを1回押すだけ</b>で付きます。</li></ol><p>進まないときは、今の工程ボタンを押したか確認し、食材の上から指を動かしてください。1か所を連続でタップするだけでは衣は広がりません。</p></details>
 <details><summary>揚げている間の操作</summary><ul><li><b>トングで動かす／かき混ぜる：</b>位置を変えて揚げムラを減らします。</li><li><b>油をかける：</b>上側にも火を通します。</li><li><b>持ち上げて確認：</b>色を見られます。確認中は加熱が止まります。</li><li><b>ひっくり返す：</b>裏面を揚げます。画面の色やゲージを目安にしましょう。</li></ul></details>
 <details><summary>取り出した後の油切り</summary><p>「取り出す」を押すと、自動で金網へ移ります。むずかしい食材は少し油を切ってから進めます。揚げ餃子は2秒で完了表示になり、皿に移さず「採点へ」を押します。</p></details>
 <details><summary>揚げ餃子を作る</summary><p>左のスプーンを皮の中央へ運びます。皮の奥側のふちから手前へなぞって折り、光る5つの目印をタップ。包めたら「投入」を押します。</p></details>
 <details><summary>チュロスを作る</summary><p><b>自由描き：</b>鍋の上で絞り袋をドラッグ。好きな形に描き、指を離すと切れます。1回の調理で1本、長さの固定上限はありません。</p><p><b>かんたん型作り：</b>ハート・星・ぐるぐる・リボンから選びます。揚げ終わったら、チュロスをなぞって砂糖をまぶせます。</p></details>
 <details><summary>揚げパンを仕上げる</summary><p>下準備なしで油に入れます。完成後、砂糖・ココア・きな粉・抹茶をなぞって好きなだけ重ねられます。</p></details>
 <details><summary>複数個を揚げる</summary><p>番号で食材を1個選び、その食材ごとに衣付け・投入・裏返し・取り出しを行います。油の中にない食材は揚がりません。</p></details>
 <details><summary>視点と遊ぶときの注意</summary><p>調理操作をしていないときに3D画面をドラッグすると、視点を回せます。タブを離れると調理は停止します。</p><p class="note">ゲーム内の時間や手順は実際の調理と異なります。現実の調理には使わないでください。</p></details>
</div>`);}
function scoreSound(points){return points<=30?'fail':points>=100?'scorePerfect':points>=95?'scoreFanfare':points>=90?'scoreGrand':points>=80?'scoreBright':points>=31?'scoreClear':'fail';}
function score(){if(!s.finishPlayed)comedy.reset();counter.complete(s);const activation=enableAudio();const dish=s,firstScore=!s.scorePlayed;s.scorePlayed=true;const g=awardGrade(s,batch.pieces);if(!s.exploded&&!s.finishPlayed)comedy.finish(s,g.score);if(!s.record)s.record=saveBest(s.id,g.score);showModal(resultCard(g,s));if(s.completionCount)$('#resultCount').textContent=`+1  累計 ${s.completionCount.toLocaleString('ja-JP')}品が揚がりました！`;bindResultShare($('#modalContent'),s,g);resultImageShare.bind($('#modalContent'),s,g,{ready:foodMapsReady,key:JSON.stringify([s.id,s.pieceIndex,g.score,s.exploded,s.lowComment,batch.pieces.map(p=>[p.stage,p.heat,p.toppings,p.craft?.revision,p.flips,p.giant])]),capture:()=>world?.captureResult(dish,batch)});activation.then(()=>{if(s!==dish||!$('#retryDish')||!firstScore)return;audio.update({...s,stage:'plate'});audio.effect(scoreSound(g.score));}).catch(()=>{});$('#retryDish').onclick=()=>{$('#modal').close();begin(s.id);};$('#nextDish').onclick=()=>{resultImageShare.dispose();$('#modal').close();if(s.id==='bread')world?.hideForSelection();s.paused=true;mode='select';render();};}

function config(){showModal(`<h2>揚げ物の達人 · 設定</h2><label class="toggle">ミュート<input id="mute" type="checkbox" ${settings.muted?'checked':''}></label><label class="toggle" for="volume">音量<span id="volumeLabel">${Math.round(settings.volume*100)}%</span></label><input id="volume" class="range" type="range" min="0" max="1" step="0.05" value="${settings.volume}"><div class="dialog-actions"><button id="testSound" class="primary">効果音テスト</button><button id="resumeSound" class="secondary">音声を再開</button></div><div id="audioStatus" role="status">${audio.status()}</div><p class="note">テストではジュワッという音とチャイムを再生します。動作中と表示されても聞こえない場合は、端末の音量・消音設定・音声出力先を確認してください。実際に聞こえるかは端末側での確認が必要です。</p><button id="helpSettings" class="secondary">遊び方</button>${mode==='cook'&&s.id==='pork'&&s.stage==='prep'&&s.prep===0?`<label class="toggle" for="thick">肉の厚み <span id="thickValue">${Math.round(thickness*15)}mm</span></label><input id="thick" class="range" type="range" min="0.8" max="1.4" step="0.1" value="${thickness}">`:''}<label class="toggle">軽量描画<input id="low" type="checkbox" ${settings.quality==='low'?'checked':''}></label>`);
 $('#helpSettings').onclick=help;const th=$('#thick');if(th)th.oninput=()=>{thickness=Number(th.value);s.thickness=thickness;world?.select(s.id,thickness);$('#thickValue').textContent=Math.round(thickness*15)+'mm';};
 $('#mute').onchange=()=>{settings.muted=$('#mute').checked;audio.set(settings.volume,settings.muted);save();};$('#volume').oninput=()=>{settings.volume=Number($('#volume').value);$('#volumeLabel').textContent=Math.round(settings.volume*100)+'%';audio.set(settings.volume,settings.muted);save();};$('#testSound').onclick=()=>{if(settings.muted||settings.volume===0){$('#audioStatus').textContent='ミュートを解除し、音量を上げてからテストしてください。';return;}enableAudio().then(()=>{audio.test();if($('#audioStatus'))$('#audioStatus').textContent='テスト再生中。音が聞こえるか確認してください。';}).catch(()=>{});};$('#resumeSound').onclick=()=>enableAudio().catch(()=>{});$('#low').onchange=()=>{settings.quality=$('#low').checked?'low':'high';world?.quality(settings.quality);save();};}
panel.addEventListener('click',e=>{const btn=e.target.closest('button');if(!btn||btn.disabled)return;const a=btn.dataset.act;if(['blast','grow'].includes(comedy.active?.type)&&!(a==='lift'&&canRescueBlast()))return;if(explodedDish&&mode==='cook'&&a!=='score')return;
 // Audio activation starts in this original gesture; no awaited work precedes resume().
 const ready=enableAudio();ready.catch(()=>{});
 if(s.id==='churros'&&!s.craft.used&&s.stage==='prep'){if(btn.dataset.churroMode){s.craft.mode=btn.dataset.churroMode;render();return;}if(btn.dataset.churroShape){if(applyChurroTemplate(s,btn.dataset.churroShape)){world?.signal('drop',elapsed,s);render();}return;}}
 if(btn.dataset.piece!==undefined){selectPiece(Number(btn.dataset.piece));return;}if(a==='next-piece'){selectPiece((batch.selected+1)%batch.pieces.length);return;}if(btn.dataset.food){begin(btn.dataset.food);return;}if(a==='menu'){menu();return;}if(a==='select'){s.paused=true;mode='select';render();return;}if(a==='help'){help();return;}if(a==='settings'){config();return;}if(a==='score'){score();return;}if(a==='pause'){s.paused=!s.paused;render();return;}
 if(actBatch(batch,a)){if(a==='plate'){counter.complete(s);const points=awardGrade(s,batch.pieces).score;s.record=saveBest(s.id,points);comedy.finish(s,points);}const sound=a==='prep'&&RECIPES[s.id].steps[s.prep-1]==='パン粉'?'crumbs':a;ready.then(()=>audio.effect(sound)).catch(()=>{});world?.signal(a,elapsed,s);if(a==='drop')s.paused=false;render();}
});
$('#home').onclick=menu;$('#settings').onclick=config;$('#foodSelect').onclick=()=>{s.paused=true;mode='select';render();};$('#pauseTop').onclick=()=>{if(explodedDish||['blast','grow'].includes(comedy.active?.type))return;s.paused=!s.paused;if(!s.paused)enableAudio().catch(()=>{});updateUI();};$('#sound').onclick=()=>{settings.muted=!settings.muted;audio.set(settings.volume,settings.muted);save();if(!settings.muted)enableAudio('flip').catch(()=>{});};$('#camera').onclick=()=>world?.resetView();$('#closeModal').onclick=()=>$('#modal').close();
$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=$('#modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('#modal').close();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)audio.piping(false);if(document.hidden&&mode==='cook'&&batch.pieces.some(p=>p.stage==='fry')){s.paused=true;beforeModal=true;updateUI();audio.update(s);}previous=performance.now();});
function loop(now){const dt=Math.min((now-previous)/1000,.05);previous=now;elapsed+=dt;const growing=comedy.active?.type==='grow';if(mode==='cook'&&!explodedDish&&comedy.active?.type!=='grow'&&!(comedy.active?.type==='blast'&&comedy.active.p.exploded)){const stage=s.stage;advanceBatch(batch,dt);for(const p of batch.pieces)if(p.id==='churros'&&p.craft.justDropped){p.craft.justDropped=false;world?.signal('drop',elapsed,p);enableAudio().catch(()=>{});}if(stage!==s.stage)render();}audio.piping(mode==='cook'&&!document.hidden&&!$('#modal').open&&!s.paused&&s.id==='churros'&&s.craft.drawing);const frying=batch.pieces.filter(p=>p.stage==='fry'&&!p.checking&&!p.exploded);audio.update(mode==='cook'&&!explodedDish&&frying.length?{...frying[0],paused:s.paused||growing,oil:s.oil,time:frying.reduce((a,p)=>a+p.time,0)/frying.length,activeQuantity:frying.length}:{...s,stage:'prep'});if(!document.hidden&&!document.body.classList.contains('notice-open')){if((mode==='cook'&&!s.paused)||($('#retryDish')&&['spark','dance'].includes(comedy.active?.type||comedy.queue[0]?.type)))comedy.tick(explodedDish||s.paused?[]:batch.pieces,dt);}if(!document.body.classList.contains('notice-open')){blastScreen.update(mode==='cook'?comedy.active:null);world?.animate(s,elapsed,dt,mode!=='cook',batch,comedy.active);}uiTick+=dt;if(uiTick>.1){updateUI();uiTick=0;}requestAnimationFrame(loop);}
comedy.onStart=e=>{
 if(e.type==='blast'){if(s!==e.p){batch.selected=batch.pieces.indexOf(e.p);s=e.p;world?.choose?.(batch.selected);render();}else updateUI();}
 if(e.type==='boom'){counter.complete(e.p);explodedDish=e.p;comedy.queue.length=0;batch.selected=batch.pieces.indexOf(e.p);s=e.p;world?.choose?.(batch.selected);render();}
 if(e.type==='grow'||e.type==='grown'){$('#growNotice').textContent=e.type==='grow'?'あれ？ エビフライの様子が……':'エビフライが成長期に入りました！';$('#growNotice').hidden=false;audio.effect(e.type);updateUI();}
 const labels={boom:'💥 バァァァン！！！',dance:'突然の揚げ物ダンス',spark:e.score>=65?'おいしそうに揚がった！':'一皿完成！ 次こそ名作。'};
 if(labels[e.type])toast(labels[e.type]);if(['boom','dance'].includes(e.type))audio.effect(e.type);

};
comedy.onEnd=e=>{if(e.type==='grow'){$('#growNotice').hidden=true;updateUI();}if(e.type==='blast'&&!e.p.exploded&&mode==='cook')render();if(e.type==='blast'&&e.p.exploded&&explodedDish===e.p&&mode==='cook'){render();score();}};
function notice(open){if(open){noticePaused=s.paused;s.paused=true;audio.piping(false);}else s.paused=noticePaused;document.body.classList.toggle('notice-open',open);$('#noticePage').hidden=!open;$('#noticeTab').setAttribute('aria-selected',String(open));$('#gameTab').setAttribute('aria-selected',String(!open));}
$('#noticeTab').onclick=()=>{if(!document.body.classList.contains('notice-open'))notice(true);};$('#gameTab').onclick=()=>{if(document.body.classList.contains('notice-open'))notice(false);};
render();counter.refresh();requestAnimationFrame(loop);
window.addEventListener('error',e=>{if(e.message&&world)toast('動作エラーが発生しました。ページを再読み込みしてください。');});
