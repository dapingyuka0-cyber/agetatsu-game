import {RECIPES} from './simulation.js';
/** All sound is synthesized locally. No audio fetch or decode can fail. */
export function sizzleSamples(length,rate=44100,random=Math.random){const data=new Float32Array(length);let pink=0,crackle=0;for(let i=0;i<length;i++){const white=random()*2-1;pink=.94*pink+.06*white;if(random()<.0018)crackle=.4+random()*.55;crackle*=.90;data[i]=Math.max(-1,Math.min(1,white*.27+pink*1.9+crackle*white));}return data;}
// Soft, crackle-free noise with a crossfaded seam: one continuous source per session.
export function doughSamples(length,rate=44100,random=Math.random){
 const fade=Math.min(Math.floor(rate*.18),Math.floor(length/4)),raw=new Float32Array(length+fade);let low=0;
 const a=1-Math.exp(-2*Math.PI*700/rate);
 for(let i=0;i<raw.length;i++){low+=a*((random()*2-1)-low);raw[i]=low*1.7;}
 const out=raw.slice(fade);
 for(let i=0;i<fade;i++){const t=i/(fade-1);out[length-fade+i]=raw[length+i]*(1-t)+raw[i]*t;}
 return out;
}
// A sharp broadband impact, dense bass/air body, inharmonic glass crack and rumble.
// All layers share one buffer/start time and the existing master volume/limiter.
export const BLAST_SOUND_SECONDS=5.6;
export function blastSamples(length,rate=44100,random=Math.random){
 const out=new Float32Array(length),duration=length/rate;let bass=0,air=0,snap=0,phase=0,peak=0;
 const bassA=1-Math.exp(-2*Math.PI*130/rate),airA=1-Math.exp(-2*Math.PI*740/rate),snapA=1-Math.exp(-2*Math.PI*2600/rate);
 for(let i=0;i<length;i++){
  const t=i/rate,white=random()*2-1;bass+=bassA*(white-bass);air+=airA*(white-air);snap+=snapA*(white-snap);
  phase+=2*Math.PI*(38+64*Math.exp(-t*20))/rate;
  const attack=1-Math.exp(-t*420),hit=attack*Math.exp(-t*13),crack=attack*Math.exp(-t*21);
  const body=(1-Math.exp(-t*60))*Math.exp(-t*2.8),rumble=(1-Math.exp(-t*8))*Math.exp(-t*1.15);
  const g=Math.max(0,t-.018),glassAttack=t<.018?0:1-Math.exp(-g*650);
  const glassModes=(Math.sin(g*2*Math.PI*937)+.65*Math.sin(g*2*Math.PI*1433)+.42*Math.sin(g*2*Math.PI*2137))*.035;
  const glass=glassAttack*Math.exp(-g*7.8)*((snap-air)*.52+glassModes)*(1+.2*Math.sin(g*91));
  const end=Math.min(1,(duration-t)/.4);
  out[i]=((snap-bass)*2.7*crack+(Math.sin(phase)*.58+Math.sin(phase*1.91)*.13)*hit+air*1.65*body+bass*2.65*rumble*(.85+.15*Math.sin(t*17))+glass)*end;
  peak=Math.max(peak,Math.abs(out[i]));
 }
 const gain=.79/Math.max(.79,peak);for(let i=0;i<length;i++)out[i]*=gain;
 return out;
}
export class KitchenAudio{
 constructor(){this.ctx=null;this.volume=.65;this.muted=false;this.error='';this.onState=()=>{};this.testUntil=0;}
 start(){
  try{
   // This runs synchronously in the click handler, before any await.
   if(typeof navigator!=='undefined'&&navigator.audioSession){try{navigator.audioSession.type='playback';}catch{}}
   if(!this.ctx||this.ctx.state==='closed'){
    const C=window.AudioContext||window.webkitAudioContext;if(!C)throw Error('このブラウザはWeb Audio非対応です');
    const c=this.ctx=new C({latencyHint:'interactive'});this.master=c.createGain();this.master.gain.value=this.muted?0:this.volume;
    this.limiter=c.createDynamicsCompressor();this.limiter.threshold.value=-10;this.limiter.knee.value=12;this.limiter.ratio.value=5;this.limiter.attack.value=.004;this.limiter.release.value=.15;this.master.connect(this.limiter).connect(c.destination);
    const buffer=this.buffer=c.createBuffer(1,c.sampleRate*8,c.sampleRate);buffer.copyToChannel(sizzleSamples(buffer.length,c.sampleRate),0);
    this.noise=c.createBufferSource();this.noise.buffer=buffer;this.noise.loop=true;this.filter=c.createBiquadFilter();this.filter.type='bandpass';this.filter.Q.value=.48;this.filter.frequency.value=2300;this.fry=c.createGain();this.fry.gain.value=0;this.noise.connect(this.filter).connect(this.fry).connect(this.master);this.noise.start();
    const dough=c.createBuffer(1,c.sampleRate*6,c.sampleRate);dough.copyToChannel(doughSamples(dough.length,c.sampleRate),0);
    this.doughSource=c.createBufferSource();this.doughSource.buffer=dough;this.doughSource.loop=true;
    this.doughFilter=c.createBiquadFilter();this.doughFilter.type='lowpass';this.doughFilter.frequency.value=420;this.doughFilter.Q.value=.65;
    this.doughGain=c.createGain();this.doughGain.gain.value=0;this.pipingActive=false;
    this.doughSource.connect(this.doughFilter).connect(this.doughGain).connect(this.master);this.doughSource.start();
    const blast=this.blastBuffer=c.createBuffer(1,Math.round(c.sampleRate*BLAST_SOUND_SECONDS),c.sampleRate);blast.copyToChannel(blastSamples(blast.length,c.sampleRate),0);
    c.onstatechange=()=>this.onState(this.status());
   }
   const c=this.ctx;
   // Safari unlock pulse scheduled on the same user gesture.
   const unlock=c.createBufferSource();unlock.buffer=c.createBuffer(1,1,c.sampleRate);unlock.connect(this.master);unlock.start();
   const resumed=c.state==='running'?Promise.resolve():c.resume();
   return resumed.then(()=>{if(c.state!=='running')throw Error('音声が中断されています。音声を再開してください');this.error='';this.set(this.volume,this.muted);this.onState(this.status());return true;}).catch(e=>{this.error=e.message;this.onState(this.status());throw e;});
  }catch(e){this.error=e.message;this.onState(this.status());return Promise.reject(e);}
 }
 status(){return this.error?'エラー：'+this.error:!this.ctx?'音声未開始':this.ctx.state==='running'?(this.muted?'ミュート中':this.volume===0?'音量0%':'音声エンジン動作中'):this.ctx.state==='closed'?'音声終了':'音声中断中：再開をタップ';}
 set(volume,muted){this.volume=Math.max(0,Math.min(1,volume));this.muted=Boolean(muted);if(this.master){this.master.gain.cancelScheduledValues(this.ctx.currentTime);this.master.gain.setTargetAtTime(this.muted?0:this.volume,this.ctx.currentTime,.025);}this.onState(this.status());}
 piping(active){
  if(!this.ctx||!this.doughGain)return;active=Boolean(active);const t=this.ctx.currentTime;
  if(active!==this.pipingActive){this.pipingActive=active;this.doughGain.gain.cancelScheduledValues(t);this.doughGain.gain.setTargetAtTime(active?.75:0,t,active?.055:.025);}
  if(active)this.doughFilter.frequency.setTargetAtTime(380+75*Math.sin(t*2.1)+35*Math.sin(t*3.7),t,.08);
 }
 update(s){if(!this.ctx)return;const c=this.ctx,testing=c.currentTime<this.testUntil,active=(s.stage==='fry'&&!s.paused&&!s.checking)||testing;
  const level=active?(.42+Math.max(0,1-s.time/((RECIPES[s.id]?.time||18)*2.8))*.20)*(1+Math.sin(c.currentTime*11)*.055+Math.sin(c.currentTime*17.3)*.035):0;
  const amount=.78+Math.sqrt(s.activeQuantity??RECIPES[s.id]?.quantity??1)*.18;
  const thermal=.80+Math.max(0,Math.min(60,s.oil-140))*.006,moisture=({squid:1.12,onion:1.08,chicken:1.10})[s.id]||1;
  this.fry.gain.setTargetAtTime(level*amount*thermal*moisture*(c.currentTime<(this.blastUntil||0)?.38:1),c.currentTime,.12);this.filter.frequency.setTargetAtTime(1400+(s.oil-140)*42,c.currentTime,.12);
 }
 test(){if(!this.ctx||this.ctx.state!=='running')return;this.testUntil=this.ctx.currentTime+2.5;this.effect('drop');this.effect('plate');}
 effect(type){type=({move:'flip',stir:'flip',baste:'drop',check:'lift',sugar:'prep',cocoa:'prep',kinako:'prep',matcha:'prep'})[type]||type;if(!this.ctx||this.ctx.state!=='running'||!this.buffer)return;const c=this.ctx,t=c.currentTime;
  if(type==='grow'||type==='grown'){
   const o=c.createOscillator(),g=c.createGain();o.type='sine';
   if(type==='grow'){o.frequency.setValueAtTime(185,t);o.frequency.exponentialRampToValueAtTime(530,t+2.25);g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(.13,t+.5);g.gain.setValueAtTime(.13,t+1.9);g.gain.exponentialRampToValueAtTime(.001,t+2.3);}
   else{o.frequency.setValueAtTime(180,t);o.frequency.exponentialRampToValueAtTime(330,t+.08);o.frequency.exponentialRampToValueAtTime(130,t+.42);g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(.25,t+.02);g.gain.exponentialRampToValueAtTime(.001,t+.44);}
   o.connect(g).connect(this.master);o.start(t);o.stop(t+(type==='grow'?2.31:.45));o.onended=()=>{o.disconnect();g.disconnect();};return;
  }
  const scoreMotifs={scoreClear:[659,784,880],scoreBright:[523,659,784,1047],scoreGrand:[523,659,784,988,1175],scoreFanfare:[523,659,784,988,784,988,1319],scorePerfect:[523,659,784,1047,1319,1047,1319,1568]};
  if(scoreMotifs[type]){const notes=scoreMotifs[type],spacing=type==='scoreClear'?.10:type==='scoreBright'?.085:.075;
   notes.forEach((freq,i)=>{const at=t+i*spacing,o=c.createOscillator(),g=c.createGain();o.type=type==='scorePerfect'&&i%3===0?'triangle':'sine';o.frequency.setValueAtTime(freq,at);o.frequency.exponentialRampToValueAtTime(freq*(i===notes.length-1?1.26:.98),at+.16);g.gain.setValueAtTime(.001,at);g.gain.linearRampToValueAtTime(.13,at+.008);g.gain.exponentialRampToValueAtTime(.001,at+.20);o.connect(g).connect(this.master);o.start(at);o.stop(at+.21);o.onended=()=>{o.disconnect();g.disconnect();};});return;
  }
  if(type==='boom'){
   if(t<(this.blastUntil||0))return;
   const duration=BLAST_SOUND_SECONDS;
   const source=c.createBufferSource(),gain=c.createGain();source.buffer=this.blastBuffer;gain.gain.value=1.08;this.blastUntil=t+duration;
   source.connect(gain).connect(this.master);source.start(t);source.stop(t+duration+.01);source.onended=()=>{source.disconnect();gain.disconnect();};return;
  }
  if(type==='crumbs'){
   const duration=1.3;
   const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();source.buffer=this.buffer;
   filter.type='bandpass';filter.Q.value=.45;
   filter.frequency.setValueAtTime(3800,t);filter.frequency.exponentialRampToValueAtTime(2200,t+duration);
   gain.gain.setValueAtTime(.001,t);gain.gain.linearRampToValueAtTime(.65,t+.10);
   gain.gain.linearRampToValueAtTime(.5,t+.85);
   gain.gain.exponentialRampToValueAtTime(.001,t+duration);
   source.connect(filter).connect(gain).connect(this.master);source.start(t,Math.random()*4);source.stop(t+duration+.02);
   source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
   return;
  }
  if(['prep','drop','lift','flip'].includes(type)){
   const source=c.createBufferSource();source.buffer=this.buffer;const f=c.createBiquadFilter();f.type=['drop','boom'].includes(type)?'lowpass':'highpass';f.frequency.value=type==='boom'?350:type==='drop'?6000:type==='prep'?2700:3500;const gain=c.createGain();const duration=type==='boom'?.65:type==='drop'?1.0:type==='lift'?.42:type==='prep'?.36:.17;
   gain.gain.setValueAtTime(.001,t);gain.gain.linearRampToValueAtTime(type==='drop'?1.4:.65,t+.012);gain.gain.exponentialRampToValueAtTime(.001,t+duration);source.connect(f).connect(gain).connect(this.master);source.start(t,Math.random()*5);source.stop(t+duration+.01);source.onended=()=>{source.disconnect();f.disconnect();gain.disconnect();};
  }
  if(['flip','lift','plate','fail','dance','grow'].includes(type)){const notes=type==='dance'?[330,440,294,523]:type==='grow'?[220,330,440]:type==='fail'?[392,294,196,147]:type==='plate'?[659,830,988]:[2400,3100];notes.forEach((freq,i)=>{const o=c.createOscillator(),g=c.createGain();o.type=type==='fail'?'triangle':'sine';o.frequency.setValueAtTime(freq,t+i*(type==='fail'?.16:.07));o.frequency.exponentialRampToValueAtTime(freq*.8,t+i*(type==='fail'?.16:.07)+.1);g.gain.setValueAtTime(.001,t+i*(type==='fail'?.16:.07));g.gain.linearRampToValueAtTime(type==='fail'?.32:type==='plate'?.22:.12,t+i*(type==='fail'?.16:.07)+.004);g.gain.exponentialRampToValueAtTime(.001,t+i*(type==='fail'?.16:.07)+(type==='fail'?.30:.20));o.connect(g).connect(this.master);o.start(t+i*(type==='fail'?.16:.07));o.stop(t+i*(type==='fail'?.16:.07)+(type==='fail'?.31:.21));o.onended=()=>{o.disconnect();g.disconnect();};});}
 }
}
