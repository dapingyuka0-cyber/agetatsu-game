import {pickComment,pickZeroComment,lowComments} from './comedy.js';
import {cookingLook} from './cooking-look.js';
import {RECIPES,gentleFoods} from './simulation.js';
export function resultPresentation(g,s){
 const rank=g.score>=90?'S':g.score>=80?'A':g.score>=65?'B':g.score>=40?'C':'D';
 const look=g.look||cookingLook(s);
 const comment=g.score===0?(s.zeroCommentReason===g.zeroReason&&s.zeroComment?s.zeroComment:(s.zeroCommentReason=g.zeroReason,s.zeroComment=pickZeroComment(g.zeroReason))):g.score<=30?(s.lowComment||(s.lowComment=pickComment(lowComments))):
 ({S:'完璧な揚げ加減！',A:'かなりおいしそう！',B:'惜しい！ あとひと工夫',C:look.scoreBurnt?'ちょっと揚げすぎたかも':'あと少しでおいしくなる',D:'次こそ、きつね色！'})[rank];
 return {rank,comment,look};
}
export function resultCard(g,s){
 const {rank,comment,look}=resultPresentation(g,s);
 const good=g.rows.filter(r=>r.value/r.max>=.8).map(r=>({揚げ色:look.burnt&&!look.scoreBurnt?'濃い揚げ色が香ばしい':'きれいなきつね色',火の通り:'中心までいい感じ',衣の仕上がり:'軽いサクサク衣',揚げムラ:'表も裏も均等',食材の状態:'形もきれい',調理の丁寧さ:'おいしく仕上げた'})[r.name]).slice(0,2);
 const generous=gentleFoods.has(s.id)&&g.score===100;
 const bad=[];if(look.underdone)bad.push('中まで火が足りない');else if(look.faces.some(face=>face.pale>.35))bad.push('片面の揚げ色がまだ薄い');else if(look.scoreBurnt&&look.dryness>.25&&!generous)bad.push('中が少しパサつき気味');if(look.scoreBurnt&&!generous)bad.push('表面が焦げ気味');else if(look.pale>.35&&!generous)bad.push('揚げ色がまだ薄い');if(look.uneven>.45&&!generous&&g.rows.find(r=>r.name==='揚げムラ')?.value<g.rows.find(r=>r.name==='揚げムラ')?.max)bad.push('表裏に揚げムラ');if(s.rupture&&!generous)bad.push('衣が割れた');if(s.absorb>.25&&!generous)bad.push('油を吸いすぎた');if(s.drain<3&&!generous)bad.push('もう少し油を切ろう');
 const zeroTip={raw:'もっと焼こう！',black:'もう少し早く取り出そう！',time:'もう少し早く取り出そう！',explosion:'爆発する前に取り出そう！'};
 const feedback=g.zeroReason?`<div><b>↗ 次のコツ</b><p>${zeroTip[g.zeroReason]}</p></div>`:`<div><b>◎ よかったところ</b><p>${good.join('・')||'最後まで揚げきった！'}</p></div><div><b>↗ 次のコツ</b><p>${bad.slice(0,2).join('・')||'この揚げ加減を覚えよう'}</p></div>`;
 return `<section class="result-card rank-${rank} ${g.score<=30?'oops':'celebrate'}"><div class="result-ribbon">${g.score>=80?'よくできました！':'おつかれさま！'}</div><h2>${RECIPES[s.id].name}${s.individual&&RECIPES[s.id].quantity>1?` · ${s.pieceIndex+1}個目`:''}</h2><p class="best-record">${s.record?.saved?(s.record.updated?'🏆 自己ベスト更新！ ':'🏆 自己ベスト ')+s.record.best+'点':s.record?'記録を保存できませんでした':''}</p><div class="result-number"><div><small>今回のスコア</small><strong>${g.score}<em>点</em></strong></div><div class="rank-medal"><small>ランク</small><b>${rank}</b></div></div><p class="result-comment">${comment}</p><p id="resultCount" class="result-count" aria-live="polite"></p><div class="result-feedback">${feedback}</div><div class="result-actions"><button id="retryDish" class="secondary">↻ もう一度つくる</button><button id="nextDish" class="primary">次の食材へ ›</button></div><div class="result-share" aria-label="結果を共有"><button id="shareImage" class="primary">画像付きでシェア</button><button id="shareX" class="secondary">Xでシェア</button><button id="shareOther" class="secondary">その他に共有</button><button id="copyResult" class="secondary" hidden>結果とURLをコピー</button><p id="shareStatus" role="status"></p><textarea id="shareText" aria-label="コピーする結果とURL" readonly hidden></textarea></div><details class="result-detail"><summary>採点の内訳</summary>${g.rows.map(r=>`<div class="score-row"><span>${r.name}</span><div class="bar"><i style="width:${r.value/r.max*100}%"></i></div><span>${r.value}/${r.max}</span></div>`).join('')}</details></section>`;
}
