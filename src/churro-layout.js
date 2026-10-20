// Shared physical dimensions: input, mesh radius, vessel and serving fit.
export const CHURRO_PAN_SCALE=2.5;
export const OIL_RADIUS=1.865*CHURRO_PAN_SCALE;
export const DOUGH_RADIUS=.135;
export const CHURRO_DRAW_RADIUS=OIL_RADIUS-DOUGH_RADIUS-.025;
export const PLATE_INNER_RADIUS=1.40;
export const STATION_SHIFT=4.4;
export function pathBounds(path){
 if(!path?.length)return {x:0,z:0,radius:DOUGH_RADIUS,originRadius:0};
 let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
 for(const p of path){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minZ=Math.min(minZ,p.z);maxZ=Math.max(maxZ,p.z);}
 const x=(minX+maxX)/2,z=(minZ+maxZ)/2;let radius=0,originRadius=0;
 for(const p of path){radius=Math.max(radius,Math.hypot(p.x-x,p.z-z));originRadius=Math.max(originRadius,Math.hypot(p.x,p.z));}
 return {x,z,radius:radius+DOUGH_RADIUS,originRadius};
}
export function servingFit(path,radius=PLATE_INNER_RADIUS){const b=pathBounds(path);return {...b,scale:Math.min(1,radius/b.radius)};}
export function fitTemplate(path){const b=pathBounds(path),scale=Math.min(1,CHURRO_DRAW_RADIUS/Math.max(.001,b.radius-DOUGH_RADIUS));return path.map(p=>({...p,x:(p.x-b.x)*scale,z:(p.z-b.z)*scale}));}
export function clampPanPoint(p){const r=Math.hypot(p.x,p.z),scale=r>CHURRO_DRAW_RADIUS?CHURRO_DRAW_RADIUS/r:1;return {x:p.x*scale,z:p.z*scale};}
