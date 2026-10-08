import {createTrainingState as createState} from './fixtures.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {setMode,step,release,dropWand,CONFIG} from '../src/simulation.js';
import {ITEM_BALANCE,COMBAT_BALANCE,ICE_BALANCE,LIGHTNING_BALANCE} from '../src/balance.js';
import {lightningPoint} from '../src/wands.js';
const profile={name:'Test',color:'#79a9ff'};
function equipped(type,mode='Normal'){const s=createState(profile);s.players[0].wand={id:9,type};s.players[0].angle=0;setMode(s,1,mode);return s;}
function target(id,x,y){return {id,x,y,hits:0,damage:0};}
test('rapid taps produce tiny short sparks and negligible total damage',()=>{
 const s=equipped('fire');let damage=0;
 for(let i=0;i<20;i++){
  s.players[0].mana=100;step(s,{1:{x:0,y:0,held:true}},.04);release(s,1);const shot=s.projectiles.at(-1);
  assert.ok(shot.radius<1.1);assert.ok(shot.range<10);damage+=shot.damage;
 }
 assert.ok(damage<CONFIG.normalDamage*.05);
});
test('Ice and Lightning use the same drop and auto-pickup cycle',()=>{
 for(const type of ['ice','lightning']){
  const s=createState(profile);dropWand(s,1);const item=s.items.find(i=>i.type===type);
  s.players[0].x=item.x;s.players[0].y=item.y;step(s,{1:{x:0,y:0,held:false}},.01);
  assert.equal(s.players[0].wand.type,type);dropWand(s,1);assert.equal(s.players[0].wand,null);
  assert.ok(s.items.some(i=>i.id===item.id&&i.type===type));
 }
});
test('Ice Normal casts a spread only on release',()=>{
 const s=equipped('ice');step(s,{1:{x:0,y:0,held:true}},ICE_BALANCE.chargeTime);
 assert.equal(s.projectiles.length,0);release(s,1);
 assert.ok(Math.abs(s.projectiles.length-ICE_BALANCE.pellets)<=1);
 assert.ok(s.projectiles[0].angle<0);assert.ok(s.projectiles.at(-1).angle>0);
 assert.ok(s.projectiles.every((p,i,all)=>!i||p.angle>all[i-1].angle));
 s.targets=[target(4,720,450)];for(let i=0;i<60;i++)step(s,{1:{x:0,y:0}},1/60);
 assert.ok(s.targets[0].damage>0);
});
test('Ice Special wave travels forward and hits all targets once, including off-axis targets',()=>{
 const s=equipped('ice','Special');s.targets=[target(4,720,450),target(5,750,510),target(6,520,450),target(7,750,620)];
 s.players[0].charge=.5;release(s,1);assert.equal(s.projectiles.length,0);
 s.players[0].charge=1;release(s,1);assert.equal(s.projectiles[0].kind,'coldWave');
 const initial=s.projectiles[0].x;step(s,{1:{x:0,y:0}},.1);assert.ok(s.projectiles[0].x>initial);
 for(let i=0;i<180;i++)step(s,{1:{x:0,y:0}},1/60);
 assert.deepEqual(s.targets.map(t=>t.hits),[1,1,0,0]);
 assert.equal(s.targets[0].damage,ICE_BALANCE.waveDamage);assert.equal(s.projectiles.length,0);
});
test('Lightning Normal applies an instant line to every aligned target',()=>{
 const s=equipped('lightning');s.targets=[target(4,700,450),target(5,850,450),target(6,700,530)];
 step(s,{1:{x:0,y:0,held:true}},LIGHTNING_BALANCE.chargeTime);assert.equal(s.targets[0].damage,0);
 release(s,1);assert.equal(s.projectiles.length,0);assert.equal(s.effects[0].kind,'lightningLine');
 assert.deepEqual(s.targets.map(t=>t.damage),[LIGHTNING_BALANCE.lineDamage,LIGHTNING_BALANCE.lineDamage*COMBAT_BALANCE.pierceFalloff,0]);
});
test('Lightning Special marker distance grows; release at partial charge strikes reached point',()=>{
 const s=equipped('lightning','Special');step(s,{1:{x:0,y:0,held:true}},LIGHTNING_BALANCE.specialChargeTime*.25);
 const near=lightningPoint(s.players[0]);step(s,{1:{x:0,y:0,held:true}},LIGHTNING_BALANCE.specialChargeTime*.25);
 const far=lightningPoint(s.players[0]);assert.ok(far.x>near.x);assert.equal(s.effects.length,0);
 s.targets=[target(4,far.x,far.y),target(5,far.x+200,far.y)];
 s.walls=[{x:700,y:400,width:20,height:100}]; // Sky strikes do not trace intervening geometry.
 release(s,1);assert.equal(s.effects[0].kind,'skyStrike');assert.ok(Math.hypot(s.effects[0].x-far.x,s.effects[0].y-far.y)<20);
 assert.deepEqual(s.targets.map(t=>t.damage),[LIGHTNING_BALANCE.strikeDamage,0]);
 assert.equal(s.players[0].charge,0);assert.equal(s.projectiles.length,0);
});
test('every wand charges while stationary and Safe never casts',()=>{
 for(const type of ['fire','ice','lightning']){
  const s=equipped(type,'Special');step(s,{1:{x:0,y:0,held:true}},.1);assert.ok(s.players[0].charge>0);
  setMode(s,1,'Safe');step(s,{1:{x:0,y:0,held:true}},5);release(s,1);
  assert.equal(s.shots,0);assert.equal(s.effects.length,0);assert.equal(s.projectiles.length,0);
 }
});
