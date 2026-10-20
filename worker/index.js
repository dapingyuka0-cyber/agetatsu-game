import {resultRoutes} from './results.js';
import {countRoutes} from './count.js';
// The build injects immutable existing game assets; no framework or login is
// added to the browser game. R2 is used only by explicitly shared result images.
export default {async fetch(request,env){
 const result=await resultRoutes(request,env);if(result)return result;
 const count=await countRoutes(request,env);if(count)return count;
 const path=new URL(request.url).pathname;
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 if(path==='/robots.txt')return new Response('User-agent: *\nAllow: /\n',{headers:{'Content-Type':'text/plain'}});
 return env.ASSETS.fetch(request);
}};
