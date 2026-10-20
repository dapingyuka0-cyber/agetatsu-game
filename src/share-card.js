export const CARD_WIDTH=1080,CARD_HEIGHT=1350;
export const CARD_FONT='"AgeShareJP", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif';
export const HERO={x:24,y:211,width:1032,height:1032*760/1080};
function round(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}
function label(ctx,text,x,y,size,color='#4a2413',weight=700,maxWidth=940){
 ctx.font=`${weight} ${size}px ${CARD_FONT}`;while(ctx.measureText(text).width>maxWidth&&size>16){size--;ctx.font=`${weight} ${size}px ${CARD_FONT}`;}ctx.fillStyle=color;ctx.fillText(text,x,y);
}
function diamond(ctx,x,y,size,color){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,y-size);ctx.quadraticCurveTo(x+size*.18,y-size*.18,x+size,y);ctx.quadraticCurveTo(x+size*.18,y+size*.18,x,y+size);ctx.quadraticCurveTo(x-size*.18,y+size*.18,x-size,y);ctx.quadraticCurveTo(x-size*.18,y-size*.18,x,y-size);ctx.fill();}
function chefMark(ctx,x,y){ctx.save();ctx.translate(x,y);ctx.strokeStyle='#b66b29';ctx.lineWidth=4;ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(-20,16);ctx.lineTo(-22,-4);ctx.bezierCurveTo(-44,-10,-27,-36,-12,-24);ctx.bezierCurveTo(-8,-44,21,-41,19,-23);ctx.bezierCurveTo(41,-31,43,-7,22,-4);ctx.lineTo(20,16);ctx.closePath();ctx.stroke();ctx.beginPath();ctx.moveTo(-20,7);ctx.lineTo(20,7);ctx.stroke();ctx.restore();}
export function drawShareCard(canvas,data,hero){
 canvas.width=CARD_WIDTH;canvas.height=CARD_HEIGHT;const c=canvas.getContext('2d');if(!c)throw new Error('画像を描画できませんでした。');
 const perfect=data.score===100,high=data.score>=90,blast=data.exploded;
 const paper=c.createLinearGradient(0,0,1080,1350);paper.addColorStop(0,'#fff7e6');paper.addColorStop(.62,'#f8e5c4');paper.addColorStop(1,'#ffefd5');c.fillStyle=paper;c.fillRect(0,0,1080,1350);
 // Quiet paper grain. Deterministic so reopening a result gives the same artwork.
 for(let i=0;i<1500;i++){c.fillStyle=i%2?'#b9883910':'#ffffff30';c.fillRect((i*617.31)%1080,(i*271.73)%1350,1+(i%3),1);}
 c.textAlign='center';label(c,perfect?'すべてを極めた、会心の一皿。':blast?'揚げ物のはずが、まさかの結末。':'今日の一皿、できました。',540,32,22,'#90613b',600);
 chefMark(c,127,86);
 c.font=`900 88px ${CARD_FONT}`;c.lineJoin='round';c.lineWidth=10;c.strokeStyle='#fff9ed';c.strokeText('揚げ物の達人',554,119);c.fillStyle='#4b210e';c.fillText('揚げ物の達人',554,119);
 c.strokeStyle=high?'#c49438':'#ea9a3b';c.lineWidth=5;c.lineCap='round';c.beginPath();c.moveTo(298,135);c.quadraticCurveTo(540,120,790,137);c.stroke();
 const pillWidth=Math.min(956,Math.max(690,data.comment.length*33+74));round(c,(1080-pillWidth)/2,150,pillWidth,46,23);c.fillStyle=blast?'#58413c':high?'#825121':'#b75e27';c.fill();label(c,data.comment,540,184,30,'#fff5df',800,pillWidth-50);
 // The entire food rendering stays inside its own generous frame, with no overlays.
 c.save();round(c,HERO.x,HERO.y,HERO.width,HERO.height,30);c.clip();c.drawImage(hero,HERO.x,HERO.y,HERO.width,HERO.height);c.restore();
 c.lineWidth=3;c.strokeStyle=high?'#c69748':'#d5b17b';round(c,HERO.x+1,HERO.y+1,HERO.width-2,HERO.height-2,29);c.stroke();
 // A warm lower panel is deliberately separate from the dish; no score obscures it.
 c.textAlign='left';label(c,data.name,71,979,42,'#4b2614',900,700);
 label(c,blast?'爆発で調理終了':data.scoreLabel||'今回のスコア',75,1018,21,'#87603c',600,700);
 const scoreInk=blast?'#945339':high?'#885013':'#8d3e14';
 c.font=`900 140px ${CARD_FONT}`;c.fillStyle=scoreInk;c.fillText(String(data.score),64,1151);
 const scoreWidth=c.measureText(String(data.score)).width;label(c,'点',78+scoreWidth,1149,40,scoreInk,900);
 if(perfect){label(c,'満点の一皿',80+scoreWidth+74,1092,27,'#8c641b',800,240);label(c,'お見事！',80+scoreWidth+74,1130,23,'#8c641b',700,240);}
 if(data.rank){
  const x=865,y=1080,r=84;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=high?'#f6d48c':'#f8ddb0';c.fill();c.strokeStyle=high?'#ae7c28':'#c99c60';c.lineWidth=4;c.stroke();c.beginPath();c.arc(x,y,r-10,0,Math.PI*2);c.lineWidth=1.5;c.stroke();
  c.textAlign='center';label(c,'ランク',x,y-45,19,'#795126',700);label(c,data.rank,x,y+38,86,'#70401a',900,140);
 }
 feedback(c,data,58,1167,964,86);
 if(data.bestUpdated){round(c,735,949,287,39,19);c.fillStyle='#edbb54';c.fill();c.textAlign='center';label(c,'自己ベスト更新',878,976,23,'#603709',900,265);}
 c.textAlign='center';c.strokeStyle='#c6a476';c.lineWidth=1;c.beginPath();c.moveTo(58,1257);c.lineTo(1022,1257);c.stroke();
 label(c,'#揚げ達  #ブラウザゲーム',540,1293,29,'#754523',800);
 label(c,'あなたも挑戦  '+data.url.replace(/^https:\/\//,'').replace(/\/$/,''),540,1326,20,'#876441',500,964);
 if(high){c.strokeStyle=perfect?'#bc8b2f':'#cfa758';c.lineWidth=perfect?8:4;round(c,10,10,1060,1330,33);c.stroke();
  for(const [x,y,r] of [[64,174,12],[1014,181,15],[46,969,9],[1015,1240,12]])diamond(c,x,y,r,'#c89a44');
  if(perfect){c.lineWidth=1.5;round(c,18,18,1044,1314,26);c.stroke();for(const [x,y,r] of [[975,63,10],[73,62,8],[997,98,6]])diamond(c,x,y,r,'#b88a36');}
 }
 return canvas;
}

function feedback(c,data,x,y,w,h){
 if(data.zeroReason){
  round(c,x,y,w,h,15);c.fillStyle='#f2dfc0';c.fill();c.textAlign='left';label(c,'次のコツ',x+22,y+25,18,'#987146',600,w-44);label(c,data.tip,x+22,y+61,26,'#55301a',900,w-44);return;
 }
 const gap=16,cell=(w-gap)/2;
 for(const [i,title,text] of [[0,'よかったところ',data.good||'最後まで挑戦できた！'],[1,data.score===100?'次の一皿へ':'惜しい！ あとひと工夫',data.tip||'この揚げ加減を覚えよう']]){
  const left=x+i*(cell+gap);round(c,left,y,cell,h,15);c.fillStyle=i?'#f2dfc0':'#fffaed';c.fill();c.textAlign='left';label(c,title,left+16,y+25,18,'#987146',600,cell-32);label(c,text,left+16,y+61,26,'#55301a',900,cell-32);
 }
}
// X's large link cards are horizontal. Reflow the same result and same hero,
// without cropping the portrait card or warping the food.
export function drawLinkCard(canvas,data,hero){
 canvas.width=1200;canvas.height=630;const c=canvas.getContext('2d');if(!c)throw new Error('共有画像を描画できませんでした。');
 const high=data.score>=90,perfect=data.score===100,blast=data.exploded;
 const paper=c.createLinearGradient(0,0,1200,630);paper.addColorStop(0,'#fff7e6');paper.addColorStop(1,'#f5ddb8');c.fillStyle=paper;c.fillRect(0,0,1200,630);
 c.textAlign='left';label(c,'揚げ物の達人',37,67,49,'#4b210e',900,600);label(c,data.comment,39,104,24,blast?'#735148':'#a25a27',900,1100);
 const x=24,y=127,w=650,h=w*hero.height/hero.width;
 c.save();round(c,x,y,w,h,23);c.clip();c.drawImage(hero,x,y,w,h);c.restore();c.strokeStyle=high?'#b58a3d':'#d5b17b';c.lineWidth=2;round(c,x,y,w,h,23);c.stroke();
 c.textAlign='left';label(c,data.name,708,172,38,'#4b2614',900,450);label(c,blast?'爆発で調理終了':data.scoreLabel||'今回のスコア',711,204,18,'#87603c',600,450);
 c.font=`900 126px ${CARD_FONT}`;c.fillStyle=blast?'#945339':'#8d4d17';c.fillText(String(data.score),701,326);const sw=c.measureText(String(data.score)).width;label(c,'点',710+sw,323,33,'#8d4d17',900);
 if(data.rank){c.beginPath();c.arc(1107,268,59,0,Math.PI*2);c.fillStyle=high?'#f4ce7e':'#f7dab0';c.fill();c.strokeStyle='#b68b4a';c.stroke();c.textAlign='center';label(c,'ランク',1107,241,16,'#795126',700);label(c,data.rank,1107,298,65,'#70401a',900);}
 if(data.bestUpdated||perfect){round(c,710,345,456,36,18);c.fillStyle='#edbb54';c.fill();c.textAlign='center';label(c,data.bestUpdated?'自己ベスト更新': '満点の一皿、お見事！',938,370,21,'#603709',900,435);}
 const notes=data.zeroReason?[[0,'次のコツ',data.tip]]:[[0,'よかったところ',data.good||'最後まで挑戦できた！'],[1,data.score===100?'次の一皿へ':'惜しい！ あとひと工夫',data.tip||'この揚げ加減を覚えよう']];
 for(const [i,title,text] of notes){const yy=395+i*84;round(c,708,yy,458,76,13);c.fillStyle=i?'#f0dabc':'#fff9eb';c.fill();c.textAlign='left';label(c,title,723,yy+23,17,'#947046',600,426);label(c,text,723,yy+56,25,'#55301a',900,426);}
 c.textAlign='center';label(c,'#揚げ達  #ブラウザゲーム',938,590,22,'#754523',900,470);label(c,data.url.replace(/^https:\/\//,'').replace(/\/$/,''),600,607,15,'#876441',400,1130);
 c.strokeStyle=high?'#c79742':'#ddbd8d';c.lineWidth=perfect?6:2;round(c,7,7,1186,616,26);c.stroke();
 if(perfect){c.lineWidth=1;round(c,14,14,1172,602,20);c.stroke();diamond(c,1144,62,13,'#bb8d37');}
 return canvas;
}

export function canvasPNG(canvas){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNGの書き出しに失敗しました。')),'image/png'));}
