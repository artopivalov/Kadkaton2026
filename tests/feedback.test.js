import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeedback,capturePoses,interpolatePoses} from '../src/feedback.js';
import {createScene} from '../src/scenes/debug.js';
import {release} from '../src/simulation.js';

test('only successful casts publish feedback',()=>{
 const s=createScene({name:'Wizard',color:'#ef795e'}),p=s.players[0];p.mode='Normal';p.charge=1;release(s,p.id);
 assert.equal(p.castFeedback.charge,1);assert.equal(p.castCount,1);
 p.mode='Safe';p.charge=1;release(s,p.id);assert.equal(p.castCount,1);
 p.wand={type:'fire',id:999};p.mode='Normal';p.mana=0;p.charge=1;release(s,p.id);assert.equal(p.castCount,1);
});
test('predicted cast confirmations and replay do not repeat audiovisual feedback',()=>{
 const s=createScene({name:'Wizard',color:'#ef795e'}),p=s.players[0],sounds=[],f=createFeedback({sound:(...args)=>sounds.push(args)});
 f.update(s,p.id,1/60);
 const cast={key:'seq:20',x:p.x,y:p.y,angle:0,type:'test',mode:'Normal',charge:1};
 p.castFeedback=cast;f.update(s,p.id,1/60);assert.equal(sounds.length,1);
 f.update(s,p.id,1/60);p.castFeedback=undefined;f.update(s,p.id,1/60);
 p.castFeedback={...cast};f.update(s,p.id,1/60);assert.equal(sounds.length,1);
 assert.ok(f.particles.length<=160);
});
test('feedback does not mutate the world and reset removes scene decoration',()=>{
 const s=createScene({name:'Wizard',color:'#ef795e'}),f=createFeedback(),before=JSON.stringify(s);
 f.update(s,s.players[0].id,1/60);assert.equal(JSON.stringify(s),before);
 s.hitFeedback.push({key:'test-hit',time:s.time,target:'p1',x:600,y:450,spell:'fire',amount:4});s.players[0].hits++;f.update(s,s.players[0].id,1/60);assert.ok(f.particles.length>0);
 f.reset();assert.equal(f.particles.length,0);assert.equal(f.actors.size,0);
});

test('render interpolation preserves authoritative positions and skips teleports',()=>{
 const s=createScene({name:'Wizard',color:'#ef795e'}),p=s.players[0],before=capturePoses(s),x=p.x;
 p.x+=10;const half=interpolatePoses(s,before,.5);assert.equal(half.players[0].x,x+5);assert.equal(p.x,x+10);
 p.x+=1000;assert.equal(interpolatePoses(s,before,.5).players[0].x,p.x);
});
test('a confirmed lethal hit survives target removal and duplicate snapshots',()=>{
 const s=createScene({name:'Wizard',color:'#ef795e'}),f=createFeedback(),id=s.players[0].id;f.update(s,id,1/60);
 s.enemies=[];s.hitFeedback.push({key:'lethal',time:s.time,target:'e99',x:600,y:300,spell:'ice',amount:20,killed:true});
 f.update(s,id,1/60);assert.equal(f.numbers.length,1);assert.equal(f.numbers[0].text,'20');const particleCount=f.particles.length;assert.ok(particleCount>0);
 f.update(s,id,1/60);assert.equal(f.numbers.length,1);assert.equal(f.particles.length,particleCount);
});

test('recoil follows the original shot direction, settles, and stays cosmetic',()=>{
 const s=createScene({name:'Wizard',color:'#ef795e'}),p=s.players[0],f=createFeedback();f.update(s,p.id,1/60);
 p.castFeedback={key:'heavy',x:p.x,y:p.y,angle:0,type:'earth',mode:'Special',charge:1};f.update(s,p.id,1/60);
 const actor=f.actors.get('p'+p.id);assert.ok(actor.recoil>10);p.angle=Math.PI/2;f.update(s,p.id,1/60);assert.equal(actor.recoilAngle,0);
 const before=JSON.stringify(s);for(let i=0;i<60;i++)f.update(s,p.id,1/60);assert.ok(Math.abs(actor.recoil)<.01);assert.equal(JSON.stringify(s),before);
});

test('local damage gets a dedicated impact while healing and remote damage do not',()=>{
 const s=createScene({name:'Wizard',color:'#ef795e'}),p=s.players[0],sounds=[],f=createFeedback({sound:(kind)=>sounds.push(kind)});f.update(s,p.id,1/60);
 s.hitFeedback.push({key:'hurt',time:0,target:'p1',x:p.x,y:p.y,spell:'fire',amount:15,localPlayer:p.id});f.update(s,p.id,1/60);assert.ok(f.hurt>0);assert.ok(sounds.includes('hurt'));
 f.reset();s.hitFeedback=[{key:'heal',time:0,target:'p1',x:p.x,y:p.y,spell:'light',amount:-15,localPlayer:p.id}];f.update(s,p.id,1/60);assert.equal(f.hurt,0);
});
