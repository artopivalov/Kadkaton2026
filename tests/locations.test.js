import test from 'node:test';
import assert from 'node:assert/strict';
import {createPuzzle} from '../src/puzzles.js';
import {generateLocation,onFloor,routeTo} from '../src/generator.js';
import {enterLocation} from '../src/locations.js';
import {createState,step,release,addPlayer,readyPortal} from '../src/simulation.js';
import {createScene as lobby} from '../src/scenes/lobby.js';
import {ITEM_BALANCE,ENCOUNTER_BALANCE,ENEMY_BALANCE} from '../src/balance.js';
const profile={name:'Wizard',color:'#79a9ff'};
const level=(location='forest',seed=8)=>enterLocation(createState(profile),location,seed);
test('seeded maps have exact POI counts, connected alternating corridors and distinct branch depth',()=>{
 for(const [location,count] of [['forest',10],['cave',15],['library',20]])for(let seed=0;seed<30;seed++){
  const m=generateLocation(location,seed);assert.deepEqual(m,generateLocation(location,seed));assert.notDeepEqual(m,generateLocation(location,seed+1));assert.equal(m.pois.length,count);assert.equal(m.corridors.length,count-1);
  for(const p of m.pois){assert.ok(onFloor(m,p.x,p.y,20));assert.equal(p.loot.length,2);if(p.parent!==null)assert.ok(p.parent<p.id);}
  for(const c of m.corridors)for(let i=0;i<2;i++)for(let n=0;n<=10;n++){const a=c.points[i],b=c.points[i+1];assert.ok(onFloor(m,a.x+(b.x-a.x)*n/10,a.y+(b.y-a.y)*n/10,20));}
  assert.equal(Math.max(...m.pois.map(p=>p.depth)),location==='forest'?0:location==='cave'?1:3);
  assert.ok(routeTo(m,m.spawn,m.pois.at(-1)).length>1);
 }
});
test('POI and item type rolls are independent and roughly half across seeds',()=>{
 let combat=0,total=0,wands=0;for(let seed=0;seed<200;seed++)for(const p of generateLocation('library',seed).pois.filter(p=>!p.boss)){combat+=p.type==='combat';total++;wands+=p.loot.filter(i=>i.kind==='wand').length;}
 assert.ok(combat/total>.46&&combat/total<.54);assert.ok(wands/(total*2)>.46&&wands/(total*2)<.54);
});
test('viewer uses identical complete map and enemy spawn; group difficulty scales without multiplying loot',()=>{
 const play=level(),view=createState(profile);enterLocation(view,'forest',8,{viewer:true});assert.deepEqual(view.map,play.map);assert.deepEqual(view.enemies,play.enemies);
 const group=createState(profile);addPlayer(group,profile);enterLocation(group,'forest',8);assert.equal(group.enemies.length,play.enemies.length);assert.ok(group.enemies[0].health>play.enemies[0].health);assert.equal(group.map.pois[0].loot.length,2);
 const before=JSON.stringify(view.enemies);step(view,{},1);assert.equal(JSON.stringify(view.enemies),before);
});
test('map collision prevents leaving floor while state remains deterministic after JSON round trip',()=>{
 const s=level(),copy=JSON.parse(JSON.stringify(s));for(let i=0;i<120;i++){const input={1:{x:1,y:0}};step(s,input,1/60);step(copy,input,1/60);}assert.deepEqual(s,copy);assert.ok(onFloor(s.map,s.players[0].x,s.players[0].y,20));
});
test('puzzles work solo in order and each completed chest creates exactly two shared items once',()=>{
 const s=level(),poi=s.map.pois.find(p=>p.type==='puzzle'&&!p.boss),p=s.players[0];s.enemies=[];createPuzzle(poi,s.map.location,()=>.4,1,'plates');
 p.x=poi.plates[2].x;p.y=poi.plates[2].y;step(s,{},.01);assert.equal(poi.plates[2].active,false);
 for(const plate of poi.plates){p.x=plate.x;p.y=plate.y;step(s,{},.01);}assert.equal(poi.completed,true);
 const before=s.items.length;p.x=poi.x;p.y=poi.y-75;step(s,{},.01);assert.equal(s.items.length,before+2);step(s,{},.01);assert.equal(s.items.length,before+2);assert.equal(poi.opened,true);
});
test('enemy melee and straight arrows deal full enemy damage rather than friendly-fire damage',()=>{
 const s=level(),p=s.players[0],e=s.enemies.find(e=>e.type==='skeleton');s.enemies=[e];e.x=p.x+25;e.y=p.y;e.cooldown=0;const hp=p.health;step(s,{},.01);assert.equal(p.health,hp-e.attackDamage);
 s.enemies=[];s.projectiles=[{enemy:true,owner:999,kind:'arrow',x:p.x-50,y:p.y,angle:0,speed:200,range:300,radius:5,distance:0,damage:10,power:1}];const prior=p.health;step(s,{},.25);assert.equal(p.health,prior-10);
});
test('boss warnings lock target, wait before damage, and vanish when the boss dies',()=>{
 const s=level(),p=s.players[0],boss=s.enemies.find(e=>ENEMY_BALANCE[e.type].boss);s.enemies=[boss];p.x=boss.x+100;p.y=boss.y;boss.cooldown=0;boss.pattern=2;step(s,{},.01);assert.equal(s.telegraphs.length,1);const warning=s.telegraphs[0],hp=p.health;
 p.x=boss.x-100;step(s,{},ENCOUNTER_BALANCE.telegraphDelay/2);assert.equal(warning.x,boss.x+100);assert.equal(p.health,hp);step(s,{},ENCOUNTER_BALANCE.telegraphDelay/2+.02);assert.equal(p.health,hp);assert.equal(s.telegraphs.length,0);
 boss.cooldown=0;step(s,{},.01);assert.equal(s.telegraphs.length,1);boss.health=0;step(s,{},.01);assert.equal(s.telegraphs.length,0);
});
test('runes share single pickup ownership and modify actual charged projectile damage',()=>{
 const s=createState(profile),p=s.players[0];addPlayer(s,profile);s.items=[{id:200,kind:'rune',type:'damage',factor:1.25,x:p.x,y:p.y,availableAt:0}];s.players[1].x=p.x;s.players[1].y=p.y;step(s,{},.01);assert.equal(p.rune.factor,1.25);assert.equal(s.players[1].rune,null);assert.equal(s.items.length,0);
 p.wand={id:201,type:'fire'};p.mode='Normal';p.charge=1;release(s,p.id);assert.equal(s.projectiles[0].damage,12.5);
});
test('lobby portal waits for the entire group and location starts with a reachable combat wand',()=>{
 const s=lobby(profile);addPlayer(s,profile);const portal=s.portals[0];s.players[0].x=portal.x;s.players[0].y=portal.y;step(s,{},.01);assert.equal(readyPortal(s),null);s.players[1].x=portal.x;s.players[1].y=portal.y;step(s,{},.01);assert.equal(readyPortal(s).location,'forest');enterLocation(s,'forest',2);assert.ok(s.players.every(p=>p.wand.type!=='test'));assert.ok(s.items.some(i=>i.type==='fire'&&onFloor(s.map,i.x,i.y,20)));
});
test('charged combat spells kill enemies, unlock arenas and allow a complete solo run',()=>{
 const s=level(),p=s.players[0],enemy=s.enemies.find(e=>e.type==='skeleton');s.enemies=[enemy];enemy.x=p.x;enemy.y=p.y-80;enemy.health=1;p.wand={id:901,type:'fire'};p.mode='Normal';p.charge=1;p.angle=-Math.PI/2;release(s,p.id);for(let i=0;i<30;i++)step(s,{},1/60);assert.equal(s.enemies.length,0);
 for(const poi of s.map.pois){if(poi.type==='puzzle')for(const plate of poi.plates){p.x=plate.x;p.y=plate.y;step(s,{},1/60);}else step(s,{},1/60);}
 assert.equal(s.completed,true);assert.equal(s.portals[0].location,'lobby');
});
test('dead players cannot move or cast and mana gates Special without spending on failed charge',()=>{
 const s=createState(profile),p=s.players[0];p.wand={id:500,type:'fire'};p.mode='Special';p.charge=.5;release(s,p.id);assert.equal(p.mana,100);p.charge=1;p.mana=10;release(s,p.id);assert.equal(s.shots,0);p.mana=100;p.charge=1;release(s,p.id);assert.equal(p.mana,100-ITEM_BALANCE.specialMana);
 p.health=0;p.charge=1;const x=p.x;step(s,{1:{x:1,held:true}},1);release(s,p.id);assert.equal(p.x,x);assert.equal(p.charge,0);assert.equal(s.shots,1);
});
test('safe entrance gives time to drop starter, equip combat wand and approach the first arena',()=>{
 const s=level('library'),p=s.players[0];for(let i=0;i<300;i++)step(s,{},1/60);assert.equal(p.health,100);assert.ok(onFloor(s.map,s.spawn.x,s.spawn.y,20));p.wand=null;p.x=s.items[0].x;p.y=s.items[0].y;step(s,{},1/60);assert.equal(p.wand.type,'fire');
});
