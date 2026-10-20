// Shared palette thresholds: rendering and judgement use the same heat ramps.
// Spatial noise remains in the material; sampling estimates visible coverage,
// rather than reading pixels or adding GPU work.
export const FOOD_RAMP={goldStart:.12,goldFull:1.03,brownStart:1.15,brownFull:1.95,blackStart:1.95,blackFull:2.85};
export const CRAFT_RAMP={goldStart:.1,goldFull:1.1,blackStart:1.35,blackFull:2.7};
const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
export function cookingLook(s){
 const craft=s.id==='churros'||s.id==='gyoza',r=craft?CRAFT_RAMP:FOOD_RAMP;
 const knots=s.id==='churros'&&s.craft?.path?.length>1?s.craft.path:null;
 const count=knots?Math.min(48,knots.length):1,faces=[{pale:0,burn:0,black:0,heat:0},{pale:0,burn:0,black:0,heat:0}];let core=0;
 for(let i=0;i<count;i++){
  const p=knots?.[Math.round(i*(knots.length-1)/Math.max(1,count-1))];core+=Math.max(0,s.core-(p?.core||0))/count;
  for(let side=0;side<2;side++){
   const heat=Math.max(0,s.heat[side]-(side===0?p?.a||0:p?.b||0)),face=faces[side];face.heat+=heat/count;
   for(const variation of [.90,.97,1.04,1.11]){
    const h=heat*variation,char=smooth(r.blackStart,r.blackFull,h);
    const dark=craft?char:smooth(r.brownStart,r.brownFull,h);
    face.pale+=(1-smooth(.25,.85,h))/(count*4);
    face.burn+=smooth(craft?.45:.72,1,dark)/(count*4);
    face.black+=smooth(.55,.95,char)/(count*4);
   }
  }
 }
 const pale=(faces[0].pale+faces[1].pale)/2,burn=(faces[0].burn+faces[1].burn)/2,black=(faces[0].black+faces[1].black)/2;
 const burnt=Math.max(...faces.map(f=>f.burn))>.22,blackened=black>.65;
 // The score must catch one blackened side even when the other side is lighter.
 // `blackened` stays unchanged because the explosion uses that threshold.
 const visiblyBlack=faces.some(f=>f.black>=.4);
 const uneven=Math.max(Math.abs(faces[0].pale-faces[1].pale),Math.abs(faces[0].burn-faces[1].burn));
 const dryness=smooth(2.4,4,core)*burn;
 const face=faces[1-s.side],label=visiblyBlack?'黒焦げ':burnt?'焦げ茶色':pale>.35?'薄い揚げ色':face.heat>1.25?'濃いきつね色':'きつね色';
 const faceGauge=f=>f.heat<r.goldFull?45*clamp(f.heat/r.goldFull):45+55*clamp((f.heat-r.goldFull)/(r.blackFull-r.goldFull));
 const gauge=visiblyBlack?Math.max(...faces.map(faceGauge)):faceGauge(face);
 // Scoring starts only once a side has visibly entered the right-hand burn
 // region of the gauge. Keep `burn` untouched: explosion timing uses it.
 const scoreBurn=Math.max(...faces.map(f=>{
  return smooth(85,100,faceGauge(f));
 }));
 return {faces,pale,burn,black,burnt,blackened,visiblyBlack,scoreBurn,scoreBurnt:scoreBurn>.001,uneven,dryness,core,underdone:core<.92,label,gauge,meanHeat:(faces[0].heat+faces[1].heat)/2};
}
