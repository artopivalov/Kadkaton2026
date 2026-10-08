import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,step,release,applyCommand} from '../src/simulation.js';
import {createScene} from '../src/scenes/debug.js';
import {enterLocation} from '../src/locations.js';
import {generateLocation} from '../src/generator.js';
import {createWand,createRune,combatWands,statFactor} from '../src/items.js';
import {createRandom} from '../src/rng.js';
import {WANDS,spellBalance} from '../src/wands.js';
import {RARITIES,ITEM_BALANCE,CONFIG,ICE_BALANCE,MAP_BALANCE} from '../src/balance.js';
const profile={name:'Wizard',color:'#79a9ff'};
function equipped(type,mode='Normal'){const s=createState(profile);s.players[0].wand={id:2,...createWand(type)};s.players[0].angle=0;s.players[0].mode=mode;s.players[0].charge=1;return s;}
const dummy=(id,x,y)=>({id,x,y,hits:0,damage:0});
const enemy=(id,x,y)=>({...dummy(id,x,y),type:'skeleton',health:1000});
function advance(s,seconds){for(let i=0;i<Math.ceil(seconds*60);i++)step(s,{},1/60);}
test('new wands cast only on release, never in Safe, and cancel incomplete Special',()=>{
 for(const type of ['nature','gravity','light','crystal']){
  const s=equipped(type);s.players[0].charge=0;step(s,{1:{held:true}},.2);assert.equal(s.projectiles.length,0);release(s,1);assert.equal(s.shots,1);
  const safe=equipped(type,'Safe');release(safe,1);assert.equal(safe.shots,0);
  const partial=equipped(type,'Special');partial.players[0].charge=.9;release(partial,1);assert.equal(partial.shots,0);assert.equal(partial.players[0].mana,100);
 }
});
test('Nature damages and roots, then releases the root; vines slow enemies and expire',()=>{
 const s=equipped('nature');s.enemies=[enemy(3,720,450)];release(s,1);advance(s,.3);assert.ok(s.enemies[0].damage>0);assert.ok(s.enemies[0].rootUntil>s.time);
 advance(s,2);assert.ok(s.enemies[0].rootUntil<s.time);
 const vines=equipped('nature','Special');release(vines,1);const field=vines.effects[0];assert.equal(field.kind,'vines');
 // A real encounter exercises movement through the vines.
 const baseline=enterLocation(createState(profile),'forest',12),slow=JSON.parse(JSON.stringify(baseline));
 for(const world of [baseline,slow]){const p=world.players[0],e=world.enemies[0];e.x=p.x;e.y=p.y-100;e.cooldown=100;world.enemies=[e];}
 const e=slow.enemies[0];slow.effects=[{...field,x:e.x,y:e.y,radius:300,life:5,duration:5}];
 const before=e.y;step(baseline,{},.1);step(slow,{},.1);assert.ok(Math.abs(e.y-before)<Math.abs(baseline.enemies[0].y-before));
 advance(vines,6);assert.equal(vines.effects.length,0);
});
test('Gravity normal damages and pulls; well attracts and deals repeated finite damage',()=>{
 const s=equipped('gravity');s.enemies=[enemy(3,720,450),enemy(4,770,480)];const before=s.enemies[1].x;release(s,1);advance(s,.4);assert.ok(s.enemies[0].damage>0);assert.ok(s.enemies[1].x<before);
 const well=equipped('gravity','Special');release(well,1);const field=well.effects[0];well.enemies=[enemy(3,field.x+80,field.y)];const x=well.enemies[0].x;advance(well,1);assert.ok(well.enemies[0].x<x);assert.ok(well.enemies[0].hits>=2);advance(well,5);assert.equal(well.effects.length,0);const damage=well.enemies[0].damage;advance(well,1);assert.equal(well.enemies[0].damage,damage);
});
test('Light disc hits on outward and returning paths and expires; Light wall allows movement and blocks shots',()=>{
 const s=equipped('light');s.targets=[dummy(3,740,450)];release(s,1);advance(s,4);assert.equal(s.targets[0].hits,2);assert.equal(s.projectiles.length,0);
 const wall=equipped('light','Special');release(wall,1);assert.equal(wall.walls[0].projectileOnly,true);step(wall,{1:{x:1}},1);assert.ok(wall.players[0].x>wall.walls[0].x+wall.walls[0].width);
 wall.players[0].x=600;wall.players[0].angle=0;wall.players[0].wand=createWand('ice');wall.players[0].mode='Normal';wall.players[0].charge=1;wall.targets=[dummy(3,900,450)];release(wall,1);advance(wall,1);assert.equal(wall.targets[0].damage,0);advance(wall,5);assert.equal(wall.walls.length,0);
});
test('Crystal gently homes within a forward sector and splits once into two weaker unguided shards',()=>{
 const s=equipped('crystal');s.enemies=[enemy(3,800,490)];release(s,1);const b=s.projectiles[0],angle=b.angle;step(s,{},.1);assert.ok(b.angle>angle);assert.ok(b.angle-angle<=WANDS.crystal.balance.turnSpeed*.1+1e-8);
 advance(s,.5);const children=s.projectiles.filter(p=>p.child);assert.equal(children.length,2);assert.ok(children.every(p=>p.damage<b.damage));advance(s,4);assert.equal(s.projectiles.length,0);
});
test('Crystal trap detonates near enemies only, emits shards and cleans up',()=>{
 const s=equipped('crystal','Special');release(s,1);const trap=s.effects[0];step(s,{},.1);assert.equal(s.effects[0].kind,'crystalTrap');s.enemies=[enemy(3,trap.x+30,trap.y)];step(s,{},.01);assert.ok(s.enemies[0].damage>0);assert.ok(!s.effects.some(e=>e.kind==='crystalTrap'));assert.equal(s.projectiles.length,WANDS.crystal.balance.shardCount);advance(s,5);assert.equal(s.projectiles.length,0);assert.equal(s.effects.length,0);
});
test('all new spell states survive JSON round trips and continue in lockstep',()=>{
 for(const type of ['nature','gravity','light','crystal'])for(const mode of ['Normal','Special']){
  const s=equipped(type,mode);s.enemies=[enemy(3,800,490)];release(s,1);const copy=JSON.parse(JSON.stringify(s));assert.deepEqual(s,copy);for(let i=0;i<400;i++){step(s,{},1/60);step(copy,{},1/60);}assert.deepEqual(s,copy);assert.equal(s.projectiles.length,0);assert.equal(s.effects.length,0);
 }
});
test('rarity determines rune stat count, permits repeats and covers all stats with continuous bonuses',()=>{
 const random=createRandom(50),types=new Set(),values=new Set();let positive=0,negative=0;
 for(const [i,rarity] of RARITIES.entries())for(let j=0;j<100;j++){const rune=createRune(random,rarity);assert.equal(rune.modifiers.length,i+1);for(const m of rune.modifiers){types.add(m.type);values.add(m.factor);const bonus=(m.factor-1)*(ITEM_BALANCE.inverse.includes(m.type)?-1:1);assert.ok(bonus>=-.2&&bonus<=.25);if(bonus>0)positive++;else negative++;}}
 assert.equal(types.size,7);assert.ok(values.size>100);assert.ok(positive>negative*2);const repeated=createRune(()=>.5,'Legendary');assert.equal(new Set(repeated.modifiers.map(m=>m.type)).size,1);
});
test('shared stats drive Normal and Special, including speed, charge, spread and mana',()=>{
 for(const type of combatWands){const s=equipped(type),p=s.players[0],before=spellBalance(p);p.rune={modifiers:ITEM_BALANCE.stats.map(type=>({type,factor:ITEM_BALANCE.inverse.includes(type)?.8:1.25}))};const after=spellBalance(p);assert.ok(after.chargeTime<before.chargeTime);assert.ok(after.specialChargeTime<before.specialChargeTime);if(before.projectileSpeed)assert.ok(after.projectileSpeed>before.projectileSpeed);assert.equal(statFactor(p,'manaCost'),.8);}
 const s=equipped('fire');s.players[0].rune={modifiers:[{type:'damage',factor:1.25},{type:'damage',factor:1.25},{type:'manaCost',factor:.8}]};release(s,1);assert.equal(s.projectiles[0].damage,CONFIG.normalDamage*1.25**2);assert.equal(s.players[0].mana,100-ITEM_BALANCE.normalMana*.8);
});
test('debug rarity affects pedestals and random rune replacement; dropping preserves all modifiers',()=>{
 const s=createScene(profile),p=s.players[0],pedestal=s.pedestals[0];applyCommand(s,1,{type:'setRarity',rarity:'Legendary'});p.x=pedestal.x;p.y=pedestal.y;step(s,{},.01);assert.equal(p.wand.rarity,'Legendary');assert.equal(p.wand.modifiers.length,4);
 p.x=s.runeStation.x;p.y=s.runeStation.y;step(s,{},.01);assert.equal(p.rune.modifiers.length,5);const id=p.rune.id;step(s,{},.01);assert.equal(p.rune.id,id);p.x-=100;step(s,{},.01);p.x+=100;step(s,{},.01);assert.notEqual(p.rune.id,id);
 const original=structuredClone(p.rune);applyCommand(s,1,{type:'dropRune'});p.x=s.items[0].x;p.y=s.items[0].y;step(s,{},1);assert.deepEqual(p.rune.modifiers,original.modifiers);assert.equal(p.rune.rarity,original.rarity);
});
test('Ice wave expires at fractional ranges and frame sizes; splash hits neighbours without self damage',()=>{
 for(const factor of [.8,1.25,1.137])for(const dt of [1/60,1/37,.013]){const s=equipped('ice','Special');s.players[0].rune={modifiers:[{type:'range',factor}]};s.targets=[];s.world={width:4000,height:4000};release(s,1);for(let t=0;t<10;t+=dt)step(s,{},dt);assert.equal(s.projectiles.length,0);assert.equal(s.effects.length,0);}
 const s=equipped('fire');s.targets=[dummy(3,720,450),dummy(4,720,495)];release(s,1);advance(s,1);assert.ok(s.targets[1].damage>0);assert.equal(s.players[0].damage,0);
});
test('fork exits are ±45 degrees from arrival and geometry is spacious',()=>{
 for(const location of ['cave','library']){const map=generateLocation(location,8);for(const p of map.pois){assert.equal(p.radius,MAP_BALANCE.arenaRadius);const children=map.pois.filter(c=>c.parent===p.id);if(children.length<2)continue;const parent=map.pois[p.parent],heading=Math.atan2(p.y-parent.y,p.x-parent.x);const differences=children.map(c=>Math.atan2(Math.sin(Math.atan2(c.y-p.y,c.x-p.x)-heading),Math.cos(Math.atan2(c.y-p.y,c.x-p.x)-heading))).sort((a,b)=>a-b);assert.ok(Math.abs(differences[0]+Math.PI/4)<1e-8);assert.ok(Math.abs(differences[1]-Math.PI/4)<1e-8);}}
});
test('victory requires every enemy in the boss room, without requiring earlier puzzles',()=>{
 const s=enterLocation(createState(profile),'forest',8),boss=s.enemies.find(e=>e.poi===s.map.bossPoi);s.enemies=[{...boss,health:0},enemy(999,boss.x,boss.y)];s.enemies[1].poi=s.map.bossPoi;step(s,{},.01);assert.equal(s.completed,false);s.enemies[0].health=0;step(s,{},.01);assert.equal(s.completed,true);assert.ok(s.map.pois.some(p=>!p.completed));
});
test('Light wall blocks projectiles spawned inside it and enemies can move straight through it',()=>{
 const s=equipped('light','Special');release(s,1);const wall=s.walls[0];s.players[0].x=wall.x+wall.width/2;s.players[0].y=wall.y+wall.height/2;s.players[0].wand=createWand('ice');s.players[0].mode='Normal';s.players[0].charge=1;release(s,1);step(s,{},.1);assert.equal(s.projectiles.length,0);
 const level=enterLocation(createState(profile),'forest',12),p=level.players[0],e=level.enemies[0];e.x=p.x;e.y=p.y-100;e.cooldown=100;level.enemies=[e];level.walls=[{id:999,x:p.x-80,y:p.y-75,width:160,height:20,permanent:true,projectileOnly:true}];const before=e.y;step(level,{},.2);assert.ok(e.y>before);
});
test('dropped equipment stays on accessible floor even when aiming outside a corridor',()=>{
 const s=enterLocation(createState(profile),'forest',12),p=s.players[0];p.x=s.spawn.x+160;p.angle=0;applyCommand(s,1,{type:'drop'});const item=s.items.at(-1);assert.ok(Math.hypot(item.x-p.x,item.y-p.y)>CONFIG.pickupRadius);assert.ok(item.x<=s.spawn.x+180-CONFIG.playerRadius+1);
});
