import test from 'node:test';
import assert from 'node:assert/strict';
import {createScene as lobbyScene} from '../src/scenes/lobby.js';
import {createScene as debugScene} from '../src/scenes/debug.js';
import {createState,addPlayer,getPlayer,step} from '../src/simulation.js';
import {enterLocation} from '../src/locations.js';
import {createHost} from '../src/net/host.js';
import {createClient} from '../src/net/client.js';
import {createNetwork} from '../src/net/loopback.js';
import {encode,split,createReassembler} from '../src/net/codec.js';
import {buildSnapshot,applySnapshot} from '../src/net/snapshot.js';
import {generateLocation} from '../src/generator.js';
import {NET_BALANCE} from '../src/balance.js';
const TICK=NET_BALANCE.tick;
// A host with one remote client; both advance on a shared manual clock (one render frame = one tick).
function session({latency=0,jitter=0,loss=0,scene=lobbyScene,seeded=Math.random}={}){
 const state=scene({name:'Host',color:'#ff0000'}),network=createNetwork({latency,jitter,loss,random:seeded});
 const events=[];const host=createHost(state,{onJoin:name=>events.push(`join ${name}`),onLeave:name=>events.push(`leave ${name}`)});
 const [hostEnd,clientEnd]=network.pair();host.addPeer('c1',hostEnd);
 let input={x:0,y:0,held:false},commands=[];
 const client=createClient(clientEnd,{name:'Guest',color:'#00ff00'},{now:()=>network.now,onClose:reason=>events.push(`closed ${reason}`)});
 let latest=null;
 const api={state,host,client,network,events,
  setInput(next){input=next;},command(c){commands.push(c);},get view(){return latest;},
  frame(ms=1000/60){
   network.advance(ms);
   step(state,{1:{x:0,y:0,held:false},...host.collectInputs()},TICK);host.afterTick();
   latest=client.update(network.now,()=>({...input,commands:commands.splice(0)}))??latest;
  },
  run(frames){for(let i=0;i<frames;i++)api.frame();}
 };
 return api;
}
test('snapshots survive encoding and chunking',()=>{
 const big={t:'snap',list:Array.from({length:3000},(_,i)=>({id:i,x:i+.123456,y:-i,name:'é'.repeat(5)}))};
 const text=encode(big);assert.ok(text.length>NET_BALANCE.chunkSize);
 const parts=split(text,7);assert.ok(parts.length>1);
 const reassemble=createReassembler();let out=null;for(const part of [...parts].reverse())out=reassemble(part)??out;
 assert.equal(out.list.length,3000);assert.equal(out.list[1].x,1.12);
 assert.equal(createReassembler()(parts[0]),null);
});
test('a map rebuilt from a seed is identical to the host map, and progress follows snapshots',()=>{
 const host=createState({name:'A',color:'#112233'});enterLocation(host,'cave',1234);
 const view={};applySnapshot(view,JSON.parse(encode(buildSnapshot(host,1,{tick:3,ack:0}))));
 assert.deepEqual(view.map,host.map);
 const poi=host.map.pois[0];poi.completed=true;poi.opened=true;if(poi.plates.length)poi.plates[1].active=true;
 applySnapshot(view,JSON.parse(encode(buildSnapshot(host,1,{tick:6,ack:0}))));
 assert.deepEqual(view.map,host.map);
 assert.deepEqual(generateLocation('cave',1234,1),generateLocation('cave',1234,1));
});
test('snapshots only include nearby enemies and projectiles',()=>{
 const s=createState({name:'A',color:'#112233'});enterLocation(s,'forest',5);
 const p=s.players[0];s.enemies.forEach((e,i)=>{e.x=p.x+(i%2?100:NET_BALANCE.viewRadius+500);e.y=p.y;});
 const snap=buildSnapshot(s,p.id,{tick:1,ack:0});
 assert.ok(snap.enemies.length>0&&snap.enemies.length<s.enemies.length);assert.ok(snap.enemies.every(e=>Math.hypot(e.x-p.x,e.y-p.y)<=NET_BALANCE.viewRadius));
});
test('a client joins, gets a player on the host and a first snapshot',()=>{
 const t=session({latency:30});t.run(30);
 assert.ok(t.client.ready);assert.equal(t.state.players.length,2);assert.ok(t.events.includes('join Guest'));
 assert.equal(t.view.players.length,2);assert.equal(getPlayer(t.view,t.client.localId).name,'Guest');
 assert.equal(t.view.scene.id,'lobby');
});
test('local movement is predicted at once, before the host has seen the input',()=>{
 const t=session({latency:100});t.run(60);const id=t.client.localId,start=getPlayer(t.view,id).x;
 t.setInput({x:1,y:0,held:false});t.run(6);
 const predicted=getPlayer(t.view,id).x,authoritative=getPlayer(t.state,id).x;
 assert.ok(predicted-start>10,`predicted ${predicted-start}`);assert.ok(predicted>authoritative,'the host is still behind');
});
test('prediction converges to the host position without drifting, even with loss and jitter',()=>{
 let seed=7;const random=()=>(seed=(seed*1664525+1013904223)>>>0)/4294967296;
 const t=session({latency:80,jitter:40,loss:.15,seeded:random});t.run(60);
 t.setInput({x:1,y:.3,held:false});t.run(120);t.setInput({x:0,y:0,held:false});t.run(120);
 const id=t.client.localId,view=getPlayer(t.view,id),host=getPlayer(t.state,id);
 assert.ok(Math.hypot(view.x-host.x,view.y-host.y)<2,`gap ${Math.hypot(view.x-host.x,view.y-host.y)}`);
});
test('commands (mode, drop, release) reach the host once even over a lossy link',()=>{
 let seed=3;const random=()=>(seed=(seed*1664525+1013904223)>>>0)/4294967296;
 const t=session({latency:60,loss:.3,seeded:random});t.run(60);const id=t.client.localId;
 t.command({type:'drop'});t.run(40);
 assert.equal(getPlayer(t.state,id).wand,null);assert.equal(t.state.items.length,1);
 t.command({type:'setMode',mode:'Normal'});t.run(40);assert.equal(getPlayer(t.state,id).mode,'Normal');
});
test('a cast shows up on the client immediately and is replaced by the host version',()=>{
 const t=session({latency:120,scene:debugScene});t.run(80);const id=t.client.localId;
 const me=getPlayer(t.state,id);me.wand={id:900,type:'fire'};t.run(10);
 t.command({type:'setMode',mode:'Normal'});t.setInput({x:0,y:0,held:true});t.run(75);t.setInput({x:0,y:0,held:false});
 t.command({type:'release'});t.frame();
 assert.ok(t.view.projectiles.some(b=>b.owner===id),'predicted projectile is visible at once');
 assert.equal(t.state.projectiles.filter(b=>b.owner===id).length,0,'the host has not received the cast yet');
 t.run(60);
 const mine=t.view.projectiles.filter(b=>b.owner===id),onHost=t.state.projectiles.filter(b=>b.owner===id);
 assert.equal(t.state.shots,1,'the host performed the cast');
 assert.ok(onHost.length>=1);assert.equal(mine.length,onHost.length,'one projectile per host projectile, no leftover ghost');
});
test('other players move smoothly between snapshots',()=>{
 const t=session({latency:40});t.run(40);
 t.state.players[0].x=300;t.state.players[0].y=300;
 const xs=[];
 for(let i=0;i<60;i++){t.state.players[0].x+=2;t.frame();xs.push(getPlayer(t.view,1).x);}
 const steps=xs.slice(20).map((x,i,a)=>i?x-a[i-1]:0).slice(1);
 assert.ok(steps.every(d=>d>=0),'never moves backwards');
 assert.ok(Math.max(...steps)<4,`largest jump ${Math.max(...steps)}`);
});
test('leaving and a closed link are handled on both sides',()=>{
 const t=session({latency:20});t.run(30);assert.equal(t.state.players.length,2);
 t.client.close();t.network.advance(100);t.frame();
 assert.equal(t.state.players.length,1);assert.ok(t.events.includes('leave Guest'));
 const u=session({latency:20});u.run(30);u.host.close('Bye.');u.network.advance(100);
 assert.ok(u.events.some(e=>e==='closed Bye.'));assert.equal(u.state.players.length,1);
});
test('the host refuses extra players beyond the room size',()=>{
 const state=lobbyScene({name:'Host',color:'#ff0000'}),network=createNetwork();const host=createHost(state,{maxPlayers:2});
 const ends=[];for(let i=0;i<2;i++){const [a,b]=network.pair();host.addPeer(`c${i}`,a);ends.push(b);}
 const reasons=[];ends.forEach(end=>{end.onmessage=m=>{if(m.t==='bye')reasons.push(m.reason);};end.send({t:'hello',name:'G',color:'#00ff00'},true);});
 network.advance(10);assert.equal(state.players.length,2);assert.deepEqual(reasons,['The room is full.']);
});
test('bad input from a client cannot break the host',()=>{
 const t=session();t.run(20);
 const peer=t.host.peers.get('c1');
 for(const bad of [null,5,'x',{t:'in'},{t:'in',frames:'no'},{t:'in',frames:[null,{seq:'a'},{seq:-5},{seq:1e9,x:'NaN',commands:'x'}]},{t:'hello'},{t:'ping'}])assert.doesNotThrow(()=>peer.link.onmessage(bad));
 assert.doesNotThrow(()=>t.run(10));
});
test('a scene change on the host (lobby to a generated location) reaches the client with the same map',()=>{
 const t=session({latency:30});t.run(40);
 enterLocation(t.state,'forest',777);t.run(40);
 assert.equal(t.view.scene.id,'forest');assert.deepEqual(t.view.map.pois.map(p=>[p.x,p.y,p.type]),t.state.map.pois.map(p=>[p.x,p.y,p.type]));
 assert.equal(t.view.map.partySize,t.state.map.partySize);
 const poi=t.state.map.pois[0];poi.completed=true;t.run(20);assert.equal(t.view.map.pois[0].completed,true);
 const me=getPlayer(t.view,t.client.localId),host=getPlayer(t.state,t.client.localId);assert.ok(Math.hypot(me.x-host.x,me.y-host.y)<2);
});
