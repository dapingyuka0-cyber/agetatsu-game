const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});

export async function countRoutes(request,env){
 if(new URL(request.url).pathname!=='/api/cooked-count')return null;
 if(!env.COOKED_DB)return reply({error:'集計を利用できません'},503);
 if(request.method!=='GET'&&request.method!=='POST')return reply({error:'Method not allowed'},405);
 try{
  let added=false;
  if(request.method==='POST'){
   if(request.headers.get('Origin')!==new URL(request.url).origin)return reply({error:'Invalid origin'},403);
   if(!request.headers.get('Content-Type')?.startsWith('application/json')||Number(request.headers.get('Content-Length'))>256)return reply({error:'Invalid request'},400);
   const {id}=await request.json();
   if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))return reply({error:'Invalid result ID'},400);
   // A unique result ID makes retries and simultaneous duplicate POSTs idempotent.
   const inserted=await env.COOKED_DB.prepare('INSERT INTO cooked_results(id) VALUES (?) ON CONFLICT(id) DO NOTHING RETURNING id').bind(id).all();
   added=inserted.results.length===1;
  }
  const row=await env.COOKED_DB.prepare('SELECT total FROM cooked_total WHERE singleton=1').first();
  return reply({count:row.total,added});
 }catch{return reply({error:'集計に接続できません'},503);}
}
