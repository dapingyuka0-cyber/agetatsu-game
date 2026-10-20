import {BLAST_WINDUP,BLAST_DURATION} from './comedy.js';
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};

// Pixel-based recoil cannot disappear when the 3D camera fits a different dish.
// Only the canvas moves; labels, controls and the glass remain screen anchored.
export function impactState(age,width=390,reduced=false,windup=BLAST_WINDUP,duration=BLAST_DURATION){
 const t=age-windup,active=t>=0&&age<duration;
 const envelope=active&&t<.48&&!reduced?(1-t/.48)**2:0;
 const amplitude=Math.min(20,width*.045)*envelope;
 return {x:Math.cos(t*Math.PI*11)*amplitude,y:-Math.cos(t*Math.PI*9)*amplitude*.65,
  roll:Math.cos(t*Math.PI*11)*.85*envelope,scale:1+(active&&!reduced?.11*(1-ease(.30,.55,t)):0),
  crack:active&&t<2.65,progress:reduced?1:ease(.01,.19,t),opacity:active?(.78*(reduced?ease(0,.15,t):1)*(1-ease(1.25,2.65,t))):0};
}

// Radial fracture network: main fissures, branching hairlines and short bridges.
// Drawn as paths, without filled polygons, flying shards or a flashing background.
export function fracturePaths(){
 const paths=[],spokes=[];const point=(a,r,j)=>[500+Math.cos(a)*r+j,510+Math.sin(a)*r-j*.55];
 for(let i=0;i<13;i++){
  const a=i*Math.PI*2/13+.13*Math.sin(i*4.1),points=[[500,510]];
  for(let j=1;j<=5;j++)points.push(point(a+.035*Math.sin(i+j*3),j*145,(Math.sin(i*5+j*2.7))*18));
  spokes.push(points);paths.push({points,delay:i%3*.018,thin:false});
  for(const j of [2,3]){const start=points[j],b=a+(j===2?.38:-.32);paths.push({points:[start,[start[0]+Math.cos(b)*70,start[1]+Math.sin(b)*70],[start[0]+Math.cos(b+.16)*160,start[1]+Math.sin(b+.16)*160]],delay:.42+(j-2)*.2,thin:true});}
 }
 for(let i=0;i<13;i+=2){const a=spokes[i][2],b=spokes[(i+1)%13][2];paths.push({points:[a,[(a[0]+b[0])*.5+12,(a[1]+b[1])*.5-9],b],delay:.48,thin:true});}
 return paths;
}
export function makeBlastScreen(canvas){
 const media=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
 let svg=null,paths=[],moving=false;
 const clear=()=>{svg?.remove();svg=null;paths=[];if(moving){canvas.style.transform='';canvas.style.willChange='';moving=false;}};
 return {clear,update(event){
  if(event?.type!=='blast'){clear();return;}
  const state=impactState(event.age,canvas.clientWidth||390,!!media?.matches,event.windup??BLAST_WINDUP,event.duration??BLAST_DURATION);
  if(state.scale!==1||state.x||state.y){canvas.style.willChange='transform';canvas.style.transform=`translate3d(${state.x}px,${state.y}px,0) rotate(${state.roll}deg) scale(${state.scale})`;moving=true;}
  else if(moving){canvas.style.transform='';canvas.style.willChange='';moving=false;}
  if(!state.crack){svg?.remove();svg=null;paths=[];return;}
  if(!svg){
   const ns='http://www.w3.org/2000/svg';svg=document.createElementNS(ns,'svg');svg.id='blastGlass';svg.setAttribute('viewBox','0 0 1000 1000');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
   for(const line of fracturePaths()){
    const d=line.points.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');
    for(const shadow of [true,false]){const p=document.createElementNS(ns,'path');p.setAttribute('d',d);p.setAttribute('pathLength','1');p.setAttribute('fill','none');p.setAttribute('stroke',shadow?'#3d3c39':'#c2c7c3');p.setAttribute('stroke-width',String(shadow?(line.thin?3:6):(line.thin?1:2)));p.setAttribute('stroke-linecap','round');p.setAttribute('stroke-linejoin','round');p.setAttribute('stroke-dasharray','1');if(!shadow)p.setAttribute('transform','translate(-1,-1)');svg.append(p);paths.push({node:p,delay:line.delay});}
   }
   canvas.parentElement.append(svg);
  }
  svg.style.opacity=String(state.opacity);
  for(const {node,delay} of paths)node.setAttribute('stroke-dashoffset',String(1-clamp((state.progress-delay)/(1-delay))));
 }};
}
