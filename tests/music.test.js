import test from 'node:test';
import assert from 'node:assert/strict';
import {composeMusic,createMusic} from '../src/music.js';
test('background score is finite, quiet, stereo and continuous at the loop boundary',()=>{
 const score=composeMusic(8000);assert.equal(score.duration,48);assert.equal(score.left.length,384000);
 let energy=0,difference=0;for(let i=0;i<score.left.length;i++){assert.ok(Number.isFinite(score.left[i]));assert.ok(Math.abs(score.left[i])<=.201);energy+=score.left[i]**2;difference+=Math.abs(score.left[i]-score.right[i]);}
 assert.ok(energy>1);assert.ok(difference>1);assert.ok(Math.abs(score.left[0]-score.left.at(-1))<.025);
});
test('music reuses one loop and fades on mute or exit',()=>{
 const sources=[],levels=[];const ctx={currentTime:1,destination:{},createGain:()=>({gain:{value:0,cancelScheduledValues(){},setTargetAtTime:value=>levels.push(value)},connect(){}}),createBiquadFilter:()=>({type:'',frequency:{},connect(){}}),createBuffer:(_,n)=>({getChannelData:()=>new Float32Array(n)}),createBufferSource:()=>{const node={connect(){},start(){},stop(at){this.stopped=at;},disconnect(){}};sources.push(node);return node;}};
 const music=createMusic(ctx);music.setActive(true);music.setActive(true);assert.equal(sources.length,1);music.setActive(true,true);assert.equal(levels.at(-1),0);music.setActive(false);assert.ok(sources[0].stopped>ctx.currentTime);music.setActive(true);assert.equal(sources.length,2);
});
