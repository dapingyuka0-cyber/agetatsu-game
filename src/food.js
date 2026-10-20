import {cookingLook} from './cooking-look.js';
import {makeCraftFood,churroPoint,wrapperPoint} from './craft-food.js';
import {isCraft,demoPath} from './craft.js';
import * as T from 'three';
import {RECIPES} from './simulation.js';
import {makePowders} from './powders.js';
import {bakedPoint,foodMeshes} from './food-assets.js';
import {foodMaterial} from './food-material.js';
import {newCoatingGeometry,makeShrimpTail} from './food-details.js';
const TAU=Math.PI*2;
function rng(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
const layoutCache={};
export function foodParts(id){
 if(layoutCache[id])return layoutCache[id];
 if(id==='squid')return layoutCache[id]=[{x:-.65,z:-.34,r:-.35,scale:1},{x:.60,z:-.37,r:.48,scale:.87},{x:-.06,z:.67,r:-.2,scale:.97}];
 if(id==='onion')return layoutCache[id]=[{x:0,z:0,r:.12,scale:1.42}];
 if(id==='chicken')return layoutCache[id]=[{x:-.64,z:-.34,r:-.4,scale:.89},{x:.58,z:-.33,r:.7,scale:1},{x:.02,z:.69,r:-.2,scale:.82}];
 if(id==='fries'){
  const random=rng(9761),pieces=[];
  // Deterministic scattered packing: test the full stick, not only its center.
  for(let attempt=0;pieces.length<15&&attempt<30000;attempt++){
   const c={x:(random()-.5)*2.7,z:(random()-.5)*2.7,y:0,r:random()*TAU,scale:.84+random()*.12,length:.27+random()*.15,width:.055+random()*.017};
   const samples=Array.from({length:9},(_,j)=>({x:c.x+(j/4-1)*c.length*c.scale*Math.cos(c.r),z:c.z-(j/4-1)*c.length*c.scale*Math.sin(c.r)}));
   if(samples.some(p=>Math.hypot(p.x,p.z)>1.49))continue;
   if(pieces.some(q=>Math.hypot(q.x-c.x,q.z-c.z)<.30||q.samples.some(p=>samples.some(r=>Math.hypot(p.x-r.x,p.z-r.z)<.18))))continue;
   pieces.push({...c,samples});
  }
  return layoutCache[id]=pieces;
 }
 return layoutCache[id]=[{x:0,z:0,r:0,scale:1}];
}
const signedPow=(x,p)=>Math.sign(x)*Math.pow(Math.abs(x),p);
export function deformFoodPoint(id,p,cook,coat,partIndex=null){
 if(!['squid','onion','chicken','fries'].includes(id))return p;
 let c=foodParts(id)[partIndex??0],distance=Infinity;
 if(partIndex===null)for(const part of foodParts(id)){const d=(p.x-part.x)**2+(p.z-part.z)**2;if(d<distance){distance=d;c=part;}}
 const dx=p.x-c.x,dz=p.z-c.z,r=Math.hypot(dx,dz),theta=Math.atan2(dz,dx);
 if(id==='squid'){p.x=c.x+dx*(1-.065*cook);p.z=c.z+dz*(1-.065*cook);p.y+=.045*cook*Math.sin(theta*2+.7);}
 if(id==='onion'){const center=.435*c.scale,widen=(r-center)*(.32*coat+.12*cook);p.x+=dx/(r||1)*widen;p.z+=dz/(r||1)*widen;p.y*=1+.22*coat+.1*cook;}
 if(id==='chicken'){p.x=c.x+dx*(1-.035*cook);p.z=c.z+dz*(1-.035*cook);p.y*=1-.045*cook;}
 if(id==='fries'){const along=dx*Math.cos(c.r)-dz*Math.sin(c.r);p.y+=cook*.035*Math.pow(along/(c.length*c.scale),2);}
 return p;
}
function placePoint(id,p,thick,part){
 const c=foodParts(id)[part]||foodParts(id)[0];
 if(id==='fries'){p.x*=c.length;p.y*=c.width;p.z*=c.width;}
 if(id==='pork'||id==='pumpkin')p.y*=thick;
 const x=p.x*c.scale,z=p.z*c.scale;p.set(x*Math.cos(c.r)+z*Math.sin(c.r)+c.x,p.y*c.scale+(c.y||0),-x*Math.sin(c.r)+z*Math.cos(c.r)+c.z);return p;
}
export function surface(id,u,v,thick=1,part=0){if(isCraft(id))return new T.Vector3(...(id==='churros'?churroPoint(demoPath(),u,v):wrapperPoint(u,v,1,1,[1,1,1,1,1])));return placePoint(id,bakedPoint(id,u,v,part),thick,part);}
function geometry(id,thick,onlyPart=null){
 const positions=[],uv=[],indices=[],regions=[],partIds=[];
 for(let part=0;part<foodParts(id).length;part++){
  if(onlyPart!==null&&part!==onlyPart)continue;
  const a=foodMeshes[id][part%foodMeshes[id].length],offset=positions.length/3;
  for(let i=0;i<a.positions.length;i++){const p=placePoint(id,new T.Vector3(...a.positions[i]),thick,part);positions.push(p.x,p.y,p.z);uv.push(...a.uv[i]);regions.push(a.regions[i]);partIds.push(part);}
  indices.push(...a.indices.map(i=>i+offset));
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('region',new T.Float32BufferAttribute(regions,1));g.setAttribute('foodPart',new T.Float32BufferAttribute(partIds,1));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function makeFood(id,thickness=1,onlyPart=null){
 if(isCraft(id))return makeCraftFood(id);
 const group=new T.Group(),uniforms={prepLevel:{value:0},heatA:{value:0},heatB:{value:0},damage:{value:0},oiliness:{value:0}};
 const baseGeometry=geometry(id,thickness,onlyPart);const parts=[];
 const random=rng(id==='shrimp'?234:id==='pork'?812:455);
 const crumbGeo=newCoatingGeometry(id);if(!crumbGeo.attributes.uv)crumbGeo.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(crumbGeo.attributes.position.count*2),2));crumbGeo.setAttribute('region',new T.Float32BufferAttribute(new Float32Array(crumbGeo.attributes.position.count),1));const total=['fries','bread'].includes(id)?0:id==='onion'?1800:id==='chicken'?2400:id==='squid'?4800:id==='shrimp'?4200:5800,count=Math.ceil(total/(onlyPart===null?1:foodParts(id).length));
 const bodyMat=foodMaterial(id,uniforms),crumbMat=foodMaterial(id,uniforms,true);
 const body=new T.Mesh(baseGeometry,bodyMat);body.castShadow=true;body.receiveShadow=true;
 const crumbs=new T.InstancedMesh(crumbGeo,crumbMat,count);crumbs.castShadow=true;crumbs.receiveShadow=true;
 const dummy=new T.Object3D();
 for(let i=0;i<count;i++){
  const u=Math.acos(1-2*(.003+random()*.994))/Math.PI,v=random(),part=onlyPart??i%foodParts(id).length,p=surface(id,u,v,thickness,part);
  const pu=surface(id,Math.min(.999,u+.001),v,thickness,part).sub(p),pv=surface(id,u,v+.001,thickness,part).sub(p);
  const normal=new T.Vector3().crossVectors(pu,pv).normalize();if(id==='squid'||id==='onion')normal.negate();
  dummy.position.copy(p).addScaledVector(normal,.009);dummy.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),normal);dummy.rotateY(random()*TAU);
  const size=id==='chicken'?.018+random()*.030:id==='onion'?.009+random()*.018:(.012+Math.pow(random(),2)*.04)*(id==='squid'?.52:1);
  dummy.scale.set(size*(.65+random()*.6),size*(id==='onion'?.28:id==='chicken'?.7:.7),size*(id==='chicken'?1.2:id==='onion'?1:1.5));dummy.updateMatrix();crumbs.setMatrixAt(i,dummy.matrix);crumbs.setColorAt(i,new T.Color().setScalar(.82+random()*.18));
 }
 crumbs.instanceMatrix.needsUpdate=true;
 const whole=new T.Group();whole.add(body,crumbs);group.add(whole);
 if(onlyPart!==null){const c=foodParts(id)[onlyPart];whole.position.set(-c.x,-(c.y||0),-c.z);}
 if(id==='shrimp')whole.add(makeShrimpTail());
 const leak=new T.Group();leak.visible=false;group.add(leak);
 const leakMat=new T.MeshStandardMaterial({color:id==='potato'?0xf3dfaa:0xe9a117,roughness:.5});
 for(let i=0;i<7;i++){const blob=new T.Mesh(new T.IcosahedronGeometry(.12+random()*.13,2),leakMat);blob.position.set(.2+i*.08,-.12,.55+random()*.15);blob.scale.set(1,.5,1);leak.add(blob);}
 if(id==='pumpkin'){const crack=new T.Mesh(new T.BoxGeometry(.42,.018,.035),new T.MeshStandardMaterial({color:0x66350b}));crack.position.set(.24,.29*thickness,.12);crack.rotation.y=.5;leak.add(crack);}
 let powders=null;
 const changesShape=['squid','onion','chicken','fries'].includes(id),restVertices=changesShape?baseGeometry.attributes.position.array.slice():null,restCrumbs=changesShape?crumbs.instanceMatrix.array.slice():null;
 let shapeKey='';const shapePoint=new T.Vector3(),shapeMatrix=new T.Matrix4();
 function update(s,dt=1/60){
  uniforms.prepLevel.value=s.coating;uniforms.heatA.value=s.heat[0];uniforms.heatB.value=s.heat[1];uniforms.damage.value=s.damage;uniforms.oiliness.value=s.stage==='fry'?1:s.stage==='drain'?Math.max(.2,1-s.drain/9):.25;
  crumbs.visible=s.coating>2.02;crumbs.count=Math.floor(count*Math.max(0,Math.min(1,s.coating-2)));

  if(id==='bread'){whole.scale.set(1+Math.min(.04,s.core*.018),1+Math.min(.22,s.core*.18),1+Math.min(.10,s.core*.08));if(s.stage==='plate'&&!powders){
    const turned=s.flips%2===1;
    powders=makePowders((u,v)=>{const p=surface(id,u,turned?1-v:v);if(turned){p.y=-p.y;p.z=-p.z;}return p;});
    powders.group.rotation.x=turned?Math.PI:0;whole.add(powders.group);
   }powders?.update(s,dt);}leak.visible=s.rupture;
  if(changesShape){
   const cooked=Math.round(Math.min(1,s.core)*30)/30,coated=Math.round(Math.min(1,s.coating/3)*20)/20,key=cooked+':'+coated;
   if(key!==shapeKey){shapeKey=key;const pos=baseGeometry.attributes.position;
    for(let i=0;i<pos.count;i++){shapePoint.fromArray(restVertices,i*3);deformFoodPoint(id,shapePoint,cooked,coated,baseGeometry.attributes.foodPart.getX(i));pos.setXYZ(i,shapePoint.x,shapePoint.y,shapePoint.z);}pos.needsUpdate=true;baseGeometry.computeVertexNormals();
    for(let i=0;i<count;i++){shapeMatrix.fromArray(restCrumbs,i*16);shapePoint.setFromMatrixPosition(shapeMatrix);deformFoodPoint(id,shapePoint,cooked,coated,onlyPart??i%foodParts(id).length);shapeMatrix.setPosition(shapePoint);crumbs.setMatrixAt(i,shapeMatrix);}crumbs.instanceMatrix.needsUpdate=true;
   }
   if(id==='squid'||id==='onion'){bodyMat.transmission=.001+(id==='onion'?.20:.11)*(1-Math.min(1,s.coating));bodyMat.roughness=.32+.3*coated;}
  }
  body.scale.set(1-s.damage*.07,1-s.damage*.22,1+s.damage*.07);crumbs.scale.copy(body.scale);
 }
 return {group,uniforms,update,id,parts:foodParts(id),dispose(){const geometries=new Set(),materials=new Set();group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
