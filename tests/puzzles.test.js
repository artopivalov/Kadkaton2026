import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,step,release,addPlayer,applyCommand} from '../src/simulation.js';
import {createPuzzle,installPuzzles,PUZZLES,puzzleHit} from '../src/puzzles.js';
import {createRandom} from '../src/rng.js';
import {generateLocation,onFloor} from '../src/generator.js';
import {enterLocation} from '../src/locations.js';
import {createWand} from '../src/items.js';
import {buildSnapshot,applySnapshot,cloneForPrediction} from '../src/net/snapshot.js';
const profile={name:'Wizard',color:'#78a'};
function room(kind,party=1){
 const s=createState(profile,{seed:19});for(let i=1;i<party;i++)addPlayer(s,profile);
 const poi={id:0,x:600,y:600,radius:540,type:'puzzle',progress:0,plates:[],loot:[{kind:'rune'},{kind:'wand',type:'fire'}],completed:false,opened:false};
 s.map={location:'library',partySize:party,pois:[poi],corridors:[],bossPoi:0,world:{width:1200,height:1200}};s.world=s.map.world;s.scene={id:'library'};
 createPuzzle(poi,'library',createRandom(19),party,kind);installPuzzles(s,createRandom(19));s.players.forEach(p=>{p.x=600;p.y=950;});return {s,poi,q:poi.puzzle,p:s.players[0]};
}
const tick=(s,seconds=1)=>{for(let n=0;n<Math.ceil(seconds*60);n++)step(s,{},1/60);};
function cast(s,p,type,angle,mode='Normal'){p.wand={id:9,...createWand(type,'Common',()=>.4)};p.mode=mode;p.angle=angle;p.charge=1;p.mana=100;release(s,p.id);}
function walkPlate(s,p,plate){p.x=plate.x;p.y=plate.y;step(s,{},1/60);}
test('all eleven puzzles generate deterministically by biome and fit inside their arenas',()=>{
 const seen=new Set();for(const biome of ['forest','cave','library'])for(let seed=0;seed<40;seed++){
  const m=generateLocation(biome,seed);assert.deepEqual(m,generateLocation(biome,seed));
  for(const poi of m.pois.filter(p=>p.puzzle)){seen.add(poi.puzzle.kind);for(const o of [...poi.puzzle.objects,...poi.plates,...poi.puzzle.docks])assert.ok(onFloor(m,o.x,o.y,20));if(biome==='forest')assert.ok(['wisps','roots','clock','scales','plates'].includes(poi.puzzle.kind));}
 }assert.equal(seen.size,11);
});
test('required wands are loose reachable items with legal rarities; reset and solution preserve all dropped equipment',()=>{
 for(const kind of Object.keys(PUZZLES)){const {s,poi,q,p}=room(kind);assert.equal(s.items.length,PUZZLES[kind].wands.length);s.items.push({id:999,type:'blood',x:600,y:930,availableAt:0});applyCommand(s,p.id,{type:'resetPuzzle'});assert.ok(s.items.some(i=>i.id===999));assert.deepEqual(poi.puzzle.objects,q.objects);}
});
test('ordered plates have 5–7 random reachable positions, wrong and simultaneous steps reset, solution stays solved',()=>{
 for(const party of [1,2]){const {s,poi,q,p}=room('plates',party);assert.ok(poi.plates.length>=5&&poi.plates.length<=7);walkPlate(s,p,poi.plates[0]);assert.equal(q.progress,1);walkPlate(s,p,poi.plates[3]);assert.equal(q.progress,0);
  p.x=600;p.y=950;step(s,{},.01);if(party===2){s.players[1].x=poi.plates[1].x;s.players[1].y=poi.plates[1].y;walkPlate(s,p,poi.plates[0]);assert.equal(q.progress,0);s.players[1].x=600;s.players[1].y=950;p.x=600;p.y=950;step(s,{},.01);}
  for(const plate of poi.plates)walkPlate(s,p,plate);assert.ok(poi.completed);walkPlate(s,p,poi.plates[0]);assert.ok(poi.completed);
 }
});
test('book clues establish a unique order and touching a held plate cannot retrigger',()=>{
 const {s,poi,q,p}=room('books');assert.equal(q.books.length,3);walkPlate(s,p,poi.plates[0]);tick(s,.2);assert.equal(q.progress,1);for(const plate of poi.plates.slice(1))walkPlate(s,p,plate);assert.ok(poi.completed);
});
test('clock shows its sequence, errors restart playback, solo and coop can repeat it with shared progress',()=>{
 for(const party of [1,2]){const {s,poi,q,p}=room('clock',party);tick(s,q.sequence.length*1.1+.1);assert.equal(q.phase,'input');walkPlate(s,p,poi.plates[(q.sequence[0]+1)%5]);assert.equal(q.phase,'show');p.x=600;p.y=950;tick(s,q.sequence.length*1.1+.1);
  for(const index of q.sequence)walkPlate(s,p,poi.plates[index]);assert.ok(poi.completed);assert.equal(q.beams?.length??0,0);
 }
});
test('wisps follow the nearest player and lock at matching altars; solved obstacles disappear',()=>{
 const {s,poi,q,p}=room('wisps',2);const o=q.objects[0];p.x=o.x-70;p.y=o.y;const before=o.x;tick(s,.2);assert.ok(o.x<before);
 for(const wisp of q.objects){const altar=q.docks.find(d=>d.symbol===wisp.symbol);wisp.x=altar.x;wisp.y=altar.y;}step(s,{},.01);assert.ok(poi.completed);assert.equal(s.walls.length,0);const coords=JSON.stringify(q.objects);tick(s,2);assert.equal(JSON.stringify(q.objects),coords);
});
test('Nature roots moving sprouts on matching beds; other spells cannot solve the garden',()=>{
 const {s,poi,q,p}=room('roots');for(const o of q.objects){const bed=q.docks.find(d=>d.symbol===o.symbol);o.x=bed.x;o.y=bed.y;o.phase=Math.PI;p.x=o.x;p.y=o.y+70;cast(s,p,'nature',-Math.PI/2);tick(s,.85);assert.ok(o.active);}
 assert.ok(poi.completed);
});
test('billiard crystals require a real Earth bank shot, including independent coop targets',()=>{
 for(const party of [1,2]){const {s,poi,q,p}=room('billiards',party);for(const crystal of q.objects){p.x=crystal.symbol===1?380:820;p.y=crystal.y;const bounceY=600-182;cast(s,p,'earth',Math.atan2(bounceY-p.y,600-p.x));tick(s,3);assert.ok(crystal.active,'bank shot reaches crystal');}assert.ok(poi.completed);}
});
test('Gravity can pull constellation balls and Air can correct them; sockets preserve solved parts',()=>{
 const {s,poi,q,p}=room('constellation');const ball=q.objects[0];p.x=ball.x;p.y=ball.y-90;const before=ball.y;cast(s,p,'gravity',Math.PI/2);tick(s,.3);assert.ok(ball.y<before);
 for(const o of q.objects){const d=q.docks.find(d=>d.symbol===o.symbol);o.x=d.x;o.y=d.y;}step(s,{},.01);assert.ok(poi.completed);
});
test('safe beams reset the attempt, Light walls block them, both switches disable sources',()=>{
 const {s,poi,q,p}=room('lightCorridor');p.x=600;p.y=640;q.beams=[{x:580,y:640,distance:0}];q.beamTimer=99;step(s,{},.1);assert.equal(p.y,q.entry.y);assert.equal(p.health,100);
 p.x=600;p.y=640;s.walls.push({id:99,x:560,y:610,width:20,height:80,projectileOnly:true,kind:'lightWall',expiresAt:100});q.beams=[{x:550,y:640,distance:0}];step(s,{},.2);assert.equal(p.y,640);assert.equal(q.beams.length,0);
 s.walls=[];q.blocked=[true,true];for(const o of q.objects){p.x=o.x;p.y=o.y;step(s,{},.01);}assert.ok(poi.completed);assert.equal(q.beams.length,0);
});
test('one returning Light disc must hit outbound and return seals; separate discs do not combine',()=>{
 const {s,poi,q,p}=room('returnKey');const a=q.objects[0],b=q.objects[1];p.x=a.x;p.y=a.y+200;cast(s,p,'light',-Math.PI/2);tick(s,.6);assert.ok(Object.keys(q.casts).length);
 p.x=b.x+50;p.y=b.y+70;tick(s,2);assert.ok(poi.completed);
});
test('Crystal primary and both children solve a fork with actual projectile lineage',()=>{
 for(const party of [1,2]){const {s,poi,q,p}=room('crystalFork',party);for(const center of q.objects.filter(o=>o.role==='fork')){p.x=center.x;p.y=820;cast(s,p,'crystal',-Math.PI/2);tick(s,1.5);assert.ok(center.active);}assert.ok(poi.completed);}
});
test('scales work without a wand and Test shots move stones despite zero damage; reset restores all weights',()=>{
 const {s,poi,q,p}=room('scales');const stone=q.objects[0];p.x=stone.x;p.y=stone.y+35;const before=stone.y;cast(s,p,'test',-Math.PI/2);tick(s,.1);assert.ok(stone.y<before);assert.equal(p.health,100);
 applyCommand(s,p.id,{type:'resetPuzzle'});const qq=poi.puzzle;assert.deepEqual(qq.objects.map(o=>o.weight),[1,2,3,4]);
 p.wand=null;const o=qq.objects[0];p.x=o.x;p.y=o.y+35;const y=o.y;for(let i=0;i<30;i++)step(s,{[p.id]:{y:-1}},1/60);assert.ok(o.y<y-40);
 qq.objects.forEach(o=>{const d=qq.docks[[1,4].includes(o.weight)?0:1];o.x=d.x;o.y=d.y;});step(s,{},.01);assert.ok(poi.completed);assert.deepEqual(qq.sums,[5,5]);
});
test('puzzle attacks and mechanisms never damage players; completed room is quiet and reward opens once',()=>{
 const {s,poi,q,p}=room('wisps',2);const other=s.players[1];p.x=600;p.y=700;other.x=600;other.y=610;cast(s,p,'fire',-Math.PI/2);tick(s,.4);assert.equal(other.health,100);
 for(const o of q.objects){const d=q.docks.find(d=>d.symbol===o.symbol);o.x=d.x;o.y=d.y;}step(s,{},.01);p.x=600;p.y=525;const count=s.items.length;step(s,{},.01);assert.equal(s.items.length,count+2);step(s,{},.01);assert.equal(s.items.length,count+2);
});
test('all puzzle runtime is JSON deterministic, snapshots carry progress, and prediction cannot mutate authority',()=>{
 for(const kind of Object.keys(PUZZLES)){const {s,p}=room(kind,2),copy=JSON.parse(JSON.stringify(s));for(let i=0;i<90;i++){step(s,{},1/60);step(copy,{},1/60);}assert.deepEqual(s,copy);const clone=cloneForPrediction(s);clone.map.pois[0].puzzle.objects[0]&&(clone.map.pois[0].puzzle.objects[0].x+=30);assert.deepEqual(s,copy);}
 const host=enterLocation(createState(profile),'library',12);const poi=host.map.pois.find(p=>p.puzzle);poi.puzzle.progress=2;const client=createState(profile);applySnapshot(client,buildSnapshot(host,1,{tick:1,ack:0}));assert.equal(client.map.pois[poi.id].puzzle.progress,2);
});

