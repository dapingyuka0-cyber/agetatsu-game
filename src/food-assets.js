import * as T from 'three';
import meshes from './assets/foods/meshes.json' with {type:'json'};
export const foodMeshes=meshes;
const fallback={shrimp:0xddb69e,pork:0xb76368,chicken:0xbc6b65,squid:0xe3d1ba,onion:0xd9dfb2,fries:0xe4c16b,pumpkin:0xe7a124,potato:0xe7d4a8,bread:0xbb803d};
function pixel(r,g,b){const t=new T.DataTexture(new Uint8Array([r,g,b,255]),1,1);t.needsUpdate=true;return t;}
export const foodMaps=Object.fromEntries(Object.keys(meshes).map(id=>{const c=fallback[id];return[id,{rawMap:{value:pixel(c>>16,(c>>8)&255,c&255)},reliefMap:{value:pixel(128,128,255)},surfaceMap:{value:pixel(128,128,128)}}];}));
export async function loadFoodMaps(urls){
 const loader=new T.TextureLoader();
 await Promise.all(Object.entries(urls).map(async([id,paths])=>{
  const textures=await Promise.all(paths.map(url=>loader.loadAsync(url)));
  for(let i=0;i<3;i++){const t=textures[i];t.colorSpace=T.NoColorSpace;t.flipY=false;t.wrapT=T.RepeatWrapping;t.anisotropy=4;t.needsUpdate=true;const key=['rawMap','reliefMap','surfaceMap'][i];foodMaps[id][key].value.dispose();foodMaps[id][key].value=t;}
 }));
}
export function bakedPoint(id,u,v,part=0){
 const a=meshes[id][part%meshes[id].length],U=a.U,V=a.V;
 u=T.MathUtils.clamp(u,0,1);v=((v%1)+1)%1;
 const i=Math.min(U-1,Math.floor(u*U)),j=Math.min(V-1,Math.floor(v*V)),fu=u*U-i,fv=v*V-j;
 const result=new T.Vector3();
 for(const [di,dj,w] of [[0,0,(1-fu)*(1-fv)],[1,0,fu*(1-fv)],[0,1,(1-fu)*fv],[1,1,fu*fv]])result.addScaledVector(new T.Vector3(...a.positions[(i+di)*(V+1)+j+dj]),w);
 return result;
}
