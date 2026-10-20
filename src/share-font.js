import regularURL from './assets/share-jp-400.woff';
import blackURL from './assets/share-jp-900.woff';
let ready;
export function shareFonts(){
 if(!ready)ready=(async()=>{if(typeof FontFace==='undefined'||!document.fonts)throw new Error('このブラウザでは共有画像用の文字を読み込めません。');await Promise.all([[400,regularURL],[900,blackURL]].map(async([weight,url])=>{const font=new FontFace('AgeShareJP',`url(${url})`,{weight:String(weight)});await font.load();document.fonts.add(font);}));await document.fonts.ready;})();
 return ready.catch(error=>{ready=null;throw error;});
}
