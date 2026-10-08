import test from 'node:test';
import assert from 'node:assert/strict';
import {createScene} from '../src/scenes/lobby.js';
import {enterBattleRoyale,safeRadius} from '../src/battle-royale.js';
import {drawBattleArena} from '../src/art/battle-royale.js';
function record(){const calls=[];return {calls,ctx:new Proxy({createRadialGradient:(...a)=>{calls.push(['gradient',...a]);return {addColorStop(){}};}},{get:(t,k)=>k in t?t[k]:(...a)=>calls.push([k,...a])})};}
for(const seconds of [0,30,60])test(`magma clips to the exact safe circle at ${seconds} seconds without mutating the match`,()=>{
 const s=createScene({name:'Wizard',color:'#7c2fee'});enterBattleRoyale(s);s.time=seconds;
 const before=JSON.stringify(s),r=safeRadius(s),a=record();drawBattleArena(a.ctx,s,r);
 assert.equal(JSON.stringify(s),before);
 const clip=a.calls.findIndex(c=>c[0]==='clip'&&c[1]==='evenodd');assert.ok(clip>=0);
 if(r>0)assert.equal(a.calls.slice(0,clip).filter(c=>c[0]==='arc').at(-1)[3],r);
 const animated=record();drawBattleArena(animated.ctx,s,r,seconds+1);assert.notDeepEqual(a.calls,animated.calls);
});
