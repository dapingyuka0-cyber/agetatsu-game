const KEY='agetatsu-pending-cooked-v1',URL='/api/cooked-count';
export function cookedCounter(onUpdate,onAdded){
 let pending=[];try{pending=JSON.parse(localStorage.getItem(KEY)||'[]').filter(id=>typeof id==='string');}catch{}
 let total=null;const sending=new Set(),live=new Map();
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(pending));}catch{}};
 const update=n=>{if(Number.isSafeInteger(n)&&n>=0){total=Math.max(total??0,n);onUpdate(total);}};
 async function send(id){
  if(sending.has(id))return;sending.add(id);
  try{
   const response=await fetch(URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id}),cache:'no-store'});
   if(!response.ok)throw new Error('count unavailable');
   const data=await response.json();update(data.count);
   pending=pending.filter(item=>item!==id);save();
   if(data.added&&live.has(id))onAdded(data.count,live.get(id));
  }catch{}finally{sending.delete(id);live.delete(id);}
 }
 function flush(){for(const id of pending)send(id);}
 async function refresh(){try{const response=await fetch(URL,{cache:'no-store'});if(!response.ok)throw new Error('count unavailable');update((await response.json()).count);}catch{onUpdate(total);}flush();}
 function complete(dish){
  if(dish.completionId)return;
  dish.completionId=crypto.randomUUID();live.set(dish.completionId,dish);
  pending.push(dish.completionId);save();send(dish.completionId);
 }
 window.addEventListener('online',refresh);
 return {refresh,complete};
}
