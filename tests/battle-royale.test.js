import test from 'node:test';
import assert from 'node:assert/strict';
import {enterBattleRoyale,safeRadius,cameraPlayer,screenInput} from '../src/battle-royale.js';
import {createScene,configureLobby} from '../src/scenes/lobby.js';
import {addPlayer,step,release,readyPortal,removePlayer} from '../src/simulation.js';
import {enterLocation} from '../src/locations.js';
import {buildSnapshot,applySnapshot,cloneForPrediction} from '../src/net/snapshot.js';
import {render} from '../src/renderer.js';
const profile={name:'Wizard',color:'#79a9ff'};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function arena(n=1){const s=createScene(profile,{seed:9876});for(let i=1;i<n;i++)addPlayer(s,{...profile,name:`Player ${i+1}`});return enterBattleRoyale(s);}
function equip(p,type,mode='Normal'){p.wand={id:50,type};p.rune=null;p.mode=mode;p.charge=1;p.angle=0;}
test('side portal requires the entire lobby, including the host',()=>{
 const s=createScene(profile),p=addPlayer(s,profile),portal=s.portals.find(p=>p.location==='battleRoyale');
 s.players[0].x=portal.x;s.players[0].y=portal.y;step(s,{},.01);assert.equal(readyPortal(s),null);
 p.x=portal.x;p.y=portal.y;step(s,{},.01);assert.equal(readyPortal(s).id,portal.id);
});
test('full lobby receives Legendary equipment, equal starts and symmetric narrow cover for 2–8 players',()=>{
 for(let n=2;n<=8;n++){
  const s=arena(n),b=s.battleRoyale;assert.equal(s.players.length,n);assert.equal(s.walls.length,n*6);assert.equal(b.solo,false);
  for(const p of s.players){assert.equal(p.health,1000);assert.equal(p.maxHealth,1000);assert.equal(p.wand.rarity,'Legendary');assert.equal(p.rune.rarity,'Legendary');close(Math.hypot(p.x-b.x,p.y-b.y),900*.78);const d=screenInput({x:0,y:-1},p.cameraAngle);close(Math.cos(Math.atan2(d.y,d.x)-Math.atan2(b.y-p.y,b.x-p.x)),1);}
  assert.ok(s.walls.every(w=>w.width<=100&&w.width>=60&&w.height===24&&w.permanent));
 }
});
test('solo bots stand idle, take lava damage and never end a surviving human run',()=>{
 const s=arena(),human=s.players[0],bots=s.players.slice(1),positions=bots.map(p=>[p.x,p.y]);
 step(s,Object.fromEntries(bots.map(p=>[p.id,{x:1,y:1,held:true,commands:[{type:'release'}]}])),1);
 assert.deepEqual(bots.map(p=>[p.x,p.y]),positions);assert.equal(s.shots,0);
 human.x=s.battleRoyale.x;human.y=s.battleRoyale.y;
 for(let i=0;i<24;i++)step(s,{},1);
 assert.ok(bots.every(p=>p.health===0));assert.equal(s.completed,false);assert.equal(human.health,1000);
 human.health=0;step(s,{},.01);assert.equal(s.battleRoyale.result.kind,'survived');assert.equal(s.completed,true);
});
test('lava is based on maximum HP, continuous exposure, and keeps burning the center after 60 seconds',()=>{
 const s=arena();s.players.slice(1).forEach(p=>p.health=0);const p=s.players[0];p.x=s.battleRoyale.x+950;p.y=s.battleRoyale.y;p.health=500;
 step(s,{},.25);close(p.health,475);step(s,{},.75);close(p.health,400);
 close(safeRadius(s,s.battleRoyale.startedAt+30),450);close(safeRadius(s,s.battleRoyale.startedAt+60),0);
 p.x=s.battleRoyale.x;p.y=s.battleRoyale.y;p.health=1000;s.time=s.battleRoyale.startedAt+59.9;step(s,{},.2);close(p.health,990);
 step(s,{},1);close(p.health,890);
});
test('lava contact during a tick is prorated and independent of timestep for stationary actors',()=>{
 const a=arena(),b=structuredClone(a);
 for(const s of [a,b]){s.players.slice(1).forEach(p=>p.health=0);s.time=12;s.players[0].x=s.battleRoyale.x+900*.78;s.players[0].y=s.battleRoyale.y;}
 step(a,{},2);for(let i=0;i<120;i++)step(b,{},1/60);close(a.players[0].health,920);close(a.players[0].health,b.players[0].health);
});
test('simultaneous last deaths draw; winner freezes combat; dead players spectate',()=>{
 const s=arena(3);s.players[0].health=0;assert.equal(cameraPlayer(s,s.players[0].id).id,s.players[1].id);assert.equal(cameraPlayer(s,s.players[0].id,s.players[2].id).id,s.players[2].id);
 for(const p of s.players.slice(1)){p.health=10;p.x=s.battleRoyale.x+950;p.y=s.battleRoyale.y;}
 step(s,{},.1);assert.equal(s.battleRoyale.result.kind,'draw');assert.equal(s.completed,true);
 const won=arena(2);won.players[0].health=0;step(won,{},.01);assert.equal(won.battleRoyale.result.playerId,won.players[1].id);const time=won.time;step(won,{[won.players[1].id]:{x:1,y:0}},1);assert.equal(won.time,time);
 const left=arena(2);removePlayer(left,left.players[1].id);step(left,{},.01);assert.equal(left.battleRoyale.result.kind,'winner');
});
test('PvP retains half damage and both push and pull are tripled',()=>{
 function hit(br,type){const s=arena(2);if(!br)delete s.battleRoyale;s.walls=[];const [p,q]=s.players;p.x=700;p.y=700;q.x=760;q.y=700;equip(p,type,'Special');release(s,p.id);step(s,{},type==='gravity'?.1:.3);return {s,p,q,shift:Math.hypot(q.x-760,q.y-700)};}
 const normal=hit(false,'air'),battle=hit(true,'air');close(battle.shift,normal.shift*3);close(battle.q.damage,normal.q.damage);assert.ok(battle.q.damage>0);
 function pull(br){const s=arena(2);if(!br)delete s.battleRoyale;s.walls=[];const [p,q]=s.players;p.x=700;p.y=700;q.x=850;q.y=700;s.effects=[{kind:'gravityWell',owner:p.id,x:800,y:700,radius:100,pullSpeed:10,life:1,tick:1,tickInterval:.5,damage:10}];step(s,{},.1);return 850-q.x;}
 close(pull(true),3);close(pull(false),0);
});
test('snapshot and prediction preserve battle state and include distant combat for spectators',()=>{
 const s=arena(4);s.players[0].health=0;s.projectiles.push({id:888,owner:s.players[2].id,x:2000,y:20});
 const snap=JSON.parse(JSON.stringify(buildSnapshot(s,s.players[0].id,{tick:1,ack:0}))),remote=applySnapshot({},snap);
 assert.deepEqual(remote.battleRoyale,s.battleRoyale);assert.equal(remote.projectiles.length,1);assert.equal(remote.players[2].cameraAngle,s.players[2].cameraAngle);
 const clone=cloneForPrediction(remote);step(clone,{},.01);assert.equal(remote.time,s.time);assert.deepEqual(remote.battleRoyale,s.battleRoyale);
});
test('return and repeat remove bots and reset HP and camera without stacking modifiers',()=>{
 const s=arena();configureLobby(s);assert.equal(s.players.length,1);assert.equal(s.players[0].health,100);assert.equal(s.players[0].maxHealth,undefined);assert.equal(s.players[0].cameraAngle,undefined);assert.equal(s.battleRoyale,undefined);
 enterBattleRoyale(s);assert.equal(s.players.length,3);assert.equal(s.players[0].health,1000);enterLocation(s,'forest');assert.equal(s.players.length,1);assert.equal(s.players[0].maxHealth,undefined);
});
test('render uses each fixed camera rotation and max HP bars, with upright labels',()=>{
 const s=arena(4),p=s.players[1];p.health=500;const calls=[];const ctx=new Proxy({measureText:t=>({width:t.length*8})},{get:(target,key)=>key in target?target[key]:(...args)=>calls.push({key,args})});
 render(ctx,s,400,700,p.id,{zoom:.72});const transform=calls.filter(c=>c.key==='setTransform').at(-1).args;close(transform[0],0);assert.ok(Math.abs(transform[1])>.1);assert.ok(calls.some(c=>c.key==='fillRect'&&c.args[0]===p.x-28&&c.args[2]===28&&c.args[3]===8));assert.ok(calls.some(c=>c.key==='rotate'&&c.args[0]===-p.cameraAngle));
});

