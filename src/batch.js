import {fresh,advance,action,RECIPES} from './simulation.js';
export function createBatch(id,thickness=1){return {selected:0,pieces:Array.from({length:RECIPES[id].quantity},(_,pieceIndex)=>({...fresh(id,thickness),individual:true,pieceIndex}))};}
export function choosePiece(batch,index){
 const old=batch.pieces[batch.selected],next=batch.pieces[index];if(!next)return old;
 next.oil=old.oil;next.target=old.target;next.paused=old.paused;batch.selected=index;return next;
}
export function advanceBatch(batch,dt){
 const selected=batch.pieces[batch.selected],{oil,target,paused}=selected;
 for(const p of batch.pieces){p.oil=oil;p.target=target;p.paused=paused;advance(p,dt);}
}
export function actBatch(batch,a){
 const s=batch.pieces[batch.selected];
 if(a==='stir'){
  if(s.stage!=='fry'||s.paused||s.checking||s.toolCooldown>0)return false;
  let changed=false;for(const p of batch.pieces)if(p.stage==='fry'&&!p.checking&&action(p,'flip')){p.agitation=3;p.stirs++;p.toolCooldown=1.2;changed=true;}if(!changed)return false;
  return true;
 }
 return action(s,a);
}

