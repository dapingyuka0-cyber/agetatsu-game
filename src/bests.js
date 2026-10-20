const KEY='agemaster-bests-v1';
export function saveBest(id,score,storage){
 let records={};try{storage??=globalThis.localStorage;const value=JSON.parse(storage.getItem(KEY)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))records=value;}catch{}
 const prior=Number.isFinite(records[id])?Math.max(0,Math.min(100,records[id])):null;
 const best=Math.max(prior??0,score),updated=prior===null||score>prior;records[id]=best;
 let saved=true;try{storage.setItem(KEY,JSON.stringify(records));}catch{saved=false;}
 return {best,updated,saved};
}
