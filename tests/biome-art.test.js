import test from 'node:test';
import assert from 'node:assert/strict';
import {generateLocation} from '../src/generator.js';
import {drawBiome} from '../src/art/biomes.js';
function recorder(){const calls=[];return {calls,ctx:new Proxy({createRadialGradient:()=>({addColorStop(){}})},{get(t,k){return k in t?t[k]:(...args)=>calls.push([k,...args]);}})};}
for(const location of ['forest','cave','library'])test(`${location} artwork is deterministic, clips floor detail, and leaves map state untouched`,()=>{
 const map=generateLocation(location,27),before=JSON.stringify(map),p=map.pois[0];
 const visible=(x,y,r)=>Math.abs(x-p.x)<p.radius+r&&Math.abs(y-p.y)<p.radius+r;
 const a=recorder(),b=recorder();drawBiome(a.ctx,map,visible);drawBiome(b.ctx,map,visible);
 assert.equal(JSON.stringify(map),before);assert.deepEqual(a.calls,b.calls);assert.ok(a.calls.some(c=>c[0]==='clip'));assert.ok(a.calls.some(c=>c[0]==='fillRect'));assert.ok(a.calls.some(c=>c[0]==='stroke'));
});
