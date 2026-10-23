// Four surface regions, no repeated taps or elapsed-time requirement.
export function prepGesture(s,type,p){
 const w=s.prepWork;if(!w||s.paused||s.stage!=='prep')return false;
 if(type==='up'||type==='cancel'){w.last=null;return true;}
 // Keep the gesture active when a finger starts beside the ingredient and
 // enters it; that initial miss must not turn the gesture into camera rotation.
 if(!Number.isFinite(p.x)||!Number.isFinite(p.z)||Math.abs(p.x)>1.5||Math.abs(p.z)>.9){w.last=null;return true;}
 if(type==='down'){w.last=p;return true;}
 if(type==='move'&&!w.last){w.last=p;return true;}
 if(type==='move'&&w.last){const d=Math.min(.2,Math.hypot(p.x-w.last.x,p.z-w.last.z));w.last=p;const i=(p.x>0?1:0)+(p.z>0?2:0);w.zones[i]=Math.min(1,w.zones[i]+d*2.5);w.progress=w.zones.reduce((a,b)=>a+b,0)/4;s.prepBusy=1.35*(1-w.progress);if(w.progress>=.999){s.prepWork=null;s.prepBusy=0;}return true;}
 return false;
}
