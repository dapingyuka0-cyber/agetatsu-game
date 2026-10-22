import {pickComment,pickZeroComment,lowComments} from './comedy.js';
import {cookingLook} from './cooking-look.js';
import {RECIPES,gentleFoods} from './simulation.js';
function nextCookingTip(g,s,look){
 if(g.score===100)return '次は別の食材でも満点を目指そう！';
 const faces=look.faces||[],heats=faces.map(face=>face.heat),gap=Math.abs((heats[0]||0)-(heats[1]||0));
 if(look.underdone)return '中心まで火が通るよう、もう少し揚げよう。';
 if(look.scoreBurnt)return '焦げの領域に入る前に取り出そう。';
 if(faces.some(face=>face.pale>.35))return '薄い面を下にして、両面を揚げよう。';
 if(s.prep<RECIPES[s.id].steps.length)return '下準備を最後まで丁寧に仕上げよう。';
 if(s.rupture)return '衣が割れる前に仕上げよう。';
 if(s.id==='gyoza'){
  if(!s.flips)return '一度ひっくり返して、裏面にも火を通そう。';
  if(s.drain<2)return '金網で2秒ほど油を切ろう。';
  if(gap>.32)return '淡い面を下にして、両面の色をそろえよう。';
  if(heats.some(heat=>heat<.9))return '両面がきつね色になるまで揚げよう。';
  if(s.damage>0)return '皮を崩さず、そっと取り出そう。';
  return '表裏の色を少しずつそろえて仕上げよう。';
 }
 const recipe=RECIPES[s.id];
 if(recipe.difficulty==='かんたん'){
  if(!s.flips)return '色づいたら一度返して、裏面も揚げよう。';
  const floor=s.id==='pumpkin'?.87:.93;
  if(heats.some(heat=>heat<floor)||faces.some(face=>face.pale>.10))return '淡い面をもう少し揚げ、両面をきつね色にしよう。';
  if(heats.some(heat=>heat>1.53))return '色の濃い面を見て、少し早めに仕上げよう。';
  if(gap>.37)return '表裏の色がそろうタイミングで返そう。';
  if(s.damage>.14)return '衣を崩さないよう、返す操作を丁寧にしよう。';
 }
 if(recipe.difficulty==='ふつう'){
  if(!s.goodFlip)return '片面が色づいてから、裏返そう。';
  if(heats.some(heat=>heat<1.17))return '色が淡い面をもう少し揚げよう。';
  if(heats.some(heat=>heat>1.43))return '両面がきつね色のうちに仕上げよう。';
  if(gap>.13)return '表裏の揚げ色をもう少しそろえよう。';
  if(s.temperatureTime&&s.preciseTime/s.temperatureTime<.85)return `油温を${recipe.temp}℃前後に保とう。`;
 }
 if(recipe.difficulty==='むずかしい'&&s.drain<2)return '金網で2秒ほど油を切ろう。';
 if(!s.flips)return '途中で一度返し、裏面も揚げよう。';
 return '表裏の色を見ながら、返すタイミングを整えよう。';
}
export function resultPresentation(g,s){
 const rank=g.score>=90?'S':g.score>=80?'A':g.score>=65?'B':g.score>=40?'C':'D';
 const look=g.look||cookingLook(s);
 const comment=g.score===0?(s.zeroCommentReason===g.zeroReason&&s.zeroComment?s.zeroComment:(s.zeroCommentReason=g.zeroReason,s.zeroComment=pickZeroComment(g.zeroReason))):g.score<=30?(s.lowComment||(s.lowComment=pickComment(lowComments))):
 ({S:'完璧な揚げ加減！',A:'かなりおいしそう！',B:'惜しい！ あとひと工夫',C:look.scoreBurnt||g.tips?.some(t=>t.includes('濃い焦げ茶色'))?'ちょっと揚げすぎたかも':'あと少しでおいしくなる',D:'次こそ、きつね色！'})[rank];
 return {rank,comment,look};
}
export function resultCard(g,s){
 const {rank,comment,look}=resultPresentation(g,s);
 const good=g.rows.filter(r=>r.value/r.max>=.8).map(r=>({揚げ色:look.burnt&&!look.scoreBurnt?'濃い揚げ色が香ばしい':'きれいなきつね色',火の通り:'中心までいい感じ',衣の仕上がり:'軽いサクサク衣',揚げムラ:'表も裏も均等',食材の状態:'形もきれい',調理の丁寧さ:'おいしく仕上げた'})[r.name]).slice(0,2);
 const generous=gentleFoods.has(s.id)&&g.score===100;
 const zeroTip={raw:'もっと焼こう！',black:'もう少し早く取り出そう！',time:'もう少し早く取り出そう！',explosion:'爆発する前に取り出そう！'};
 const feedback=g.zeroReason?`<div><b>↗ 次のコツ</b><p>${zeroTip[g.zeroReason]}</p></div>`:`<div><b>◎ よかったところ</b><p>${good.join('・')||'最後まで揚げきった！'}</p></div><div><b>↗ 次のコツ</b><p>${nextCookingTip(g,s,look)}</p></div>`;
 return `<section class="result-card rank-${rank} ${g.score<=30?'oops':'celebrate'}"><div class="result-ribbon">${g.score>=80?'よくできました！':'おつかれさま！'}</div><h2>${RECIPES[s.id].name}${s.individual&&RECIPES[s.id].quantity>1?` · ${s.pieceIndex+1}個目`:''}</h2><p class="best-record">${s.record?.saved?(s.record.updated?'🏆 自己ベスト更新！ ':'🏆 自己ベスト ')+s.record.best+'点':s.record?'記録を保存できませんでした':''}</p><div class="result-number"><div><small>今回のスコア</small><strong>${g.score}<em>点</em></strong></div><div class="rank-medal"><small>ランク</small><b>${rank}</b></div></div><p class="result-comment">${comment}</p><p id="resultCount" class="result-count" aria-live="polite"></p><div class="result-feedback">${feedback}</div><div class="result-actions"><button id="retryDish" class="secondary">↻ もう一度つくる</button><button id="nextDish" class="primary">次の食材へ ›</button></div><div class="result-share" aria-label="結果を共有"><button id="shareImage" class="primary">画像付きでシェア</button><button id="shareX" class="secondary">Xでシェア</button><button id="shareOther" class="secondary">その他に共有</button><button id="copyResult" class="secondary" hidden>結果とURLをコピー</button><p id="shareStatus" role="status"></p><textarea id="shareText" aria-label="コピーする結果とURL" readonly hidden></textarea></div><details class="result-detail"><summary>採点の内訳</summary>${g.rows.map(r=>`<div class="score-row"><span>${r.name}</span><div class="bar"><i style="width:${r.value/r.max*100}%"></i></div><span>${r.value}/${r.max}</span></div>`).join('')}</details></section>`;
}
