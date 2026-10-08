import {createTrainingState as createState} from './fixtures.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {setMode,step,release,dropWand,CONFIG} from '../src/simulation.js';
import {ICE_BALANCE,LIGHTNING_BALANCE} from '../src/balance.js';
import {lightningPoint} from '../src/wands.js';
const profile={name:'Test',color:'#79a9ff'};
function equipped(type,mode='Normal'){const s=createState(profile);s.player.wand={id:9,type};s.player.angle=0;setMode(s,mode);return s;}
function target(id,x,y){return {id,x,y,hits:0,damage:0};}
test('rapid taps produce tiny short sparks and negligible total damage',()=>{
 const s=equipped('fire');let damage=0;
 for(let i=0;i<20;i++){
  step(s,{x:0,y:0,held:true},.04);release(s);const shot=s.projectiles.at(-1);
  assert.ok(shot.radius<1.1);assert.ok(shot.range<10);damage+=shot.damage;
 }
 assert.ok(damage<CONFIG.normalDamage*.05);
});
test('Ice and Lightning use the same drop and auto-pickup cycle',()=>{
 for(const type of ['ice','lightning']){
  const s=createState(profile);dropWand(s);const item=s.items.find(i=>i.type===type);
  s.player.x=item.x;s.player.y=item.y;step(s,{x:0,y:0,held:false},.01);
  assert.equal(s.player.wand.type,type);dropWand(s);assert.equal(s.player.wand,null);
  assert.ok(s.items.some(i=>i.id===item.id&&i.type===type));
 }
});
test('Ice Normal casts a spread only on release',()=>{
 const s=equipped('ice');step(s,{x:0,y:0,held:true},ICE_BALANCE.chargeTime);
 assert.equal(s.projectiles.length,0);release(s);
 assert.equal(s.projectiles.length,ICE_BALANCE.pellets);
 assert.ok(s.projectiles[0].angle<0);assert.ok(s.projectiles.at(-1).angle>0);
 assert.equal(s.projectiles[Math.floor(ICE_BALANCE.pellets/2)].angle,0);
 s.targets=[target(4,720,450)];for(let i=0;i<60;i++)step(s,{x:0,y:0},1/60);
 assert.ok(s.targets[0].damage>0);
});
test('Ice Special wave travels forward and hits all targets once, including off-axis targets',()=>{
 const s=equipped('ice','Special');s.targets=[target(4,720,450),target(5,750,510),target(6,520,450),target(7,750,620)];
 s.player.charge=.5;release(s);assert.equal(s.projectiles.length,0);
 s.player.charge=1;release(s);assert.equal(s.projectiles[0].kind,'coldWave');
 const initial=s.projectiles[0].x;step(s,{x:0,y:0},.1);assert.ok(s.projectiles[0].x>initial);
 for(let i=0;i<180;i++)step(s,{x:0,y:0},1/60);
 assert.deepEqual(s.targets.map(t=>t.hits),[1,1,0,0]);
 assert.equal(s.targets[0].damage,ICE_BALANCE.waveDamage);assert.equal(s.projectiles.length,0);
});
test('Lightning Normal applies an instant line to every aligned target',()=>{
 const s=equipped('lightning');s.targets=[target(4,700,450),target(5,850,450),target(6,700,530)];
 step(s,{x:0,y:0,held:true},LIGHTNING_BALANCE.chargeTime);assert.equal(s.targets[0].damage,0);
 release(s);assert.equal(s.projectiles.length,0);assert.equal(s.effects[0].kind,'lightningLine');
 assert.deepEqual(s.targets.map(t=>t.damage),[LIGHTNING_BALANCE.lineDamage,LIGHTNING_BALANCE.lineDamage,0]);
});
test('Lightning Special marker distance grows; release at partial charge strikes reached point',()=>{
 const s=equipped('lightning','Special');step(s,{x:0,y:0,held:true},LIGHTNING_BALANCE.specialChargeTime*.25);
 const near=lightningPoint(s.player);step(s,{x:0,y:0,held:true},LIGHTNING_BALANCE.specialChargeTime*.25);
 const far=lightningPoint(s.player);assert.ok(far.x>near.x);assert.equal(s.effects.length,0);
 s.targets=[target(4,far.x,far.y),target(5,far.x+200,far.y)];
 s.walls=[{x:700,y:400,width:20,height:100}]; // Sky strikes do not trace intervening geometry.
 release(s);assert.equal(s.effects[0].kind,'skyStrike');assert.equal(s.effects[0].x,far.x);
 assert.deepEqual(s.targets.map(t=>t.damage),[LIGHTNING_BALANCE.strikeDamage,0]);
 assert.equal(s.player.charge,0);assert.equal(s.projectiles.length,0);
});
test('every wand charges while stationary and Safe never casts',()=>{
 for(const type of ['fire','ice','lightning']){
  const s=equipped(type,'Special');step(s,{x:0,y:0,held:true},.1);assert.ok(s.player.charge>0);
  setMode(s,'Safe');step(s,{x:0,y:0,held:true},5);release(s);
  assert.equal(s.shots,0);assert.equal(s.effects.length,0);assert.equal(s.projectiles.length,0);
 }
});
