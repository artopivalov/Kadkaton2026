import test from 'node:test';
import assert from 'node:assert/strict';
import {createScene as debugScene} from '../src/scenes/debug.js';
import {createScene as lobbyScene} from '../src/scenes/lobby.js';
import {createState,step,setMode,release,dropWand} from '../src/simulation.js';
import {WANDS} from '../src/wands.js';
import {AIR_BALANCE,EARTH_BALANCE,TEST_BALANCE} from '../src/balance.js';
const profile={name:'Test',color:'#79a9ff'};
const target=(id,x,y)=>({id,x,y,hits:0,damage:0});
function equipped(type,mode='Normal'){const s=createState(profile);s.player.wand={id:2,type};s.player.angle=0;setMode(s,mode);return s;}
test('debug scene has every wand on permanent pedestals, no loose starting items',()=>{
 const s=debugScene(profile);assert.equal(s.scene.id,'debug');assert.equal(s.items.length,0);
 assert.deepEqual(s.pedestals.map(p=>p.type).sort(),Object.keys(WANDS).sort());
 const pedestal=s.pedestals.find(p=>p.type==='earth');s.player.x=pedestal.x;s.player.y=pedestal.y;
 step(s,{x:0,y:0},.01);assert.equal(s.player.wand.type,'earth');assert.equal(s.pedestals.length,6);
 const id=s.player.wand.id;setMode(s,'Normal');step(s,{x:0,y:0,held:true},.1);
 assert.equal(s.player.wand.id,id);assert.ok(s.player.charge>0);
 dropWand(s);step(s,{x:0,y:0},.01);assert.equal(s.player.wand,null);
 s.player.x+=100;step(s,{x:0,y:0},.01);s.player.x=pedestal.x;step(s,{x:0,y:0},.01);assert.equal(s.player.wand.type,'earth');
});
test('game lobby has a harmless starter and portals without playground entities',()=>{
 const s=lobbyScene(profile);assert.equal(s.player.wand.type,'test');assert.equal(s.scene.id,'lobby');
 assert.equal(s.pedestals.length,0);assert.equal(s.targets.length,0);assert.equal(s.items.length,0);assert.ok(s.portals.length>0);
 assert.ok(s.portals.every(p=>!p.available));s.player.x=s.portals[0].x;s.player.y=s.portals[0].y;
 step(s,{x:0,y:0},.01);assert.equal(s.nearPortal,s.portals[0].id);
});
test('Test Wand has zero damage in both modes, with small Normal push only',()=>{
 const s=equipped('test');s.targets=[target(4,680,450)];s.player.charge=1;release(s);
 for(let i=0;i<60;i++)step(s,{x:0,y:0},1/60);
 assert.equal(s.targets[0].damage,0);assert.ok(s.targets[0].x>680);
 const before={x:s.targets[0].x,y:s.targets[0].y};setMode(s,'Special');s.player.charge=1;release(s);
 assert.equal(s.targets[0].damage,0);assert.equal(s.targets[0].x,before.x);assert.equal(s.effects.at(-1).kind,'testSphere');
});
test('Air Normal damages on impact and pushes nearby targets apart',()=>{
 const s=equipped('air');s.targets=[target(4,700,450),target(5,700,480),target(6,700,420)];s.player.charge=1;release(s);
 for(let i=0;i<60;i++)step(s,{x:0,y:0},1/60);
 assert.ok(s.targets[0].damage>0);assert.ok(s.targets[1].y>480);assert.ok(s.targets[2].y<420);
});
test('Air Special strongly pushes every nearby target without invented damage',()=>{
 const s=equipped('air','Special');s.targets=[target(4,660,450),target(5,540,450),target(6,900,450)];
 s.player.charge=1;release(s);assert.ok(s.targets[0].x>660);assert.ok(s.targets[1].x<540);assert.equal(s.targets[2].x,900);
 assert.ok(s.targets.every(t=>t.damage===0));assert.equal(s.effects[0].kind,'airSphere');
});
test('Earth boulder ricochets off an internal wall and a world boundary without tunneling',()=>{
 const s=equipped('earth');s.targets=[];s.walls=[{id:20,x:800,y:350,width:20,height:200,permanent:true}];
 s.player.charge=1;release(s);const b=s.projectiles[0];step(s,{x:0,y:0},.8);
 assert.ok(b.ricochets>=1);assert.ok(b.x<800-b.radius);assert.ok(Math.cos(b.angle)<0);
 const edge=equipped('earth');edge.player.x=1100;edge.player.charge=1;release(edge);const e=edge.projectiles[0];step(edge,{x:0,y:0},.4);
 assert.ok(e.ricochets>=1);assert.ok(Math.cos(e.angle)<0);assert.ok(e.x<=1200-e.radius);
});
test('Earth wall blocks movement and ordinary shots, cannot be damaged, and expires',()=>{
 const s=equipped('earth','Special');s.player.charge=1;release(s);assert.equal(s.walls.length,1);const wall=s.walls[0];
 step(s,{x:1,y:0},1);assert.ok(s.player.x<=wall.x-20);
 s.player.x=600;s.player.angle=0;s.player.wand={id:3,type:'fire'};setMode(s,'Normal');s.player.charge=1;
 s.targets=[target(4,900,450)];release(s);step(s,{x:0,y:0},1);assert.equal(s.targets[0].damage,0);assert.equal(s.walls.length,1);
 assert.equal(s.walls[0].expiresAt,wall.expiresAt);step(s,{x:0,y:0},EARTH_BALANCE.wallDuration);assert.equal(s.walls.length,0);
});
test('Lightning sky strike hits beyond a real Earth wall while normal line is blocked',()=>{
 const s=equipped('earth','Special');s.player.charge=1;release(s);s.targets=[target(4,902.5,450)];
 s.player.wand={id:3,type:'lightning'};setMode(s,'Normal');s.player.charge=1;release(s);assert.equal(s.targets[0].damage,0);
 setMode(s,'Special');s.player.charge=.5;release(s);assert.ok(s.targets[0].damage>0);assert.equal(s.walls.length,1);
});
test('Earth wall refuses overlapping actors and existing geometry',()=>{
 const s=equipped('earth','Special');s.targets=[target(4,700,450)];s.player.charge=1;release(s);assert.equal(s.walls.length,0);
 s.targets=[];s.player.charge=1;release(s);assert.equal(s.walls.length,1);s.player.charge=1;release(s);assert.equal(s.walls.length,1);
});
test('boulder launched at the world edge remains inside and ricochets',()=>{
 const s=equipped('earth');s.player.x=1180;s.player.charge=1;release(s);const b=s.projectiles[0];
 assert.ok(b.x<=1200-b.radius);step(s,{x:0,y:0},.1);assert.ok(b.ricochets>0);assert.ok(b.x<=1200-b.radius);
});
