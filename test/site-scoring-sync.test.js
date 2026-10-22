import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fresh,grade,awardGrade} from '../src/simulation.js';
import {resultCard} from '../src/results.js';

function finished(id,heat=[1.1,1.12]){
 const s=fresh(id);
 Object.assign(s,{stage:'plate',prep:s.id==='churros'?1:s.id==='chicken'?2:3,
  sideSeconds:[15,15],heat,core:1.2,flips:1,goodFlip:true,goodTool:true,
  stirs:1,drain:3,temperatureTime:30,preciseTime:30});
 if(s.craft)s.craft.ready=true;
 return s;
}

test('similar chicken pieces get small, fixed, distinct scores and their details add up',()=>{
 const pieces=Array.from({length:3},()=>finished('chicken'));
 const base=pieces.map(p=>grade(p).score);
 const scored=pieces.map(p=>awardGrade(p,pieces));
 assert.equal(new Set(scored.map(g=>g.score)).size,3);
 scored.forEach((g,i)=>{
  assert.ok(Math.abs(g.score-base[i])<=2);
  assert.equal(g.rows.reduce((sum,row)=>sum+row.value,0),g.score);
  assert.equal(awardGrade(pieces[i],pieces),g);
 });
});

test('forced zero and perfect remain unchanged, even when repeated',()=>{
 const raw=Array.from({length:3},()=>fresh('chicken'));
 raw.forEach(p=>p.stage='plate');
 assert.deepEqual(raw.map(p=>awardGrade(p,raw).score),[0,0,0]);
 const perfect=Array.from({length:3},()=>finished('chicken',[.9,.9]));
 perfect.forEach(p=>p.core=1.5);
 assert.deepEqual(perfect.map(p=>awardGrade(p,perfect).score),[100,100,100]);
});

test('result screen retains the production cooked-count placeholder',()=>{
 const s=finished('potato');
 assert.match(resultCard(grade(s),s),/id="resultCount"/);
});
