import {cookingLook} from './cooking-look.js';
import {advanceChurro} from './churro-flow.js';
import {isCraft,newCraft} from './craft.js';
/** Stylized cooking simulation. Seconds are game seconds, not cooking advice. */
export const RECIPES={
 shrimp:{name:'エビフライ',sub:'薄衣の中に、ぷりっとした身。',temp:175,time:16,coreRate:1.32,coat:'細かなパン粉',inside:'#fff0dc'},
 pork:{name:'トンカツ',sub:'厚みのある肉と、ざくざくの衣。',temp:170,time:24,coreRate:.94,coat:'粗めのパン粉',inside:'#e8cbb3'},
 pumpkin:{name:'かぼちゃコロッケ',sub:'ほくほくの甘さを、黄金色の衣に。',temp:170,time:19,coreRate:1.25,coat:'軽やかなパン粉',inside:'#eea021'},
 potato:{name:'ポテトコロッケ',temp:170,time:18,coreRate:1.25,inside:'#f3dfaa'},
 gyoza:{name:'揚げ餃子',temp:170,time:20,coreRate:1.2,inside:'#bd8d79',quantity:1},
 onion:{name:'オニオンリング',temp:175,time:15,coreRate:1.25,inside:'#eee0b4',quantity:1},
 chicken:{name:'鶏の唐揚げ',temp:175,time:22,coreRate:1.16,inside:'#e6c1a0',quantity:3},
 churros:{name:'チュロス',temp:175,time:16,coreRate:1.3,inside:'#e5bd68',quantity:1},
 bread:{name:'揚げパン',temp:170,time:12,coreRate:1.3,inside:'#f3dfb7'}
};
for(const [id,r] of Object.entries(RECIPES)){r.steps=id==='gyoza'?['具をのせる','皮を折る','ひだを作る']:id==='churros'?['生地を絞る']:id==='chicken'?['下味','片栗粉']:id==='onion'?['小麦粉','衣液']:['fries','bread'].includes(id)?[]:['小麦粉','卵','パン粉'];r.quantity??=1;}
// Decision windows differ by food; quick foods remain short, batches reward individual management.
const skills={shrimp:['かんたん',28,6],pork:['むずかしい',38,4],pumpkin:['かんたん',32,7],potato:['ふつう',30,5],gyoza:['むずかしい',32,5],onion:['ふつう',25,5],chicken:['むずかしい',34,4],churros:['むずかしい',26,6],bread:['やさしい',24,8]};
const beginnerFoods=new Set(['shrimp','pumpkin','bread']);
export const gentleFoods=new Set(['pumpkin','potato','shrimp','bread','onion']);
// Only the displayed easy/normal dishes get the tighter, color-led 100-point window.
const balancedFoods=new Set(['pumpkin','potato','shrimp','onion']);
for(const [id,[difficulty,time,tolerance]] of Object.entries(skills))Object.assign(RECIPES[id],{difficulty,time,tolerance});
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export function fresh(id='shrimp',thickness=1){return {id,craft:isCraft(id)?newCraft(id):null,thickness,panX:0,panZ:0,lastFlip:-100,lastBaste:-100,preciseTime:0,temperatureTime:0,goodFlip:false,goodTool:false,stage:'prep',prep:0,coating:0,oil:175,target:175,time:0,sideSeconds:[0,0],core:0,heat:[0,0],side:0,flips:0,absorb:0,damage:0,drain:0,rupture:false,paused:false,checking:false,baste:0,agitation:0,toolCooldown:0,moves:0,stirs:0,sugar:0,toppings:{sugar:0,cocoa:0,kinako:0,matcha:0}};}
export function advance(s,dt){
 if(s.paused)return;
 if(s.id==='churros')advanceChurro(s,dt);
 s.oil+=(s.target-s.oil)*(1-Math.exp(-dt*.24));
 const recipe=RECIPES[s.id];
 if(!s.prepWork)s.prepBusy=Math.max(0,(s.prepBusy||0)-dt);
 s.toolCooldown=Math.max(0,s.toolCooldown-dt);s.baste=Math.max(0,s.baste-dt);s.agitation=Math.max(0,s.agitation-dt);
 const coatTarget=!isCraft(s.id)&&recipe.steps.length?(s.prep-(s.prepWork?1-s.prepWork.progress:0))/recipe.steps.length*3:0;
 s.coating+=(coatTarget-s.coating)*(1-Math.exp(-dt*3));
 if(s.stage==='fry'){
  const r=RECIPES[s.id];
  const positionHeat=1.08-.24*Math.min(1,Math.hypot(s.panX||0,s.panZ||0)/.65);
  const tempFactor=Math.exp((s.oil-r.temp)/35)*positionHeat;
  if(s.checking)return;
  s.time+=dt;s.sideSeconds[s.side]+=dt;s.temperatureTime=(s.temperatureTime||0)+dt;if(Math.abs(s.oil-r.temp)<=r.tolerance)s.preciseTime=(s.preciseTime||0)+dt;
  const h=dt/r.time*tempFactor;
  const spread=s.agitation>0?.32:0;
  s.heat[s.side]+=h*(1.65-spread); s.heat[1-s.side]+=h*(.35+spread+(s.baste>0?.8:0));
  if(beginnerFoods.has(s.id)){
   if(s.browningGrace===undefined&&Math.max(...s.heat)>=1.18)s.browningGrace=0;
   const graceSeconds=s.id==='bread'?20:30;
   if(s.browningGrace!==undefined&&s.browningGrace<graceSeconds){s.browningGrace+=dt;s.heat[0]=Math.min(s.heat[0],1.18);s.heat[1]=Math.min(s.heat[1],1.18);}
  }
  s.core+=dt/r.time*r.coreRate*(s.baste>0?1.12:1)*Math.max(.30,(s.oil-100)/70)/(s.thickness**1.65);
  s.absorb+=s.id==='pumpkin'?dt*.0001:dt*3*(s.oil<158?(158-s.oil)/350:.0005);
  const look=cookingLook(s);
  if(!s.zeroReason){if(look.visiblyBlack)s.zeroReason='black';else if(s.time>=70)s.zeroReason='time';}
  const pumpkinOverheated=s.id==='pumpkin'&&look.blackened;
  if(pumpkinOverheated&&s.pumpkinLeakSince===undefined)s.pumpkinLeakSince=s.time;
  // Predict the old black-shell leak point at the present heat rate, then
  // Start the potato-only leak about ten seconds before the old black-shell
  // threshold (five seconds later than the previous fifteen-second lead).
  const potatoSoon=s.id==='potato'&&cookingLook({...s,heat:s.heat.map((v,i)=>v+10*tempFactor/r.time*(i===s.side?1.65-spread:.35+spread+(s.baste>0?.8:0)))}).blackened;
  if((s.id==='potato'&&(potatoSoon||look.blackened))||(pumpkinOverheated&&s.time-s.pumpkinLeakSince>=10)){s.rupture=true;s.damage=clamp(s.damage+dt*.072);}
  if(s.flips>4&&s.time<15)s.damage=clamp(s.damage+dt*.008);
 } else if(s.stage==='drain'){s.drain+=dt;s.absorb=Math.max(0,s.absorb-dt*.025);}
}
export function action(s,a){
 if(s.id==='churros'&&s.craft.drawing&&['flip','lift','check','move','baste','stir','drop'].includes(a))return false;
 if(a==='prep'&&!isCraft(s.id)&&s.stage==='prep'&&s.prep<RECIPES[s.id].steps.length&&(!s.individual||!s.prepBusy)){s.prep++;s.prepBusy=s.individual?1.35:0;if(s.individual)s.prepWork=RECIPES[s.id].steps[s.prep-1]==='パン粉'?null:{zones:[0,0,0,0],progress:0,last:null};return true;}
 if(a==='drop'&&(!isCraft(s.id)||s.craft.ready)&&s.stage==='prep'&&s.prep===RECIPES[s.id].steps.length&&(!s.individual||!s.prepBusy)){s.stage='fry';s.oil-=s.individual?3:7+Math.sqrt(RECIPES[s.id].quantity)*2;return true;}
 if(a==='flip'&&s.stage==='fry'&&!s.paused&&s.time-(s.lastFlip??-100)>=1.2){const face=cookingLook(s).faces;if(face[s.side].heat>=(s.id==='pumpkin'?.55:.65)&&face[s.side].heat<=(s.id==='pumpkin'?1.35:1.25)&&face[s.side].heat-face[1-s.side].heat>(s.id==='pumpkin'?.18:.22))s.goodFlip=true;s.lastFlip=s.time;s.side=1-s.side;s.flips++;return true;}
 if(a==='lift'&&s.stage==='fry'){s.checking=false;s.stage='drain';return true;}
 if(a==='plate'&&s.stage==='drain'){s.stage='plate';return true;}
 if(['sugar','cocoa','kinako','matcha'].includes(a)&&s.stage==='plate'&&s.id==='bread'){s.toppings[a]++;s.sugar=s.toppings.sugar;return true;}
 if(s.stage==='fry'&&!s.paused){
  if(a==='check'){s.checking=!s.checking;return true;}
  if(!s.checking&&s.toolCooldown===0){
   if(a==='move'){const face=cookingLook(s).faces;if(Math.abs(s.oil-RECIPES[s.id].temp)>4||Math.abs(face[0].heat-face[1].heat)>.3)s.goodTool=true;s.agitation=2;s.moves++;const slots=[[.45,.2],[-.35,.35],[-.4,-.3],[0,0]];[s.panX,s.panZ]=slots[(s.moves-1)%4];s.toolCooldown=1.2;return true;}
   if(a==='baste'&&s.time-(s.lastBaste??-100)>=4){const f=cookingLook(s).faces;if(f[s.side].heat-f[1-s.side].heat>.22)s.goodTool=true;s.lastBaste=s.time;s.baste=2;s.toolCooldown=1.2;return true;}
   if(a==='stir'&&RECIPES[s.id].quantity>1){s.agitation=3;s.stirs++;s.side=1-s.side;s.flips++;s.toolCooldown=.6;return true;}
  }
 }
 return false;
}
export function grade(s){
 if(s.awardedGrade)return s.awardedGrade;
 const look=cookingLook(s),{pale,scoreBurn:burn,uneven,core}=look;
 // Onion rings can look deeply burnt before the shared gauge reaches its burn zone.
 const onionDarkBrown=s.id==='onion'&&Math.max(...look.faces.map(face=>face.burn))>=.75;
 const undercookedTime=s.id==='bread'?(!s.sideSeconds||s.sideSeconds.reduce((total,seconds)=>total+seconds,0)<10):(!s.sideSeconds||s.sideSeconds.some(seconds=>seconds<10));
 const zeroReason=s.exploded?'explosion':s.zeroReason|| (look.visiblyBlack?'black':s.time>=70?'time':undercookedTime?'raw':null);
 if(zeroReason)return {score:0,zeroReason,rows:['揚げ色','火の通り','衣の仕上がり','揚げムラ','食材の状態'].map(name=>({name,value:0,max:20})),tips:[{explosion:'炭になって大爆発！次の一皿に期待。',black:'真っ黒焦げです。',time:'70秒以上揚げました。',raw:'もっと焼こう！'}[zeroReason]],look};
 const black=look.scoreBurnt?look.black:0,dryness=look.scoreBurnt?look.dryness:0;
 const paleSide=Math.max(...look.faces.map(face=>face.pale));
 const bothSidesCooked=paleSide<=.10;
 const values=[
  (1-pale)*(1-burn*.8)*(1-black),
  clamp(1-Math.max(0,.92-core)*1.65-dryness*.4)*(1-black),
  clamp(1-s.absorb-s.damage*.65-(s.drain<3?.08:0)-burn*.25)*clamp(look.meanHeat/.65)*(1-black*.9),
  clamp(1-uneven*(s.id==='pumpkin'?.25:.65))*(1-black*.8),
  clamp(1-s.damage-burn*.3)*clamp(core/.8)*(1-black*.9)
 ];
 const beginner=beginnerFoods.has(s.id);
 const chicken=s.id==='chicken';
 if(beginner&&!look.scoreBurnt){
  values[2]=clamp(1-s.damage*.65-burn*.25)*clamp(look.meanHeat/.65)*(1-black*.9);
  values[3]=1;
  for(let i=0;i<values.length;i++)values[i]=clamp(values[i]+.35);
 }
 const weights=s.id==='pork'?[16,24,16,12,12]:s.id==='pumpkin'?[16,16,16,12,20]:[20,20,16,12,12];
 const rows=['揚げ色','火の通り','衣の仕上がり','揚げムラ','食材の状態'].map((name,i)=>({name,value:Math.round(values[i]*weights[i]),max:weights[i]}));
 // Pumpkin alone allows a slightly wider handling window; doneness and burn stay visual.
 const forgiving=s.id==='pumpkin';
 const balanceTolerance=forgiving?.45:chicken?.42:.35;
 const tempPrecision=s.temperatureTime?clamp(s.preciseTime/s.temperatureTime):0;
 const surfacePrecision=clamp(1-Math.abs(look.faces[0].heat-look.faces[1].heat)/balanceTolerance);
 const technique=beginner&&!look.scoreBurnt?1:(beginner?1:forgiving?clamp(.65+.35*(s.goodFlip?1:0)):chicken?clamp(.28*tempPrecision+.47*surfacePrecision+.25*(s.goodFlip||s.goodTool?1:0)):clamp(.25*tempPrecision+.45*surfacePrecision+.3*(s.goodFlip||s.goodTool?1:0)))*(1-burn)*(1-black);
 rows.push({name:'調理の丁寧さ',value:Math.round(20*technique),max:20});
 // A golden shell cannot hide an undercooked centre in either rank or total.
 const total=rows.reduce((a,b)=>a+b.value,0),limit=core<.5?49:core<.92?79:100;
 if(total>limit){const ratio=limit/total;for(const row of rows)row.value=Math.floor(row.value*ratio);}
 const recipe=RECIPES[s.id],steps=recipe.steps.length,precision=tempPrecision,sides=surfacePrecision;
 const dishOperation=({onion:()=>s.stirs>0,chicken:()=>s.stirs>0,pumpkin:()=>!s.rupture,potato:()=>!s.rupture,pork:()=>s.thickness>=.8,gyoza:()=>Boolean(s.craft?.ready),churros:()=>Boolean(s.craft?.ready),bread:()=>true,shrimp:()=>true})[s.id]||(()=>true);
 const highSkill=(beginner?s.flips<=5:s.goodFlip&&(forgiving||s.goodTool))&&dishOperation()&&(!steps||s.prep===steps);
 const chickenSkill=chicken&&(s.goodFlip||s.goodTool)&&dishOperation()&&(!steps||s.prep===steps);
 let raw=rows.reduce((a,b)=>a+b.value,0);
 const coreLimit=core<.5?49:core<.92?79:100;
 if(raw>coreLimit){const ratio=coreLimit/raw;for(const row of rows)row.value=Math.floor(row.value*ratio);}
 raw=rows.reduce((a,b)=>a+b.value,0);
 const tierScore=raw<=70?raw:raw<=85?70+(raw-70)*.6:raw<=92?79+(raw-85)*(10/7):raw<=97?89+(raw-92):raw<100?94+(raw-97)*2:99;
 let score=Math.min(99,Math.round(tierScore));
 // Crossing into the high-score tiers requires both a well-timed turn and a useful, food-specific tool action.
 if(score>=80&&!highSkill){if(chickenSkill)score=Math.min(89,Math.round(80+9*clamp((tierScore-70)/29)));else score=Math.min(79,Math.round(70+9*clamp((tierScore-70)/29)-6*look.burn-5*look.uneven));}
 if(score>=90&&(!beginner&&!forgiving&&(precision<(chicken?.70:.78)||sides<(chicken?.65:.72))||chicken&&!highSkill||s.flips>(beginner?5:3)))score=Math.min(89,Math.round(80+9*clamp((tierScore-80)/19)));
 if(score>=95&&(!beginner&&!forgiving&&(precision<(chicken?.88:.94)||sides<(chicken?.82:.90)||look.uneven>(chicken?.14:.1))||raw<98||look.underdone||look.scoreBurnt||s.damage>(beginner?.12:.015)||!beginner&&s.absorb>.025))score=Math.min(94,Math.round(90+4*clamp((tierScore-90)/9)));
 const perfectSkill=chicken?s.goodFlip&&s.goodTool&&dishOperation()&&(!steps||s.prep===steps):highSkill;
 const perfect=raw===100&&bothSidesCooked&&(beginner||forgiving||(precision>=.995&&sides>=.98))&&perfectSkill&&(beginner||forgiving?s.flips<=(beginner?5:3):s.flips===1)&&s.drain>=(beginner?1:4)&&!look.underdone&&!look.scoreBurnt&&look.pale<(beginner?.35:.025)&&(beginner||forgiving||look.uneven<.025)&&s.damage<(beginner?.12:.005)&&(beginner||s.absorb<.01);
 if(perfect)score=100;
 // These five dishes reward a cooked centre and an appetizing shell all the way
 // through dark brown. The shared color ramp still penalizes genuinely black food.
 const balanced=balancedFoods.has(s.id);
 const heatFloor=s.id==='pumpkin'?.93:beginner?1.00:1.08,heatCeiling=beginner?1.45:1.55;
 const idealColor=look.faces.every(face=>face.heat>=heatFloor&&face.heat<=heatCeiling);
 const evenEnough=Math.abs(look.faces[0].heat-look.faces[1].heat)<=(beginner?.30:.25);
 const preciseFinish=idealColor&&evenEnough&&s.flips>=1&&s.flips<=(beginner?3:2)&&!s.rupture&&s.damage<=(beginner?.12:.08);
 const easyPerfect=gentleFoods.has(s.id)&&s.prep===steps&&core>=.92&&bothSidesCooked&&!look.scoreBurnt&&!s.exploded&&(!balanced||preciseFinish);
 // Preserve accessible 70–80s; above 80, the same mistakes cost about 1.2x more.
 if(balanced&&score>80&&score<100)score=80+Math.round((score-80)/1.2);
 if(easyPerfect){score=100;for(const row of rows)row.value=row.max;}
 if(balanced&&!easyPerfect)score=Math.min(score,idealColor?99:look.faces.some(face=>face.heat>heatCeiling)?89:94);
 if(paleSide>.35)score=Math.min(score,79);
 if(onionDarkBrown)score=Math.min(score,50);
 // Churros alone: 1.4x normal deductions; keep perfect and forced-zero outcomes.
 if(s.id==='churros'&&score>0&&score<100)score=Math.max(0,Math.round(100-(100-score)*1.4));
 // Keep the visible row totals in sync with the final awarded score.
 const rowTotal=rows.reduce((a,b)=>a+b.value,0);
 if(rowTotal!==score&&rowTotal>0){const scaled=rows.map(row=>row.value*score/rowTotal),floors=scaled.map(Math.floor);let remain=score-floors.reduce((a,b)=>a+b,0);const order=scaled.map((v,i)=>[v-floors[i],i]).sort((a,b)=>b[0]-a[0]);for(let i=0;i<order.length&&remain>0;i++,remain--)floors[order[i][1]]++;rows.forEach((row,i)=>row.value=floors[i]);}
 const tips=[];if(!highSkill&&!easyPerfect)tips.push(beginner?'色づいたら一度返して、表裏を見ながら仕上げよう。':s.id==='onion'||s.id==='chicken'?'揚げムラを減らすため、返すタイミングを合わせて一度かき混ぜよう。':'適温を保ち、色を見て返す。トングで位置も整えると高得点に。');
 else if(!easyPerfect&&!beginner&&!forgiving&&precision<.78)tips.push('油温を食材の目安に合わせて保とう。');
 if(look.scoreBurnt&&look.blackened)tips.push('真っ黒に焦げています。次はきつね色で取り出そう。');
 else if(look.scoreBurnt)tips.push('焦げの領域に入りました。少し早めに取り出そう。');
 else if(onionDarkBrown)tips.push('オニオンリングの衣が濃い焦げ茶色です。次は少し早めに取り出そう。');
 else if(!easyPerfect&&score<100&&look.burn>.25)tips.push('衣の色が濃くなりました。次は少し早めに取り出そう。');
 else if(pale>.35)tips.push('まだ淡い揚げ色。もう少し揚げると香ばしくなります。');
 else tips.push('香ばしいきつね色に仕上がりました。');
 if(look.underdone)tips.push('中心まで火が足りません。表面の色だけでなく中も確認しよう。');
 else if(paleSide>.35)tips.push('片面がまだ白っぽい。ひっくり返してから仕上げよう。');
 else if(look.scoreBurnt&&dryness>.25&&!easyPerfect)tips.push('焦げとともに水分が抜け、少しパサついています。');
 else if(!easyPerfect&&!beginner&&!forgiving&&sides<.72)tips.push('表裏の色をそろえるタイミングで返そう。');
 else tips.push('中心までほどよく火が入りました。');
 if(!gentleFoods.has(s.id)&&uneven>.45)tips.push('表裏に色の差があります。途中でひっくり返してみよう。');
 if(s.rupture&&!easyPerfect)tips.push('衣が割れて、中身がこぼれました。');
 if(!beginner&&s.absorb>.25&&!easyPerfect)tips.push('低い温度で衣が油を吸っています。');
 if(s.drain<3&&!easyPerfect)tips.push('少し油を切ると、軽い仕上がりに。');
 return {score,rows,tips,look,quality:tierScore-6*look.burn-5*look.uneven};
}

