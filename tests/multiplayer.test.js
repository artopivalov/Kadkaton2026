import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,addPlayer,removePlayer,getPlayer,step,release,applyCommand,readyPortal,createRandom,nextRandom} from '../src/simulation.js';
import {createScene as debugScene} from '../src/scenes/debug.js';
import {createScene as lobbyScene} from '../src/scenes/lobby.js';
import {ITEM_BALANCE,PVP_BALANCE,CONFIG,SCENE_BALANCE} from '../src/balance.js';
const profile=(name)=>({name,color:'#79a9ff'});
function duel(type='fire'){
 const s=createState();const a=addPlayer(s,profile('A')),b=addPlayer(s,profile('B'));
 a.x=300;a.y=450;a.angle=0;b.x=420;b.y=450;a.wand={id:90,type};b.wand={id:91,type:'test'};return {s,a,b};
}
test('players get unique ids, separate spawn points and independent state',()=>{
 const s=createState();const a=addPlayer(s,profile('A')),b=addPlayer(s,profile('B'));
 assert.notEqual(a.id,b.id);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=SCENE_BALANCE.spawnSpacing);
 assert.notEqual(a.wand.id,b.wand.id);assert.equal(getPlayer(s,b.id),b);
 applyCommand(s,a.id,{type:'setMode',mode:'Normal'});assert.equal(a.mode,'Normal');assert.equal(b.mode,'Safe');
 step(s,{[a.id]:{x:1,y:0,held:true}},.5);assert.ok(a.x>s.spawn.x);assert.ok(a.charge>0);assert.equal(b.charge,0);assert.equal(b.x,s.spawn.x+SCENE_BALANCE.spawnSpacing);
});
test('missing input means an idle player; each player follows only their own input',()=>{
 const s=createState();const a=addPlayer(s,profile('A')),b=addPlayer(s,profile('B'));const bx=b.x;
 step(s,{[a.id]:{x:0,y:1}},.5);assert.ok(a.y>s.spawn.y);assert.equal(b.x,bx);
});
test('release command is applied inside the tick, before charging continues',()=>{
 const {s,a}=duel();applyCommand(s,a.id,{type:'setMode',mode:'Normal'});
 step(s,{[a.id]:{x:0,y:0,held:true}},.6);assert.ok(a.charge>0);
 step(s,{[a.id]:{x:0,y:0,held:false,commands:[{type:'release'}]}},.01);
 assert.equal(s.projectiles.length,1);assert.equal(s.projectiles[0].owner,a.id);assert.equal(a.charge,0);
 step(s,{[a.id]:{x:0,y:0,held:true,commands:[{type:'setMode',mode:'Special'},{type:'cancel'}]}},.01);
 assert.equal(a.mode,'Special');assert.ok(a.charge<.01);
});
test('friendly fire deals half damage to another player and never hits the attacker',()=>{
 const {s,a,b}=duel();applyCommand(s,a.id,{type:'setMode',mode:'Normal'});a.charge=1;release(s,a.id);
 for(let i=0;i<60;i++)step(s,{},1/60);
 assert.equal(b.hits,2);assert.equal(b.damage,CONFIG.normalDamage*(1+ITEM_BALANCE.splashDamage)*PVP_BALANCE.friendlyFireMultiplier);assert.equal(a.hits,0);assert.equal(a.damage,0);
 // A fire sphere reaches the other player but not its caster.
 const sphere=duel();applyCommand(sphere.s,sphere.a.id,{type:'setMode',mode:'Special'});sphere.a.charge=1;release(sphere.s,sphere.a.id);
 assert.equal(sphere.b.damage,CONFIG.specialDamage/2);assert.equal(sphere.a.damage,0);
});
test('dummies still take full damage while players take the friendly fire share',()=>{
 const {s,a,b}=duel();b.x=300;b.y=800;s.targets=[{id:4,x:360,y:450,hits:0,damage:0}];
 applyCommand(s,a.id,{type:'setMode',mode:'Special'});a.charge=1;release(s,a.id);
 assert.equal(s.targets[0].damage,CONFIG.specialDamage);
});
test('Test Wand never damages another player but pushes them',()=>{
 const {s,a,b}=duel('test');applyCommand(s,a.id,{type:'setMode',mode:'Normal'});a.charge=1;release(s,a.id);
 for(let i=0;i<60;i++)step(s,{},1/60);assert.equal(b.damage,0);assert.ok(b.x>420);
});
test('pedestals and portals are tracked per player',()=>{
 const s=debugScene();const a=addPlayer(s,profile('A')),b=addPlayer(s,profile('B'));
 const pedestal=s.pedestals.find(p=>p.type==='ice');a.x=pedestal.x;a.y=pedestal.y;
 step(s,{},.01);assert.equal(a.wand.type,'ice');assert.equal(b.wand.type,'test');assert.equal(a.activePedestal,pedestal.id);assert.equal(b.activePedestal,null);
});
test('dropped wand goes to the first nearby free-handed player only',()=>{
 const {s,a,b}=duel();a.wand=null;b.wand=null;b.x=330;s.items=[{id:50,type:'ice',x:315,y:450,availableAt:0}];
 step(s,{},.01);assert.equal(a.wand.id,50);assert.equal(b.wand,null);assert.equal(s.items.length,0);
});
test('a leaving player drops their wand and stops taking part',()=>{
 const {s,a,b}=duel();assert.ok(removePlayer(s,a.id));assert.equal(getPlayer(s,a.id),undefined);
 assert.equal(s.items.length,1);assert.equal(s.items[0].id,90);assert.equal(removePlayer(s,a.id),false);step(s,{[a.id]:{x:1,y:0}},.1);
});
test('a portal is ready only when every player stands in it',()=>{
 const s=lobbyScene();const a=addPlayer(s,profile('A')),b=addPlayer(s,profile('B'));
 s.portals[0].available=true;a.x=s.portals[0].x;a.y=s.portals[0].y;step(s,{},.01);assert.equal(readyPortal(s),null);
 b.x=s.portals[0].x;b.y=s.portals[0].y;step(s,{},.01);assert.equal(readyPortal(s).id,s.portals[0].id);
 s.portals[0].available=false;assert.equal(readyPortal(s),null);
});
test('the same seed produces the same sequence and different seeds differ',()=>{
 const x=createRandom(42),y=createRandom(42),z=createRandom(43);
 const first=[x(),x(),x()];assert.deepEqual(first,[y(),y(),y()]);assert.notDeepEqual(first,[z(),z(),z()]);
 assert.ok(first.every(v=>v>=0&&v<1));
 const s=createState(null,{seed:42}),t=createState(null,{seed:42});assert.equal(s.seed,42);assert.equal(nextRandom(s),nextRandom(t));
 assert.equal(nextRandom(createState(null,{seed:42})),createRandom(42)());
});
test('state survives a JSON round trip and stays in lockstep with the original',()=>{
 const {s,a}=duel('ice');applyCommand(s,a.id,{type:'setMode',mode:'Normal'});a.charge=1;release(s,a.id);
 const copy=JSON.parse(JSON.stringify(s));assert.deepEqual(copy,s);
 const inputs={[a.id]:{x:0,y:1,held:false}};
 for(let i=0;i<90;i++){step(s,inputs,1/60);step(copy,inputs,1/60);}
 assert.deepEqual(copy,s);
});
