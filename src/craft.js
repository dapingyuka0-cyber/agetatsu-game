import {newChurro,churroGesture} from './churro-flow.js';
// Pure gesture state: positions are food-local X/Z, not screen pixels.
export const isCraft=id=>id==='gyoza'||id==='churros';
export const demoPath=()=>Array.from({length:45},(_,i)=>({x:-1+i/22,z:.18*Math.sin(i/44*Math.PI)}));
export const newCraft=id=>id==='gyoza'?{filling:0,fold:0,pleats:[],ready:false,drag:null,tool:{x:-1.3,z:0}}:newChurro();
export function craftHint(s){const c=s.craft;if(s.id==='churros')return s.stage==='plate'?'チュロスの上をなぞって、砂糖をまぶそう。':c.ready?'絞り出し完了。そのまま好みの色まで揚げよう。':c.mode==='template'?'好きな型をタップ。そのまま油で揚がります。':'鍋の上をドラッグして絞る。離すとカット' ;return !c.filling?'左のスプーンを押さえ、皮の真ん中まで運ぼう':c.fold<1?'皮の奥側のふちから手前へ、指でなぞって折ろう':c.pleats.length<5?`光る目印を1つずつタップ（${c.pleats.length}/5）`:'包めた！下の「投入」で油へ。';}
export function pleatPoint(i){const a=Math.PI*(.18+i*.16);return {x:.92*Math.cos(a),z:.70*Math.sin(a)*Math.cos(.5)-.16};}
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function craftGesture(s,type,p){
 if(!isCraft(s.id))return false;const c=s.craft;if(s.id==='churros'&&s.stage!=='plate')return churroGesture(s,type,p);if(type==='cancel'){c.drag=null;if(s.id==='churros'&&c.drawing){c.drawing=false;c.path=[];c.ready=false;s.prep=0;}return true;}if(s.paused)return false;
 if(s.stage==='plate'&&s.id==='churros'){
  if(type==='down'){c.drag=p;c.sugarDistance=0;return true;}
  if(type==='move'&&c.drag){const d=dist(p,c.drag);c.drag=p;if(c.path.some(q=>dist(q,p)<.32)&&d<.5){c.sugarDistance+=d;if(c.sugarDistance>.25){s.toppings.sugar+=.22;s.sugar=s.toppings.sugar;c.sugarDistance=0;c.sugarAt=p;}}return true;}
  if(type==='up'||type==='cancel')c.drag=null;return true;
 }
 if(s.stage!=='prep')return false;
 if(!c.filling){
  if(type==='down'&&dist(p,c.tool)<.5)c.drag=p;
  if(type==='move'&&c.drag){c.tool={x:Math.max(-1.5,Math.min(1.5,p.x)),z:Math.max(-1,Math.min(1,p.z))};}
  if(type==='up'&&c.drag){if(Math.hypot(c.tool.x,c.tool.z)<.36){c.filling=1;s.prep=1;}c.drag=null;c.tool={x:-1.3,z:0};}
  if(type==='cancel'){c.drag=null;c.tool={x:-1.3,z:0};}return true;
 }
 if(c.fold<1){
  if(type==='down'&&p.z<-.18&&Math.abs(p.x)<.95)c.drag={...p,startFold:c.fold};
  if(type==='move'&&c.drag){c.fold=Math.min(1,Math.max(0,c.drag.startFold+(p.z-c.drag.z)/1.05));if(c.fold>=1){s.prep=2;c.drag=null;}}
  if(type==='up'||type==='cancel'){c.drag=null;if(c.fold>.93){c.fold=1;s.prep=2;}}return true;
 }
 if(type==='down'){const i=Array.from({length:5},(_,i)=>i).find(i=>!c.pleats.includes(i)&&dist(p,pleatPoint(i))<.25);if(i!==undefined){c.pleats.push(i);if(c.pleats.length===5){c.ready=true;s.prep=3;}}}return true;
}
