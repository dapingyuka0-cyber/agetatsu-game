import {cookingLook} from './cooking-look.js';
import {RECIPES} from './simulation.js';
export const BLAST_WINDUP=.65,BLAST_DURATION=5,GROW_WINDUP=.5,GROW_EXPAND=1.8,GROW_DURATION=3;
export const GENTLE_BLAST_WINDUP=7;
export const growthProgress=age=>{const t=Math.max(0,Math.min(1,(age-GROW_WINDUP)/GROW_EXPAND));return t*t*(3-2*t);};
export class Comedy{
 constructor(random=Math.random){this.random=random;this.active=null;this.queue=[];this.growthRolled=false;this.danceRolled=false;this.shrimpEvent=null;this.onStart=()=>{};this.onEnd=()=>{};}
 reset(newRound=false){this.active=null;this.queue.length=0;if(newRound){this.growthRolled=false;this.danceRolled=false;this.shrimpEvent=null;}}
 rollShrimp(){if(this.shrimpEvent===null){const r=this.random();this.shrimpEvent=r<.20?'grow':r<.40?'dance':'none';}return this.shrimpEvent;}
 enqueue(type,p,score=0){const windup=type==='blast'?GENTLE_BLAST_WINDUP:BLAST_WINDUP;this.queue.push({type,p,score,age:0,windup,duration:type==='blast'?windup+BLAST_DURATION:({grow:GROW_DURATION,dance:3,spark:1.6})[type]});}
 tick(pieces,dt){
  if(this.active){const e=this.active;if(e.type==='blast'&&!e.p.exploded&&e.p.stage!=='fry'){e.duration=0;e.p.blastQueued=false;}e.age+=dt;if(e.type==='blast'&&e.age>=e.windup&&e.duration>0&&!e.p.exploded){if(RECIPES[e.p.id].difficulty==='かんたん'||(e.p.blastProgress||0)>=65){e.p.exploded=true;e.duration=e.age+BLAST_DURATION;this.onStart({...e,type:'boom'});}else{e.windup=e.age+dt;e.duration=e.windup+BLAST_DURATION;}}if(e.type==='grow'&&e.age>=GROW_WINDUP+GROW_EXPAND&&!e.completed){e.completed=true;e.p.giant=true;this.onStart({...e,type:'grown'});}if(e.age>=e.duration){this.active=null;this.onEnd(e);}}
  if(this.active?.type==='grow')return;
  for(const p of pieces){
   if(p.stage==='fry'&&!p.checking&&!p.craft?.drawing&&!p.exploded){
    // Start the warning seven real frying seconds before the projected limit.
    // Each piece has its own integrated thermal progress and can be rescued.
    const easy=RECIPES[p.id].difficulty==='かんたん';
    if(easy&&cookingLook(p).blackened&&p.easyBlackenedSince===undefined)p.easyBlackenedSince=p.time;
    // Easy dishes color three seconds sooner, but keep their previous blast time.
    const thermalWarning=(p.blastProgress||0)+7*(p.blastRate||1)>=65;
    // The folded gyoza can expose a still-golden face at the thermal warning.
    // Wait until the face the player sees has actually begun to turn black.
    const warning=easy?p.easyBlackenedSince!==undefined&&p.time-p.easyBlackenedSince>=3:p.id==='gyoza'?thermalWarning&&cookingLook(p).faces[1-p.side].black>=.18:p.id==='onion'?p.time>=50&&thermalWarning&&cookingLook(p).faces[1-p.side].black>=.18:p.id==='churros'?p.time>=60&&thermalWarning&&cookingLook(p).faces[1-p.side].heat>=1.9:thermalWarning;
    if(warning&&!p.blastQueued){p.blastQueued=true;this.enqueue('blast',p);}
    if(p.id==='shrimp'&&p.time>3&&!this.growthRolled){this.growthRolled=true;p.growthRolled=true;if(this.rollShrimp()==='grow')this.enqueue('grow',p);}
   }
  }
  if(!this.active){while(this.queue.length){const e=this.queue.shift();if(['blast','grow'].includes(e.type)&&(e.p.stage!=='fry'||e.p.exploded||e.p.checking)){if(e.type==='blast')e.p.blastQueued=false;continue;}this.active=e;this.onStart(e);break;}}
 }
 finish(p,score){if(p.finishPlayed)return;p.finishPlayed=true;this.enqueue('spark',p,score);const look=cookingLook(p);if(!p.exploded&&score>=65&&!look.underdone&&!look.burnt&&!this.danceRolled){this.danceRolled=true;if(p.id==='shrimp'?this.rollShrimp()==='dance':this.random()<.20)this.enqueue('dance',p,score);}}
}
export const lowComments=['料理界に、新しい謎が生まれました。','シェフ、これは前衛芸術ですか？','見た目のインパクトは満点。','次の一皿に期待が集まっています。'];
export const pickComment=(list,random=Math.random)=>list[Math.floor(random()*list.length)];
export const zeroComments={
 raw:['まだ料理が始まってないようです。','ほぼ生です。','油に入れただけでは完成しません。','もう少し頑張って揚げよう！'],
 burnt:['これ、本当に食べ物ですか？','炭を作るゲームでしたっけ？','これ、何を作る予定でしたっけ？'],
 explosion:['料理って爆発するんですね。','消滅して草','キッチンで何があった？','これ、本当に食べ物ですか？']
};
export const rareExplosionComment='こんがりを通り越して滅！！！';
const previousZeroComment={};
export function pickZeroComment(reason='explosion',random=Math.random){
 const category=reason==='raw'?'raw':reason==='explosion'?'explosion':'burnt';
 const rare=category==='explosion'&&random()<.01;
 const choices=zeroComments[category].filter(comment=>comment!==previousZeroComment[category]);
 const comment=rare?rareExplosionComment:pickComment(choices,random);previousZeroComment[category]=comment;return comment;
}
