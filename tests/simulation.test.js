import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,step,setMode,release,dropWand,CONFIG} from '../src/simulation.js';
const profile={name:'Test',color:'#79a9ff'};
test('Safe moves without charging or firing; Normal charges and fires on release',()=>{const s=createState(profile);step(s,{x:1,y:0},.1);assert.ok(s.player.x>600);release(s);assert.equal(s.shots,0);setMode(s,'Normal');step(s,{x:0,y:-1},.5);assert.ok(s.player.charge>0);release(s);assert.equal(s.shots,1);assert.equal(s.projectiles[0].owner,1);assert.equal(s.player.charge,0);});
test('mode switch cancels charge and incomplete Special does not fire',()=>{const s=createState(profile);setMode(s,'Normal');step(s,{x:1,y:0},.1);setMode(s,'Special');assert.equal(s.player.charge,0);step(s,{x:1,y:0},.1);release(s);assert.equal(s.shots,0);});
test('drop does not immediately re-equip; free slot auto-picks after delay',()=>{const s=createState(profile);const id=s.player.wand.id;assert.ok(dropWand(s));step(s,{x:0,y:0},.01);assert.equal(s.player.wand,null);const item=s.items.find(i=>i.id===id);s.player.x=item.x;s.player.y=item.y;step(s,{x:0,y:0},.1);assert.equal(s.player.wand,null);step(s,{x:0,y:0},1);assert.equal(s.player.wand.id,id);assert.ok(!s.items.some(i=>i.id===id));});
test('occupied slot does not swap and empty hands cannot fire',()=>{const s=createState(profile);s.player.x=730;step(s,{x:0,y:0},1);assert.equal(s.player.wand.id,2);dropWand(s);setMode(s,'Normal');step(s,{x:0,y:1},.1);release(s);assert.equal(s.shots,0);});
test('fireball hits a target once and expires at maximum range',()=>{const s=createState(profile);setMode(s,'Normal');s.player.angle=-Math.PI/2;s.player.charge=1;release(s);for(let i=0;i<120;i++)step(s,{x:0,y:0},1/60);assert.equal(s.targets[0].hits,1);assert.equal(s.projectiles.length,0);s.player.angle=0;s.player.charge=1;release(s);for(let i=0;i<180;i++)step(s,{x:0,y:0},1/60);assert.equal(s.projectiles.length,0);});
test('diagonal movement is normalized and world boundaries hold',()=>{const s=createState(profile);step(s,{x:1,y:1},1);assert.ok(Math.abs(Math.hypot(s.player.x-600,s.player.y-450)-CONFIG.speed)<.001);step(s,{x:1,y:1},100);assert.ok(s.player.x<=1180&&s.player.y<=880);});

test('Special charges slower and full release damages all nearby dummies once',()=>{
 const s=createState(profile);setMode(s,'Special');
 step(s,{x:1,y:0},CONFIG.chargeTime);assert.ok(s.player.charge<1);
 s.player.x=600;s.player.y=450;
 s.targets=[{id:4,x:600,y:450,hits:0,damage:0},{id:5,x:600+CONFIG.specialRadius,y:450,hits:0,damage:0},{id:6,x:1000,y:450,hits:0,damage:0}];
 s.player.charge=1;release(s);
 assert.equal(s.projectiles.length,0);assert.equal(s.effects[0].kind,'fireWave');
 assert.deepEqual(s.targets.map(t=>t.damage),[CONFIG.specialDamage,CONFIG.specialDamage,0]);
 step(s,{x:0,y:0},CONFIG.specialDuration);assert.equal(s.effects.length,0);assert.equal(s.targets[0].hits,1);
});
test('Special reaches full charge at its configured duration',()=>{
 const s=createState(profile);setMode(s,'Special');
 step(s,{x:1,y:0},CONFIG.specialChargeTime);assert.equal(s.player.charge,1);
 release(s);assert.equal(s.shots,1);assert.equal(s.player.charge,0);
});