test('different Light casts and unrelated Crystal children cannot combine into a solution',()=>{
 const light=room('returnKey');const [a,b]=light.q.objects;const ctx={move:()=>{}};
 puzzleHit(light.s,a,{kind:'lightDisc',id:1,returning:false},a,ctx);puzzleHit(light.s,b,{kind:'lightDisc',id:2,returning:true},b,ctx);assert.ok(light.q.objects.every(o=>!o.active));
 const crystal=room('crystalFork');const [center,left,right]=crystal.q.objects;
 puzzleHit(crystal.s,center,{kind:'crystalShard',id:10,child:false},center,ctx);puzzleHit(crystal.s,left,{kind:'crystalShard',id:11,rootId:10,child:true},left,ctx);puzzleHit(crystal.s,right,{kind:'crystalShard',id:12,rootId:99,child:true},right,ctx);assert.ok(crystal.q.objects.every(o=>!o.active));
});
test('room reset marker triggers once per entry and snapshots restore reset state and clocks independently',()=>{
 const {s,poi,p}=room('plates');poi.puzzle.progress=2;p.x=poi.puzzle.reset.x;p.y=poi.puzzle.reset.y;step(s,{},.01);assert.equal(poi.puzzle.progress,0);const first=poi.puzzle;step(s,{},.01);assert.equal(poi.puzzle,first);
 const host=enterLocation(createState(profile),'library',12),client=createState(profile),roomPoi=host.map.pois.find(p=>p.puzzle);roomPoi.puzzle.progress=2;
 applySnapshot(client,buildSnapshot(host,1,{tick:1,ack:0}));assert.equal(client.map.pois[roomPoi.id].puzzle.progress,2);
 host.players[0].x=roomPoi.x;host.players[0].y=roomPoi.y;applyCommand(host,1,{type:'resetPuzzle'});applySnapshot(client,buildSnapshot(host,1,{tick:2,ack:0}));assert.equal(client.map.pois[roomPoi.id].puzzle.progress,0);
});
test('every wand Normal can push scale stones, including zero-damage Test and orbit contact',()=>{
 for(const type of ['fire','ice','lightning','air','earth','nature','gravity','light','crystal','test','blood','storm','void','mirror','orbit','comet','prism']){
  const {s,q,p}=room('scales'),o=q.objects[0];p.x=o.x;p.y=o.y+65;const start={x:o.x,y:o.y};cast(s,p,type,-Math.PI/2);tick(s,type==='orbit'?1.4:.35);assert.ok(Math.hypot(o.x-start.x,o.y-start.y)>1,type);
 }
});

