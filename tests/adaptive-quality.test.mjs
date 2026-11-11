import test from 'node:test';import assert from 'node:assert/strict';import {createAdaptiveQuality} from '../src/adaptive-quality.js';
test('quality keeps fast frames detailed and steps down only after sustained slowness',()=>{
 const q=createAdaptiveQuality({sampleSize:4,cooldown:100});for(let i=0;i<8;i++)assert.equal(q.observe(.016,i*16),null);
 for(let i=0;i<3;i++)assert.equal(q.observe(.04,200+i*40),null);assert.equal(q.observe(.04,320),1);
 for(let i=0;i<3;i++)assert.equal(q.observe(.04,500+i*40),null);assert.equal(q.observe(.04,620),2);
 for(let i=0;i<8;i++)assert.equal(q.observe(.04,1000+i*40),null);
});
test('hidden tab and resume pauses never trigger a quality downgrade',()=>{
 const q=createAdaptiveQuality({sampleSize:2});assert.equal(q.observe(.04,0),null);assert.equal(q.observe(.04,10,false),null);assert.equal(q.observe(2,20),null);assert.equal(q.observe(.04,30),null);assert.equal(q.observe(.04,70),1);
});
