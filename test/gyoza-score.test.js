import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,grade} from '../src/simulation.js';

function gyoza(heat=[1.1,1.2],flips=1){
 const s=fresh('gyoza');
 Object.assign(s,{stage:'drain',prep:3,heat,flips,sideSeconds:[12,12],core:1.1,drain:2,temperatureTime:24,preciseTime:0,goodFlip:false,goodTool:false});
 s.craft.ready=true;
 return s;
}

test('gyoza turn timing does not gate a well-cooked score',()=>{
 assert.equal(grade(gyoza()).score,100);
 assert.ok(grade(gyoza([.9,1.35])).score>=90);
 assert.ok(grade(gyoza([1.1,1.2],0)).score<100);
});

test('gyoza still rejects raw and black food',()=>{
 const raw=gyoza();raw.sideSeconds[1]=9;
 assert.equal(grade(raw).score,0);
 assert.equal(grade(gyoza([3,3])).score,0);
});