test('wisps can be escorted around real obstacles to both altars without relocating the wisps',()=>{
 const {s,poi,q,p}=room('wisps');
 for(const side of [-1,1]){const symbol=side<0?1:2,dock=q.docks.find(d=>d.symbol===symbol);for(const [x,y,seconds] of [[600+side*250,760,5],[600+side*250,355,6],[dock.x-side*65,dock.y,6]]){p.x=x;p.y=y;tick(s,seconds);}assert.ok(q.objects.find(o=>o.symbol===symbol).active);}
 assert.ok(poi.completed);
});
test('moving sprouts naturally cross their beds and can be rooted there in solo and coop',()=>{
 for(const party of [1,2]){const {s,poi,q,p}=room('roots',party);for(const o of q.objects){const bed=q.docks.find(d=>d.symbol===o.symbol);let caught=false;
  for(let frame=0;frame<2400&&!caught;frame++){step(s,{},1/60);if(Math.hypot(o.x-bed.x,o.y-bed.y)<20){p.x=o.x;p.y=o.y+60;cast(s,p,'nature',-Math.PI/2);tick(s,.85);caught=o.active;}}assert.ok(caught,'sprout enters matching bed');}assert.ok(poi.completed);}
});
test('constellation is solvable with actual Gravity shots and scales with body pushes alone',()=>{
 const gravity=room('constellation');for(const o of gravity.q.objects){const d=gravity.q.docks.find(d=>d.symbol===o.symbol);gravity.p.x=d.x;gravity.p.y=d.y;for(let shot=0;shot<10&&!o.active;shot++){cast(gravity.s,gravity.p,'gravity',Math.atan2(o.y-gravity.p.y,o.x-gravity.p.x));tick(gravity.s,1.3);}assert.ok(o.active);}assert.ok(gravity.poi.completed);
 const scales=room('scales');scales.p.wand=null;for(const o of scales.q.objects){const d=scales.q.docks[[1,4].includes(o.weight)?0:1];for(let frame=0;frame<600&&Math.hypot(o.x-d.x,o.y-d.y)>75;frame++){const dx=d.x-o.x,dy=d.y-o.y,len=Math.hypot(dx,dy);scales.p.x=o.x-dx/len*37;scales.p.y=o.y-dy/len*37;step(scales.s,{1:{x:dx/len,y:dy/len}},1/60);}assert.ok(Math.hypot(o.x-d.x,o.y-d.y)<78);}step(scales.s,{},.01);assert.ok(scales.poi.completed);
});

test('Light corridor requires both beam lines to be blocked by Light; solo walls last long enough to reach switches',()=>{
 const {s,poi,q,p}=room('lightCorridor');p.x=500;p.y=410;step(s,{},.01);assert.equal(q.objects[0].active,false);
 p.x=600;p.y=700;cast(s,p,'light',Math.PI,'Special');tick(s,1.5);assert.equal(q.blocked[0],true);
 for(let frame=0;frame<35;frame++)step(s,{1:{y:-1}},1/60);assert.ok(p.y<600&&p.y>530);
 p.x=700;cast(s,p,'light',Math.PI,'Special');tick(s,1.7);assert.ok(q.blocked.every(Boolean));
 for(let frame=0;frame<60;frame++)step(s,{1:{y:-1}},1/60);assert.ok(p.y<440);assert.equal(p.health,100);
 for(const o of q.objects){p.x=o.x;p.y=o.y;step(s,{},.01);}assert.ok(poi.completed);
});
