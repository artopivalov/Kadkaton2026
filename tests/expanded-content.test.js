import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,step,release,applyCommand,addPlayer,dropWand} from '../src/simulation.js';
import {createWand,createRune,rollWand,hasRune,statFactor,combatWands} from '../src/items.js';
import {WANDS,spellBalance,wandStats} from '../src/wands.js';
import {createRandom} from '../src/rng.js';
import {enterLocation} from '../src/locations.js';
import {createScene} from '../src/scenes/debug.js';
import {spawnEnemy} from '../src/enemies.js';
import {RARITIES,WAND_MIN_RARITY,SPECIAL_RUNES,ITEM_BALANCE,ENEMY_BALANCE,COMBAT_BALANCE,PLAYER_BALANCE,MAP_BALANCE} from '../src/balance.js';
const profile={name:'Wizard',color:'#79a9ff'};
const dummy=(id,x,y)=>({id,x,y,hits:0,damage:0});
const enemy=(id,x,y)=>({...dummy(id,x,y),type:'skeleton',health:1000,maxHealth:1000});
function equipped(type,mode='Normal',special=[]){const s=createState(profile);s.world={width:4000,height:3000};const p=s.players[0];p.x=600;p.y=450;p.angle=0;p.wand={id:9,...createWand(type,RARITIES[WAND_MIN_RARITY[type]??0],()=>.4)};p.mode=mode;p.charge=1;if(special.length)p.rune={modifiers:[],special};return s;}
function advance(s,duration){for(let i=0;i<Math.ceil(duration*60);i++)step(s,{},1/60);}
function cast(s,mode){const p=s.players[0];p.mode=mode;p.charge=1;release(s,p.id);}
function level(type='forest'){return enterLocation(createState(profile),type,8);}
test('rarity floors hold for all loot sources, including direct/debug creation and starting wands',()=>{
 for(const [type,min] of Object.entries(WAND_MIN_RARITY))for(const requested of RARITIES)assert.ok(RARITIES.indexOf(createWand(type,requested,createRandom(5)).rarity)>=min);
 for(const rarity of RARITIES){const random=createRandom(1);for(let i=0;i<200;i++){const wand=rollWand(random,rarity);assert.equal(wand.rarity,rarity);assert.ok((WAND_MIN_RARITY[wand.type]??0)<=RARITIES.indexOf(rarity));}}
 for(const location of ['forest','cave','library'])for(let seed=0;seed<20;seed++){const s=enterLocation(createState(profile),location,seed);for(const wand of [s.players[0].wand,...s.map.pois.flatMap(p=>p.loot.filter(i=>i.kind==='wand'))])assert.ok(RARITIES.indexOf(wand.rarity)>=(WAND_MIN_RARITY[wand.type]??0));}
});
test('wand rolls span −20%..+30%, remain deterministic, and survive item round trips',()=>{
 const a=createWand('fire','Common',createRandom(15)),b=createWand('fire','Common',createRandom(15));assert.deepEqual(a,b);assert.ok(Object.values(a.rolls).every(v=>v>=.8&&v<=1.3));assert.notDeepEqual(a.rolls,createWand('fire','Common',createRandom(16)).rolls);
 const s=equipped('fire'),p=s.players[0];p.wand={...a,id:9};const stats=wandStats(p);dropWand(s,1);const item=s.items[0];p.x=item.x;p.y=item.y;step(s,{},1);assert.deepEqual(wandStats(p),stats);
});
test('special runes never appear below Rare, remain optional, and every effect is obtainable',()=>{
 const effects=new Set();for(const rarity of RARITIES){const random=createRandom(72);let absent=0;for(let i=0;i<1000;i++){const r=createRune(random,rarity);if(RARITIES.indexOf(rarity)<2)assert.equal(r.special.length,0);r.special.forEach(e=>effects.add(e));absent+=!r.special.length;const tier=RARITIES.indexOf(rarity);for(const m of r.modifiers){const benefit=(m.factor-1)*(ITEM_BALANCE.inverse.includes(m.type)?-1:1);assert.ok(benefit>=-.2&&benefit<=.5+tier*.1);}}assert.ok(absent>0);}assert.deepEqual([...effects].sort(),Object.keys(SPECIAL_RUNES).sort());
});
test('stat-changing special runes affect both spells and stop affecting stats when removed',()=>{
 for(const [id,effect] of Object.entries(SPECIAL_RUNES))for(const [stat,factor] of Object.entries(effect.stats)){const s=equipped('fire'),p=s.players[0],base=wandStats(p);p.rune={modifiers:[],special:[id]};assert.ok(Math.abs(wandStats(p)[stat]-base[stat]*factor)<1e-9);p.rune=null;assert.deepEqual(wandStats(p),base);}
});
test('Blood heals only from enemies, caps healing, and its Special rejects low health without consuming resources',()=>{
 for(const kind of ['enemy','dummy','player']){const s=equipped('blood'),p=s.players[0];p.health=80;if(kind==='enemy')s.enemies=[enemy(3,740,450)];if(kind==='dummy')s.targets=[dummy(3,740,450)];if(kind==='player'){const other=addPlayer(s,profile);other.x=740;other.y=450;}release(s,1);advance(s,.5);assert.equal(p.health>80,kind==='enemy');}
 const low=equipped('blood','Special');low.players[0].health=19;release(low,1);assert.equal(low.shots,0);assert.equal(low.players[0].mana,100);assert.equal(low.players[0].health,19);
 const high=equipped('blood','Special');const cost=spellBalance(high.players[0]).healthCost;release(high,1);assert.equal(high.players[0].health,100-cost);assert.equal(high.projectiles.length,WANDS.blood.balance.needles);
});
test('Storm jumps to separate enemies with falling damage and clouds strike repeatedly',()=>{
 const s=equipped('storm');s.enemies=[enemy(3,740,450),enemy(4,790,520),enemy(5,850,530)];release(s,1);assert.ok(s.enemies.every(e=>e.damage>0));assert.ok(s.enemies[0].damage>s.enemies[1].damage&&s.enemies[1].damage>s.enemies[2].damage);
 const cloud=equipped('storm','Special');release(cloud,1);const e=cloud.effects.find(e=>e.kind==='stormCloud');cloud.enemies=[enemy(3,e.x,e.y)];advance(cloud,2);assert.ok(cloud.enemies[0].hits>=2);advance(cloud,5);assert.equal(cloud.effects.length,0);
});
test('Void pierces with declining damage; its rift pulls before its warned collapse',()=>{
 const s=equipped('void');s.enemies=[enemy(3,710,450),enemy(4,810,450),enemy(5,910,450)];release(s,1);advance(s,3);assert.ok(s.enemies[0].damage>s.enemies[1].damage&&s.enemies[1].damage>s.enemies[2].damage);
 const rift=equipped('void','Special');release(rift,1);const e=rift.effects.find(e=>e.kind==='voidRift');assert.ok(e.warning);rift.enemies=[enemy(3,e.x+60,e.y)];const x=rift.enemies[0].x;advance(rift,1);assert.ok(rift.enemies[0].x<x);assert.equal(rift.enemies[0].damage,0);advance(rift,3);assert.ok(rift.enemies[0].damage>0);assert.ok(!rift.effects.some(e=>e.kind==='voidRift'));
});
test('Mirror shard destroys an enemy projectile and continues; Mirror reflects back with a finite capacity',()=>{
 const s=equipped('mirror');release(s,1);s.projectiles.push({id:20,enemy:true,owner:99,kind:'arrow',x:700,y:450,angle:Math.PI,speed:220,range:800,radius:5,distance:0,damage:10,power:1});advance(s,.3);assert.ok(s.projectiles.some(p=>p.kind==='mirrorShard'));assert.ok(!s.projectiles.some(p=>p.enemy));
 const mirror=equipped('mirror','Special');release(mirror,1);const e=mirror.effects.find(e=>e.kind==='mirror');mirror.projectiles.push({id:20,enemy:true,owner:99,kind:'arrow',x:e.x+60,y:e.y,angle:Math.PI,speed:220,range:800,radius:5,distance:0,damage:10,power:1});advance(mirror,.3);const b=mirror.projectiles[0];assert.ok(!b.enemy);assert.equal(b.owner,1);assert.ok(Math.cos(b.angle)>0);assert.equal(e.reflections,WANDS.mirror.balance.reflections-1);
});
test('Orbit enforces a three-satellite cap, contact damage and expiration; Special launches the stock',()=>{
 const s=equipped('orbit');for(let i=0;i<3;i++){s.players[0].mana=100;cast(s,'Normal');}assert.equal(s.effects.filter(e=>e.kind==='satellite').length,3);const shots=s.shots;cast(s,'Normal');assert.equal(s.shots,shots);
 s.targets=[dummy(3,s.players[0].x+65,s.players[0].y)];advance(s,1);assert.ok(s.targets[0].damage>0);s.players[0].mana=100;cast(s,'Special');assert.equal(s.effects.filter(e=>e.kind==='satellite').length,0);assert.equal(s.projectiles.length,3);advance(s,5);assert.equal(s.projectiles.length,0);
 const expires=equipped('orbit');release(expires,1);advance(expires,9);assert.equal(expires.effects.length,0);
});
test('Comet accelerates and hits harder at distance; Special waits and emits damaging debris',()=>{
 const amounts=[];for(const x of [720,1200]){const s=equipped('comet');s.targets=[dummy(3,x,450)];release(s,1);const initial=s.projectiles[0].speed;step(s,{},.1);assert.ok(s.projectiles[0].speed>initial);advance(s,4);amounts.push(s.targets[0].damage);}assert.ok(amounts[1]>amounts[0]);
 const s=equipped('comet','Special');release(s,1);const e=s.effects.find(e=>e.kind==='meteorWarning');s.targets=[dummy(3,e.x,e.y)];advance(s,1);assert.equal(s.targets[0].damage,0);while(!s.effects.some(effect=>effect.kind==='cometImpact'))step(s,{},1/60);assert.ok(s.targets[0].damage>0);assert.ok(s.projectiles.some(p=>p.kind==='meteorDebris'));
});
test('Prism ray loses damage through targets; the placed prism splits a Normal cast into exactly three rays',()=>{
 const s=equipped('prism');s.targets=[dummy(3,740,450),dummy(4,900,450)];release(s,1);assert.ok(s.targets[0].damage>s.targets[1].damage);
 const placed=equipped('prism','Special');release(placed,1);const prism=placed.effects.find(e=>e.kind==='prism');placed.players[0].wand=createWand('fire','Common',()=>.4);cast(placed,'Normal');assert.equal(placed.effects.filter(e=>e.kind==='prismRay').length,3);assert.equal(placed.projectiles.length,0);assert.equal(prism.shots,WANDS.prism.balance.prismShots-1);
});
test('Double cast duplicates whole volleys, spheres, walls, fields and launches with a single resource payment',()=>{
 for(const [type,mode,kind,count] of [['ice','Normal','icicle',null],['fire','Special','fireWave',2],['nature','Special','vines',2],['earth','Special','wall',2],['blood','Special','bloodNeedle',18],['comet','Special','meteorWarning',2]]){const single=equipped(type,mode),s=equipped(type,mode,['double']);release(single,1);release(s,1);assert.equal(s.players[0].mana,single.players[0].mana);assert.equal(s.players[0].health,single.players[0].health);assert.equal(s.shots,2);const actual=kind==='wall'?s.walls.length:[...s.projectiles,...s.effects].filter(e=>e.kind===kind).length;if(count!==null)assert.equal(actual,count);else assert.ok(actual>=12&&actual<=16);}
 const s=equipped('orbit');release(s,1);s.players[0].rune={modifiers:[],special:['double']};s.players[0].mana=100;cast(s,'Special');assert.equal(s.projectiles.length,2);assert.equal(s.effects.filter(e=>e.kind==='satellite').length,0);
});
test('Healing restores health instead of damage for direct, ray, area, satellite and delayed attacks',()=>{
 for(const [type,mode] of [['blood','Normal'],['prism','Normal'],['fire','Special'],['nature','Special'],['comet','Special'],['orbit','Normal']]){const s=equipped(type,mode,['healing']);const other=addPlayer(s,profile);other.x=type==='comet'?900:type==='nature'?750:type==='orbit'?665:700;other.y=450;other.health=40;release(s,1);advance(s,4);assert.ok(other.health>40,`${type} must heal`);assert.ok(other.health<=PLAYER_BALANCE.health);}
});
test('Super knockback scales push and attraction fivefold and instability rolls once for a doubled cast',()=>{
 const pushes=[];for(const special of [[],['force']]){const s=equipped('fire','Special',special);s.targets=[dummy(3,650,450)];release(s,1);step(s,{},.3);pushes.push(s.targets[0].x-650);}assert.ok(Math.abs(pushes[1]/pushes[0]-5)<1e-8);
 const normal=spellBalance(equipped('gravity','Special').players[0]),boost=spellBalance(equipped('gravity','Special',['force']).players[0]);assert.equal(boost.pullSpeed,normal.pullSpeed*5);
 const s=equipped('fire','Normal',['double','unstable']);release(s,1);assert.equal(s.projectiles[0].damage,s.projectiles[1].damage);assert.equal(s.players[0].castMultiplier,undefined);
});
test('piercing attenuation orders hits along the path rather than by array order',()=>{
 const s=equipped('lightning');s.targets=[dummy(3,900,450),dummy(4,700,450),dummy(5,800,450)];release(s,1);assert.ok(s.targets[1].damage>s.targets[2].damage&&s.targets[2].damage>s.targets[0].damage);
});
test('new spell states and rune combinations remain JSON deterministic and clean up',()=>{
 for(const type of ['blood','storm','void','mirror','orbit','comet','prism'])for(const mode of ['Normal','Special']){const s=equipped(type,mode,['double','unstable']);if(type==='orbit'&&mode==='Special'){s.players[0].mode='Normal';release(s,1);s.players[0].mana=100;s.players[0].mode='Special';s.players[0].charge=1;}s.enemies=[enemy(3,780,470)];release(s,1);const copy=JSON.parse(JSON.stringify(s));assert.deepEqual(s,copy);for(let i=0;i<700;i++){step(s,{},1/60);step(copy,{},1/60);}assert.deepEqual(s,copy);assert.equal(s.projectiles.length,0);assert.equal(s.effects.length,0);}
});
test('a hit aggroes the attacker and nearby group and distance does not cancel pursuit',()=>{
 const s=level(),p=s.players[0];s.enemies=[];const a=spawnEnemy(s,'skeleton',p.x,p.y-100,0),b=spawnEnemy(s,'skeleton',p.x+60,p.y-100,0),far=spawnEnemy(s,'skeleton',p.x+400,p.y-100,0);p.wand={id:2,type:'lightning'};p.angle=-Math.PI/2;p.mode='Normal';p.charge=1;release(s,1);assert.equal(a.targetId,p.id);assert.equal(b.targetId,p.id);assert.equal(far.targetId,null);p.y-=800;const y=a.y;step(s,{},.2);assert.ok(a.y<y);assert.equal(a.targetId,p.id);p.health=0;step(s,{},.1);assert.equal(a.targetId,null);
});
test('jumpers lock warnings, fly smoothly and damage on landing; dead casters cancel warnings',()=>{
 const s=level(),p=s.players[0];s.enemies=[];const e=spawnEnemy(s,'jumper',p.x,p.y-150,0);e.cooldown=0;step(s,{},.01);assert.equal(s.telegraphs[0].action,'jump');advance(s,1);assert.ok(e.flight);const before=e.y;step(s,{},.1);assert.ok(e.y>before&&e.y<p.y);assert.ok(e.visualLift>0);advance(s,1);assert.ok(p.health<100);
 e.cooldown=0;e.y=p.y-100;step(s,{},.01);e.health=0;step(s,{},.01);assert.ok(!s.telegraphs.some(t=>t.owner===e.id));
});
test('hooks travel, hit and pull over time; enemy wizards use a smaller fixed warning',()=>{
 const s=level('cave'),p=s.players[0];s.enemies=[];const e=spawnEnemy(s,'hooker',p.x,p.y-200,0);e.cooldown=0;step(s,{},.01);assert.equal(s.projectiles[0].kind,'hook');const y=p.y;advance(s,1);assert.ok(p.y<y);assert.ok(p.health<100);
 const mage=level('library'),player=mage.players[0];mage.enemies=[];const w=spawnEnemy(mage,'wizard',player.x,player.y-200,0);w.cooldown=0;step(mage,{},.01);const warning=mage.telegraphs[0];assert.equal(warning.radius,ENEMY_BALANCE.wizard.areaRadius);const x=warning.x;player.x+=200;advance(mage,2);assert.equal(warning.x,x);assert.equal(player.health,100);
});
test('rare enemy spawn rules, biome selection, full-map determinism and probability are respected',()=>{
 let eligible=0,rare=0;for(const biome of ['forest','cave','library'])for(let seed=0;seed<100;seed++){const s=enterLocation(createState(profile),biome,seed);for(const poi of s.map.pois)if(poi.type==='combat'&&!poi.boss&&poi.id!==0){eligible++;const enemies=s.enemies.filter(e=>e.poi===poi.id&&ENEMY_BALANCE[e.type].rare);assert.ok(enemies.length<=1);rare+=enemies.length;}for(const e of s.enemies.filter(e=>ENEMY_BALANCE[e.type].rare)){const poi=s.map.pois[e.poi];assert.equal(poi.type,'combat');assert.ok(!poi.boss&&poi.id!==0);assert.equal(e.type,{forest:'mushroomKeeper',cave:'crystalShell',library:'scribe'}[biome]);}}
 assert.ok(rare/eligible>.035&&rare/eligible<.065);
});
test('Mushroom shepherd summons killable spores with warnings and stays on its arena',()=>{
 const s=level(),poi=s.map.pois.find(p=>p.type==='combat'&&!p.boss),p=s.players[0];s.enemies=[];p.x=poi.x;p.y=poi.y;const e=spawnEnemy(s,'mushroomKeeper',poi.x+100,poi.y,poi.id);e.cooldown=0;step(s,{},.01);assert.equal(s.enemies.filter(e=>e.type==='mushroom').length,ENEMY_BALANCE.mushroomKeeper.summonCount);assert.ok(e.openUntil>s.time);advance(s,2);assert.ok(p.health<100||s.telegraphs.some(t=>t.action==='spore'));e.x=poi.x+poi.radius*2;step(s,{},.01);assert.ok(Math.hypot(e.x-poi.x,e.y-poi.y)<poi.radius);
});
test('shellback has directional armor and gets stunned by charging into a wall; Scribe seals shoot four ways',()=>{
 const damages=[];for(const angle of [0,Math.PI]){const s=equipped('lightning');const e={...enemy(3,720,450),type:'crystalShell',angle};s.enemies=[e];release(s,1);damages.push(e.damage);}assert.ok(damages[0]>damages[1]);
 const s=level('cave'),p=s.players[0];p.x=s.map.pois[0].x;p.y=s.map.pois[0].y;s.enemies=[];const e=spawnEnemy(s,'crystalShell',p.x,p.y-150,0);e.cooldown=0;s.walls=[{id:30,x:p.x-100,y:p.y-60,width:200,height:20,permanent:true}];step(s,{},.01);assert.equal(s.telegraphs[0].kind,'charge');advance(s,1.8);assert.ok(e.stunUntil>s.time);
 const mage=level('library'),player=mage.players[0];player.x=mage.map.pois[0].x;player.y=mage.map.pois[0].y;mage.enemies=[];const w=spawnEnemy(mage,'scribe',player.x,player.y-250,0);w.cooldown=0;step(mage,{},.01);const count=mage.telegraphs.length;assert.ok(count>0);player.x+=200;advance(mage,ENEMY_BALANCE.scribe.warning-.1);step(mage,{},.11);assert.equal(mage.projectiles.length,count*4);
});
test('mana can be exhausted and level sizes reflect the repeated playtest corrections',()=>{
 const s=equipped('fire');for(let i=0;i<20;i++)cast(s,'Normal');assert.ok(s.shots<20);assert.ok(s.players[0].mana<ITEM_BALANCE.normalMana);const before=s.players[0].mana;step(s,{},1);assert.ok(s.players[0].mana-before<5);assert.equal(MAP_BALANCE.arenaRadius,540);assert.equal(MAP_BALANCE.corridorRadius,270);assert.equal(MAP_BALANCE.spacing-2*MAP_BALANCE.arenaRadius,2*(1100-2*360));
});
test('all new enemy actions and warnings stay deterministic after a JSON copy',()=>{
 for(const type of ['jumper','hooker','wizard','mushroomKeeper','crystalShell','scribe']){const s=level(type==='jumper'||type==='mushroomKeeper'?'forest':type==='hooker'||type==='crystalShell'?'cave':'library'),poi=s.map.pois.find(p=>p.type==='combat'&&!p.boss),p=s.players[0];p.x=poi.x;p.y=poi.y;s.enemies=[];const e=spawnEnemy(s,type,p.x,p.y-140,poi.id);e.cooldown=0;step(s,{},.02);const copy=JSON.parse(JSON.stringify(s));assert.deepEqual(s,copy);for(let i=0;i<240;i++){step(s,{},1/60);step(copy,{},1/60);}assert.deepEqual(s,copy);}
});
test('debug scene can deliberately issue each special rune and spawn and clear enemies',()=>{
 const s=createScene(profile),p=s.players[0];applyCommand(s,1,{type:'setRarity',rarity:'Rare'});for(const id of Object.keys(SPECIAL_RUNES)){p.x=s.runeStation.x-100;p.y=s.runeStation.y;step(s,{},.01);applyCommand(s,1,{type:'setRuneEffect',effect:id});p.x=s.runeStation.x;step(s,{},.01);assert.deepEqual(p.rune.special,[id]);}
 applyCommand(s,1,{type:'spawnEnemy',enemy:'wizard'});assert.equal(s.enemies.length,1);advance(s,.2);assert.equal(s.enemies[0].type,'wizard');applyCommand(s,1,{type:'clearEnemies'});assert.equal(s.enemies.length,0);assert.equal(s.telegraphs.length,0);
});
