import {createTrainingState as createState} from './fixtures.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {step,setMode,release,dropWand,CONFIG} from '../src/simulation.js';
const profile={name:'Test',color:'#79a9ff'};
test('Safe moves without charging or firing; Normal charges and fires on release',()=>{const s=createState(profile);step(s,{x:1,y:0,held:true},.1);assert.ok(s.player.x>600);release(s);assert.equal(s.shots,0);setMode(s,'Normal');step(s,{x:0,y:-1,held:true},.5);assert.ok(s.player.charge>0);release(s);assert.equal(s.shots,1);assert.equal(s.projectiles[0].owner,1);assert.equal(s.player.charge,0);});
test('mode switch cancels charge and incomplete Special does not fire',()=>{const s=createState(profile);setMode(s,'Normal');step(s,{x:1,y:0,held:true},.1);setMode(s,'Special');assert.equal(s.player.charge,0);step(s,{x:1,y:0,held:true},.1);release(s);assert.equal(s.shots,0);});
test('drop does not immediately re-equip; free slot auto-picks after delay',()=>{const s=createState(profile);const id=s.player.wand.id;assert.ok(dropWand(s));step(s,{x:0,y:0},.01);assert.equal(s.player.wand,null);const item=s.items.find(i=>i.id===id);s.player.x=item.x;s.player.y=item.y;step(s,{x:0,y:0},.1);assert.equal(s.player.wand,null);step(s,{x:0,y:0},1);assert.equal(s.player.wand.id,id);assert.ok(!s.items.some(i=>i.id===id));});
test('occupied slot does not swap and empty hands cannot fire',()=>{const s=createState(profile);s.player.x=730;step(s,{x:0,y:0},1);assert.equal(s.player.wand.id,2);dropWand(s);setMode(s,'Normal');step(s,{x:0,y:1,held:true},.1);release(s);assert.equal(s.shots,0);});
test('fireball hits a target once and expires at maximum range',()=>{const s=createState(profile);setMode(s,'Normal');s.player.angle=-Math.PI/2;s.player.charge=1;release(s);for(let i=0;i<120;i++)step(s,{x:0,y:0},1/60);assert.equal(s.targets[0].hits,1);assert.equal(s.projectiles.length,0);s.player.angle=0;s.player.charge=1;release(s);for(let i=0;i<180;i++)step(s,{x:0,y:0},1/60);assert.equal(s.projectiles.length,0);});
test('diagonal movement is normalized and world boundaries hold',()=>{const s=createState(profile);step(s,{x:1,y:1,held:true},1);assert.ok(Math.abs(Math.hypot(s.player.x-600,s.player.y-450)-CONFIG.speed)<.001);step(s,{x:1,y:1,held:true},100);assert.ok(s.player.x<=1180&&s.player.y<=880);});

test('Special charges slower and full release damages all nearby dummies once',()=>{
 const s=createState(profile);setMode(s,'Special');
 step(s,{x:1,y:0,held:true},CONFIG.chargeTime);assert.ok(s.player.charge<1);
 s.player.x=600;s.player.y=450;
 s.targets=[{id:4,x:600,y:450,hits:0,damage:0},{id:5,x:600+CONFIG.specialRadius,y:450,hits:0,damage:0},{id:6,x:1000,y:450,hits:0,damage:0}];
 s.player.charge=1;release(s);
 assert.equal(s.projectiles.length,0);assert.equal(s.effects[0].kind,'fireWave');
 assert.deepEqual(s.targets.map(t=>t.damage),[CONFIG.specialDamage,CONFIG.specialDamage,0]);
 step(s,{x:0,y:0},CONFIG.specialDuration);assert.equal(s.effects.length,0);assert.equal(s.targets[0].hits,1);
});
test('Special reaches full charge at its configured duration',()=>{
 const s=createState(profile);setMode(s,'Special');
 step(s,{x:1,y:0,held:true},CONFIG.specialChargeTime);assert.equal(s.player.charge,1);
 release(s);assert.equal(s.shots,1);assert.equal(s.player.charge,0);
});

test('holding while stationary charges both modes and preserves position and aim',()=>{
 for(const mode of ['Normal','Special']){
  const s=createState(profile);setMode(s,mode);const {x,y,angle}=s.player;
  step(s,{x:0,y:0,held:true},.5);
  assert.ok(s.player.charge>0);assert.equal(s.player.x,x);assert.equal(s.player.y,y);assert.equal(s.player.angle,angle);
  const charge=s.player.charge;step(s,{x:0,y:0,held:false},.5);assert.equal(s.player.charge,charge);
 }
});
test('movement without holding does not charge; returning joystick to center keeps charging',()=>{
 const s=createState(profile);setMode(s,'Normal');step(s,{x:1,y:0,held:false},.1);assert.equal(s.player.charge,0);
 step(s,{x:1,y:0,held:true},.1);const charge=s.player.charge;const x=s.player.x;
 step(s,{x:0,y:0,held:true},.1);assert.ok(s.player.charge>charge);assert.equal(s.player.x,x);
});
test('partial Normal charge reduces actual damage and range; full charge keeps maximums',()=>{
 const shots=[];
 for(const charge of [.1,.5,1]){
  const s=createState(profile);setMode(s,'Normal');s.player.angle=0;s.player.charge=charge;release(s);
  const projectile={...s.projectiles[0]};shots.push(projectile);
  s.targets=[{id:4,x:projectile.x+projectile.range*.5,y:450,hits:0,damage:0}];
  for(let i=0;i<60;i++)step(s,{x:0,y:0,held:false},1/60);
  assert.equal(s.targets[0].hits,1);assert.equal(s.targets[0].damage,projectile.damage);
 }
 assert.ok(shots[0].range<shots[1].range&&shots[1].range<shots[2].range);
 assert.ok(shots[0].damage<shots[1].damage&&shots[1].damage<shots[2].damage);
 assert.equal(shots[2].damage,CONFIG.normalDamage);assert.equal(shots[2].range,CONFIG.projectileRange);
});
test('short shot expires before distant target even with a long simulation step',()=>{
 const s=createState(profile);setMode(s,'Normal');s.player.angle=0;s.player.charge=.25;release(s);
 const projectile=s.projectiles[0];
 s.targets=[{id:4,x:projectile.x+projectile.range+CONFIG.targetRadius+projectile.radius+1,y:projectile.y,hits:0,damage:0}];
 const endpoint=projectile.x+projectile.range;step(s,{x:0,y:0,held:false},1);
 assert.equal(s.targets[0].hits,0);assert.equal(s.projectiles.length,0);assert.equal(projectile.x,endpoint);
});
test('Safe and empty hands never charge while held',()=>{
 const s=createState(profile);step(s,{x:0,y:0,held:true},1);assert.equal(s.player.charge,0);
 dropWand(s);setMode(s,'Normal');step(s,{x:0,y:0,held:true},.1);assert.equal(s.player.charge,0);
});
