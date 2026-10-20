import {CHURRO_DRAW_RADIUS,fitTemplate} from './churro-layout.js';
export {CHURRO_PAN_SCALE,CHURRO_DRAW_RADIUS} from './churro-layout.js';
// One continuous stroke per cooking round. Rendering knots are bounded,
// travelled length is not: simplification never stops the piping gesture.
export const FALL_TIME=.24;
export const newChurro=()=>({mode:'free',path:[],ready:false,used:false,drawing:false,drag:null,sugarDistance:0,clock:0,length:0,revision:0,renderBudget:512,lastMove:0,feed:0});
export function compactChurro(c,budget=c.renderBudget||512){
 budget=Math.max(32,budget);
 while(c.path.length>budget){const a=c.path,out=[a[0]];for(let i=2;i<a.length-2;i+=2)out.push(a[i]);out.push(...a.slice(-2));c.path=out;c.revision++;}
}
const inPan=p=>Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.hypot(p.x,p.z)<=CHURRO_DRAW_RADIUS;
function emit(s,p){
 const c=s.craft,r=Math.hypot(p.x,p.z);if(!Number.isFinite(r))return;
 const q=r>CHURRO_DRAW_RADIUS?{x:p.x*CHURRO_DRAW_RADIUS/r,z:p.z*CHURRO_DRAW_RADIUS/r}:p,last=c.path.at(-1),d=Math.hypot(q.x-last.x,q.z-last.z);if(d<.015)return;
 const n=Math.ceil(d/.055);for(let i=1;i<=n;i++)c.path.push({x:last.x+(q.x-last.x)*i/n,z:last.z+(q.z-last.z)*i/n,born:c.clock,a:s.heat[0],b:s.heat[1],core:s.core});
 c.length+=d;c.revision++;compactChurro(c);
}
export function churroGesture(s,type,p){
 const c=s.craft;if(s.paused||!['prep','fry'].includes(s.stage)||c.ready)return false;
 if(type==='down'){
  if(c.mode==='template'||c.used||!inPan(p))return false;c.used=true;c.path=[{x:p.x,z:p.z,born:c.clock,a:s.heat[0],b:s.heat[1],core:s.core}];c.drawing=true;c.drag={...p};c.lastMove=c.clock;c.revision++;return true;
 }
 if(type==='move'&&c.drawing){emit(s,p);const r=Math.hypot(p.x,p.z);if(Number.isFinite(r)){c.drag=r>CHURRO_DRAW_RADIUS?{x:p.x*CHURRO_DRAW_RADIUS/r,z:p.z*CHURRO_DRAW_RADIUS/r}:{...p};c.lastMove=c.clock;}return true;}
 if(type==='up'||type==='cancel'){
  if(!c.drawing)return false;
  if(c.path.length===1){const q=c.path[0];emit(s,{x:q.x*.97+.04,z:q.z*.97});}
  c.drawing=false;c.drag=null;c.ready=true;c.revision++;s.prep=1;return true;
 }
 return c.drawing;
}
export function advanceChurro(s,dt){
 const c=s.craft;c.clock+=dt;
 // Holding still continues feeding a small coil beneath the nozzle.
 if(c.drawing&&c.drag&&c.clock-c.lastMove>.08){c.feed+=dt;if(c.feed>=.055){c.feed=0;const a=(c.clock-c.lastMove)*5;emit(s,{x:c.drag.x+.08*Math.sin(a),z:c.drag.z+.08*(1-Math.cos(a))});}}
 if(s.stage==='prep'&&c.path.length>1&&c.clock-c.path[0].born>=FALL_TIME){s.stage='fry';s.oil-=3;c.justDropped=true;}
}
export function churroFall(age){return .30*Math.max(0,1-(Math.max(0,age)/FALL_TIME)**2);}

// Same ridged mesh and heating history in both modes. No score bonus for a template.
export function churroTemplate(name){
 const path=[],push=(x,z)=>path.push({x,z});
 if(name==='heart')for(let i=0;i<=160;i++){const t=i/160*Math.PI*2;push(.145*16*Math.sin(t)**3,-.145*(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t)));}
 else if(name==='star'){
  const corners=Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,r=i%2?1.05:2.45;return {x:Math.cos(a)*r,z:Math.sin(a)*r};});
  // Quadratic rounded corners keep the star's points without sharp tube joins.
  for(let i=0;i<10;i++){const a=corners[(i+9)%10],b=corners[i],c=corners[(i+1)%10];for(let j=0;j<16;j++){const t=j/16,u=1-t;push(u*u*(a.x+b.x)/2+2*u*t*b.x+t*t*(b.x+c.x)/2,u*u*(a.z+b.z)/2+2*u*t*b.z+t*t*(b.z+c.z)/2);}}path.push({...path[0]});
 }else if(name==='spiral')for(let i=0;i<=200;i++){const t=i/200,a=t*Math.PI*5,r=.25+2.25*t;push(Math.cos(a)*r,Math.sin(a)*r);}
 else if(name==='ribbon'){
  const anchors=[[-1.5,1.8],[-.7,.85],[0,0],[-1.65,-1.35],[-2.2,-.35],[0,0],[1.65,-1.35],[2.2,-.35],[0,0],[.7,.85],[1.5,1.8]];
  for(let i=0;i<anchors.length-1;i++){const a=anchors[Math.max(0,i-1)],b=anchors[i],c=anchors[i+1],d=anchors[Math.min(anchors.length-1,i+2)];for(let j=0;j<18;j++){const t=j/18;const v=k=>.5*((2*b[k])+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t*t+(-a[k]+3*b[k]-3*c[k]+d[k])*t*t*t);push(v(0),v(1));}}push(...anchors.at(-1));
 }return path;
}
export function applyChurroTemplate(s,name){
 const c=s.craft;if(s.id!=='churros'||s.stage!=='prep'||s.paused||c.used)return false;
 const path=fitTemplate(churroTemplate(name));if(path.length<2)return false;
 c.mode='template';c.template=name;c.path=path.map(p=>({...p,born:c.clock-FALL_TIME,a:s.heat[0],b:s.heat[1],core:s.core}));
 c.length=path.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-path[i].x,p.z-path[i].z),0);c.used=c.ready=true;c.drawing=false;c.drag=null;c.revision++;s.prep=1;s.stage='fry';s.oil-=3;return true;
}
