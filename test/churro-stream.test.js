import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fresh,advance,action,grade} from '../src/simulation.js';
import {craftGesture} from '../src/craft.js';
import {createBatch} from '../src/batch.js';
import {churroFall,FALL_TIME,CHURRO_DRAW_RADIUS,applyChurroTemplate,churroTemplate} from '../src/churro-flow.js';
import {makeCraftFood} from '../src/craft-food.js';
test('churro extrusion falls and starts frying before release; release cuts; another stroke is refused until a new round',()=>{
 const batch=createBatch('churros'),s=batch.pieces[0];
 craftGesture(s,'down',{x:-.7,z:0});craftGesture(s,'move',{x:.4,z:.2});
 assert.ok(s.craft.drawing);assert.ok(s.craft.path.length>2);
 assert.equal(churroFall(0),.30);assert.ok(churroFall(.12)>0);assert.equal(churroFall(FALL_TIME),0);
 advance(s,.12);assert.equal(s.stage,'prep');advance(s,.15);assert.equal(s.stage,'fry');assert.ok(s.time>0&&s.heat[0]>0);assert.ok(s.craft.drawing);
 const firstHeat=s.heat[0];craftGesture(s,'move',{x:.8,z:.4});assert.ok(s.craft.path.at(-1).a>=firstHeat);
 const model=makeCraftFood('churros');model.update(s,.05);const body=model.group.children[0].children[0];assert.ok(body.geometry.attributes.streamData);assert.equal(body.geometry.attributes.position.count,body.geometry.attributes.streamData.count);
 craftGesture(s,'up',{x:.8,z:.4});assert.ok(s.craft.ready&&!s.craft.drawing);
 const length=s.craft.length;assert.equal(craftGesture(s,'down',{x:0,z:0}),false);assert.equal(s.craft.length,length);assert.equal(batch.pieces.length,1);const next=fresh('churros');assert.equal(craftGesture(next,'down',{x:0,z:0}),true);
 assert.ok(action(s,'lift'));model.dispose();
});
test('repeated loops exceed former length limit while render knots remain bounded',()=>{
 const s=fresh('churros');craftGesture(s,'down',{x:.8,z:0});
 for(let i=1;i<=600;i++)craftGesture(s,'move',{x:.8*Math.cos(i*.08),z:.8*Math.sin(i*.08)});
 assert.ok(s.craft.length>30);assert.ok(s.craft.drawing);assert.ok(s.craft.path.length<=s.craft.renderBudget);
 craftGesture(s,'up',s.craft.path.at(-1));assert.ok(s.craft.ready);
});

test('holding the bag still continues feeding into the oil',()=>{const s=fresh('churros');craftGesture(s,'down',{x:0,z:0});for(let i=0;i<20;i++)advance(s,.05);assert.ok(s.craft.length>0&&s.craft.drawing);assert.equal(s.stage,'fry');});

test('four templates fit expanded pan, fry immediately, retain geometry and share scoring',()=>{
 for(const name of ['heart','star','spiral','ribbon']){
  const s=fresh('churros');assert.ok(applyChurroTemplate(s,name));assert.equal(s.stage,'fry');assert.ok(s.craft.ready&&s.craft.used);assert.ok(s.craft.path.every(p=>Math.hypot(p.x,p.z)<CHURRO_DRAW_RADIUS));
  assert.equal(applyChurroTemplate(s,'heart'),false);assert.equal(craftGesture(s,'down',{x:0,z:0}),false);
  const shape=s.craft.path.map(p=>[p.x,p.z]);advance(s,.1);assert.ok(s.heat[0]>0);assert.deepEqual(s.craft.path.map(p=>[p.x,p.z]),shape);
  const model=makeCraftFood('churros');model.update(s);const body=model.group.children[0].children[0];assert.ok([...body.geometry.attributes.position.array].every(Number.isFinite));model.dispose();
  Object.assign(s,{stage:'plate',sideSeconds:[10,10],heat:[1.1,1.1],core:1.2,temperatureTime:20,preciseTime:20,goodFlip:true,goodTool:true,flips:1,drain:4});
  assert.equal(grade(s).score,100);s.craft.mode='free';assert.equal(grade(s).score,100);
 }
});
test('expanded edge accepts a stroke and clamps outside movement without cutting',()=>{
 const s=fresh('churros');assert.ok(craftGesture(s,'down',{x:2.5,z:0}));craftGesture(s,'move',{x:4,z:.3});assert.ok(s.craft.drawing);assert.ok(s.craft.path.every(p=>Math.hypot(p.x,p.z)<=CHURRO_DRAW_RADIUS+1e-6));craftGesture(s,'up',{x:4,z:.3});assert.ok(s.craft.ready);
});