// Fix a piece's score when its result is first awarded. Only a genuine tie
// between pieces in this batch moves a non-perfect score by the fewest points.
export function awardGrade(s,pieces=[s]){
 if(s.awardedGrade)return s.awardedGrade;
 const result=grade(s);
 if(result.score>0&&result.score<100&&pieces.length>1){
  const awarded=pieces.filter(p=>p!==s&&p.awardedGrade?.score>0&&p.awardedGrade.score<100);
  const used=new Set(awarded.map(p=>p.awardedGrade.score));
  if(used.has(result.score)){
   const original=result.score;
   let lower=original-1,upper=original+1;
   while(lower>=1&&used.has(lower))lower--;
   while(upper<=99&&used.has(upper))upper++;
   // A tie-break must never cross the food's existing upper scoring tier.
   const tierTop=Math.min(original<=50?50:original<=79?79:original<=89?89:original<=94?94:99,result.look.core<.5?49:result.look.core<.92?79:99);
   const betterThanTied=awarded.filter(p=>p.awardedGrade.score===original).every(p=>result.quality>p.awardedGrade.quality);
   result.score=betterThanTied&&upper<=tierTop?upper:lower>=1?lower:upper<=tierTop?upper:original;
   if(result.score!==original){
    const factor=result.score/original,scaled=result.rows.map(row=>row.value*factor),values=scaled.map(Math.floor);
    let remaining=result.score-values.reduce((sum,n)=>sum+n,0);
    for(const i of scaled.map((value,i)=>({i,remainder:value-values[i]})).sort((a,b)=>b.remainder-a.remainder).map(x=>x.i)){if(!remaining)break;values[i]++;remaining--;}
    result.rows.forEach((row,i)=>row.value=values[i]);
   }
  }
 }
 s.awardedGrade=result;
 return result;
}