test('rotated arena walls block movement and projectiles equally from each sector',()=>{
 for(let sector=0;sector<4;sector++){
  const s=arena(4),p=s.players[sector],wall=s.walls[sector*3],cx=wall.x+wall.width/2,cy=wall.y+wall.height/2,a=wall.angle+Math.PI/2;
  s.walls=[wall];p.x=cx+Math.cos(a)*100;p.y=cy+Math.sin(a)*100;
  step(s,{[p.id]:{x:-Math.cos(a),y:-Math.sin(a)}},1);
  assert.ok(Math.hypot(p.x-cx,p.y-cy)>=wall.height/2+20-.01);
  p.x=cx+Math.cos(a)*100;p.y=cy+Math.sin(a)*100;equip(p,'fire');p.angle=a+Math.PI;release(s,p.id);step(s,{},1);assert.equal(s.projectiles.length,0);
 }
});
test('Legendary offensive fields and traps can target rival players without healing past max HP',()=>{
 for(const type of ['gravity','nature','storm','crystal']){
  const s=arena(2),[p,q]=s.players;s.walls=[];p.x=700;p.y=700;equip(p,type,'Special');release(s,p.id);const e=s.effects.find(e=>e.owner===p.id);q.x=e.x+30;q.y=e.y;const x=q.x;step(s,{},.1);assert.ok(q.damage>0,`${type} must affect PvP`);if(type==='gravity')assert.ok(q.x<x);
 }
 const s=arena(2),[p,q]=s.players;s.walls=[];p.x=700;p.y=700;q.x=740;q.y=700;q.health=990;equip(p,'lightning');p.rune={special:['healing']};release(s,p.id);assert.ok(q.health>990&&q.health<=1000);
});
test('a client receives arena, death, spectator scene and final draw through the real snapshot transport',async()=>{
 const {createNetwork}=await import('../src/net/loopback.js'),{createHost}=await import('../src/net/host.js'),{createClient}=await import('../src/net/client.js');
 const net=createNetwork(),s=createScene(profile),host=createHost(s),[a,b]=net.pair();host.addPeer('remote',a);const client=createClient(b,{...profile,name:'Remote'},{now:()=>net.now});net.advance(0);
 const frame=()=>{step(s,host.collectInputs(),1/60);host.afterTick();net.advance(1000/60);return client.update(net.now,()=>({x:0,y:0,held:false,commands:[]}));};
 for(let i=0;i<12;i++)frame();assert.ok(client.ready);enterBattleRoyale(s);let shown;for(let i=0;i<12;i++)shown=frame();assert.equal(shown.battleRoyale.solo,false);assert.equal(shown.players.length,2);assert.equal(shown.players.find(p=>p.id===client.localId).maxHealth,1000);
 s.players.forEach(p=>p.health=0);for(let i=0;i<12;i++)shown=frame();assert.equal(shown.completed,true);assert.equal(shown.battleRoyale.result.kind,'draw');host.close();client.close();
});
