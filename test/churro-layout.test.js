import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {churroGeometry} from '../src/craft-food.js';
import {churroTemplate} from '../src/churro-flow.js';
import {fitTemplate,servingFit,OIL_RADIUS,CHURRO_DRAW_RADIUS,PLATE_INNER_RADIUS,pathBounds} from '../src/churro-layout.js';
test('actual dough vertices stay in oil when flipped, and inside plate after centering',()=>{
 const paths=['heart','star','spiral','ribbon'].map(n=>fitTemplate(churroTemplate(n)));
 paths.push(Array.from({length:512},(_,i)=>({x:CHURRO_DRAW_RADIUS*Math.cos(i*.13),z:CHURRO_DRAW_RADIUS*Math.sin(i*.13)})));
 paths.push([{x:2.8,z:.6},{x:2.95,z:.2},{x:2.9,z:-.2}]);
 for(const path of paths){
  const {geometry}=churroGeometry(path),a=geometry.attributes.position,fit=servingFit(path);
  for(const angle of [0,.7,Math.PI/2,Math.PI])for(let i=0;i<a.count;i++){
   const q=new T.Vector3().fromBufferAttribute(a,i);q.y-=.08;q.applyAxisAngle(new T.Vector3(1,0,0),angle);
   assert.ok(Math.hypot(q.x,q.z)<OIL_RADIUS,`pan edge ${Math.hypot(q.x,q.z)}`);
  }
  for(let i=0;i<a.count;i++){const q=new T.Vector3().fromBufferAttribute(a,i);assert.ok(Math.hypot(q.x-fit.x,q.z-fit.z)*fit.scale<=PLATE_INNER_RADIUS+1e-5);}
  assert.ok(fit.scale>0&&fit.scale<=1);geometry.dispose();
 }
});

test('templates fill 80 percent of oil radius with proportional ridges and readable plate fit',()=>{
 for(const name of ['heart','star','spiral','ribbon']){
  const raw=churroTemplate(name),path=fitTemplate(raw),b=pathBounds(path),fit=servingFit(path);
  assert.ok(Math.abs(b.radius/OIL_RADIUS-.80)<1e-8);
  assert.ok(path.every(p=>p.width>1));
  assert.ok(Math.abs(fit.scale*b.radius-PLATE_INNER_RADIUS)<1e-8);
  const scale=path[0].width;
  for(let i=1;i<path.length;i++)assert.ok(Math.abs(Math.hypot(path[i].x-path[0].x,path[i].z-path[0].z)-scale*Math.hypot(raw[i].x-raw[0].x,raw[i].z-raw[0].z))<1e-8);
 }
});
