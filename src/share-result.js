import {RECIPES} from './simulation.js';
export const PUBLIC_GAME_URL=typeof window!=='undefined'?new URL('/',window.location.href).href:'https://agebiyori-fry-studio.happyjam209.chatgpt.site/';
export function resultShare(s,g,rank,comment){
 const name=RECIPES[s.id].name;
 const text=`『揚げ物の達人』で${name}を作って${g.score}点！\n${comment||(s.exploded?'本日の料理は爆発しました。':'あなたは何点取れる？')}`;
 return {title:'揚げ物の達人',text:text+(rank?`\nランク：${rank}`:'')+'\n#揚げ達 #ブラウザゲーム',url:PUBLIC_GAME_URL};
}
export function intentURL(data){return 'https://twitter.com/intent/tweet?'+new URLSearchParams({text:data.text,url:data.url});}
export function bindResultShare(root,s,g,env=globalThis){
 const data=resultShare(s,g,root.querySelector('.rank-medal b')?.textContent?.trim(),root.querySelector('.result-comment')?.textContent?.trim());
 const x=root.querySelector('#shareX'),other=root.querySelector('#shareOther'),copy=root.querySelector('#copyResult'),field=root.querySelector('#shareText'),status=root.querySelector('#shareStatus');
 const text=data.text+'\n'+data.url;let busy=false,blockedUntil=0;
 const hint=message=>{status.textContent=message;};
 function fallback(){copy.hidden=false;hint('標準共有を利用できません。結果とURLをコピーできます。');}
 function manual(){field.hidden=false;field.value=text;field.focus();field.select();field.setSelectionRange?.(0,text.length);hint('文章を長押ししてコピーしてください。');}
 async function run(fn){if(busy||Date.now()<blockedUntil)return;busy=true;x.disabled=other.disabled=true;try{await fn();}finally{busy=false;blockedUntil=Date.now()+600;x.disabled=other.disabled=false;}}
 x.onclick=()=>run(()=>{const popup=env.window.open(intentURL(data),'agemaster-share','popup,width=600,height=650');if(popup){popup.opener=null;hint('投稿画面を開きました。投稿はご自身で確定してください。');}else fallback();});
 other.onclick=()=>run(async()=>{try{if(typeof env.navigator?.share!=='function'){fallback();return;}await env.navigator.share(data);hint('共有画面を閉じました。');}catch(e){if(e?.name==='AbortError'){hint('');return;}fallback();}});
 copy.onclick=()=>run(async()=>{try{if(!env.navigator?.clipboard?.writeText){manual();return;}await env.navigator.clipboard.writeText(text);hint('結果とURLをコピーしました。');}catch{manual();}});
}
