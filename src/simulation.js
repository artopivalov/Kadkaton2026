import {tickBattleRoyale} from './battle-royale.js';
import {puzzleAt,puzzleActors,puzzleHit,tickPuzzles,resetPuzzle} from './puzzles.js';
import {alertEnemies,protectedDamage,spawnEnemy} from './enemies.js';
import {castExtended,tickExtended,interceptProjectile,splitCastThroughPrism} from './spells.js';
import {createWand,createRune,hasRune} from './items.js';
import {nextRandom} from './rng.js';
import {floorTrace} from './generator.js';
import {tickEncounters} from './locations.js';
import {KNOCKBACK_BALANCE,BATTLE_ROYALE_BALANCE,CONFIG,EARTH_BALANCE,SCENE_BALANCE,PVP_BALANCE,PLAYER_BALANCE,ENEMY_BALANCE,ITEM_BALANCE,RARITIES,COMBAT_BALANCE,SPECIAL_RUNE_BALANCE,SPECIAL_RUNES} from './balance.js';
import {WANDS,scaledNormal,lightningPoint,spellBalance,wandStats} from './wands.js';
export {CONFIG} from './balance.js';
export {createRandom,nextRandom} from './rng.js';
// The world state is plain JSON-serializable data. All rules are functions of (state, player id, input).
const world=s=>s.world??{width:CONFIG.worldWidth,height:CONFIG.worldHeight};
const IDLE=Object.freeze({x:0,y:0,held:false});
const SPAWN_SLOTS=[[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
export function createState(profile=null,options={}){
 const seed=(options.seed??0)>>>0;
 const s={
  time:0,nextId:100,nextPlayerId:1,seed,rngState:seed,scene:{id:'base',title:'Game',description:''},spawn:{x:600,y:450},
  players:[],items:[],pedestals:[],portals:[],walls:[],
  projectiles:[],effects:[],hitFeedback:[],targets:[],enemies:[],telegraphs:[],shots:0
 };
 if(profile)addPlayer(s,profile);
 return s;
}
export const getPlayer=(s,id)=>s.players.find(p=>p.id===id);
export function addPlayer(s,profile){
 const [dx,dy]=SPAWN_SLOTS[s.players.length%SPAWN_SLOTS.length],spacing=SCENE_BALANCE.spawnSpacing;
 const p={
  id:s.nextPlayerId++,x:s.spawn.x+dx*spacing,y:s.spawn.y+dy*spacing,angle:-Math.PI/2,name:profile.name,color:profile.color,
  wand:{id:s.nextId++,type:'test'},mode:'Safe',charge:0,hits:0,damage:0,health:PLAYER_BALANCE.health,mana:PLAYER_BALANCE.mana,rune:null,activePedestal:null,nearPortal:null
 };
 s.players.push(p);return p;
}
export function removePlayer(s,id){
 const p=getPlayer(s,id);if(!p)return false;
 // A leaving player's wand stays in the world so that it is not lost.
 if(p.wand&&!s.battleRoyale)s.items.push({...p.wand,x:p.x,y:p.y,availableAt:s.time});
 s.players=s.players.filter(i=>i!==p);return true;
}
export function setMode(s,id,mode){const p=getPlayer(s,id);if(!p||!['Safe','Normal','Special'].includes(mode))return;p.mode=mode;p.charge=0;}
export function cancelCharge(s,id){const p=getPlayer(s,id);if(p)p.charge=0;}
export function dropWand(s,id){
 const p=getPlayer(s,id);if(!p?.wand)return false;
 s.items.push({...p.wand,...dropPoint(s,p),availableAt:s.time+CONFIG.pickupDelay});
 p.wand=null;p.charge=0;return true;
}
// Discrete player actions travel as commands next to the continuous input so none is lost between ticks.
export function applyCommand(s,id,command){
 if(s.battleRoyale&&(s.completed||getPlayer(s,id)?.health<=0||getPlayer(s,id)?.bot))return;
 if(command.type==='resetPuzzle'){const p=getPlayer(s,id);if(p)resetPuzzle(s,p);}
 else if(command.type==='setRarity'&&s.scene.id==='debug'&&RARITIES.includes(command.rarity)){s.debugRarity=command.rarity;for(const player of s.players)player.activePedestal=null;}
 else if(command.type==='spawnEnemy'&&s.scene.id==='debug'&&ENEMY_BALANCE[command.enemy]){const p=getPlayer(s,id);if(p){const at=dropPoint(s,{...p,angle:p.angle});spawnEnemy(s,command.enemy,at.x,at.y,null);}}
 else if(command.type==='clearEnemies'&&s.scene.id==='debug'){s.enemies=[];s.telegraphs=[];s.projectiles=s.projectiles.filter(b=>!b.enemy);}
 else if(command.type==='setRuneEffect'&&s.scene.id==='debug'&&(command.effect==='random'||SPECIAL_RUNES[command.effect]))s.debugRuneEffect=command.effect;
 else if(command.type==='setMode')setMode(s,id,command.mode);
 else if(command.type==='dropRune'){const p=getPlayer(s,id);if(p?.rune){s.items.push({...p.rune,kind:'rune',...dropPoint(s,p),availableAt:s.time+CONFIG.pickupDelay});p.rune=null;p.charge=0;}}
 else if(command.type==='drop')dropWand(s,id);
 else if(command.type==='release')release(s,id);
 else if(command.type==='cancel')cancelCharge(s,id);
}
// Group travel: a portal is ready only when every player in the world stands in it.
export function readyPortal(s){
 if(!s.players.length)return null;
 return s.portals.find(portal=>portal.available&&s.players.every(p=>p.nearPortal===portal.id))??null;
}
function effect(s,details,duration){s.effects.push({...Object.fromEntries(Object.entries(details).filter(([,v])=>v!==undefined)),...(s.casting!==undefined?{by:s.casting,...(puzzleAt(s,getPlayer(s,s.casting))?{puzzlePoi:puzzleAt(s,getPlayer(s,s.casting)).id}:{})}:{}),life:duration,duration});}
const isPlayer=(s,actor)=>s.players.includes(actor);
const radiusOf=(s,actor)=>isPlayer(s,actor)?CONFIG.playerRadius:(actor.puzzle?actor.radius:(ENEMY_BALANCE[actor.type]?.radius??CONFIG.targetRadius));
const hitKey=(s,actor)=>`${isPlayer(s,actor)?'p':(s.enemies?.includes(actor)?'e':'t')}${actor.id}`;
// Everything an attack of this owner can affect: dummies and other players, never the attacker.
function victims(s,ownerId){return [...puzzleActors(s),...s.targets,...(s.enemies??[]).filter(e=>e.health>0),...s.players.filter(p=>p.id!==ownerId&&p.health>0)];}
function damage(s,victim,amount,enemy=false,owner=null,origin=null,spell=null){
 if(isPlayer(s,victim)&&puzzleAt(s,victim))return 0;
 amount=protectedDamage(s,victim,amount,origin);
 const actual=isPlayer(s,victim)&&!enemy?amount*PVP_BALANCE.friendlyFireMultiplier:amount;
 victim.hits=(victim.hits??0)+1;victim.damage=(victim.damage??0)+actual;
 if(victim.health!==undefined)victim.health=Math.max(0,Math.min(victim.maxHealth??(isPlayer(s,victim)?PLAYER_BALANCE.health:Infinity),victim.health-actual));
 const events=s.hitFeedback??(s.hitFeedback=[]);
 events.push({key:`${s.time}:${hitKey(s,victim)}:${victim.hits}`,time:s.time,target:hitKey(s,victim),x:victim.x,y:victim.y,spell:spell??(enemy?'earth':getPlayer(s,owner)?.wand?.type??'test'),amount:actual,killed:victim.health===0,localPlayer:isPlayer(s,victim)?victim.id:null});
 if(events.length>64)events.shift();
 if(actual>0&&owner!==null)alertEnemies(s,victim,owner);return actual;
}
function attackProfile(p){return {owner:p.id,spellType:p.wand?.type??'test',bloodHeal:p.wand?.type==='blood'&&p.mode==='Normal'?spellBalance(p).healFactor:0,healing:hasRune(p,'healing'),push:(p.wand?.type==='gravity'||p.wand?.type==='void'&&p.mode==='Special'?0:COMBAT_BALANCE.basePush*p.charge)*(hasRune(p,'force')?SPECIAL_RUNE_BALANCE.pushMultiplier:1)};}
function attackHit(s,target,amount,attack,origin=attack){
 const profile=attack??{},owner=getPlayer(s,profile.owner);
 if(target.puzzle){puzzleHit(s,target,profile,origin,{move:moveActor});return 0;}
 if(isPlayer(s,target)&&(profile.puzzlePoi!==undefined||owner&&puzzleAt(s,owner)))return 0;
 const actual=damage(s,target,profile.healing?-Math.abs(amount)*SPECIAL_RUNE_BALANCE.healFactor:amount,false,profile.owner,origin,profile.spellType);
 if(actual>0&&profile.bloodHeal&&(s.enemies?.includes(target)||s.battleRoyale&&isPlayer(s,target))&&owner?.health>0)owner.health=Math.min(owner.maxHealth??PLAYER_BALANCE.health,owner.health+actual*profile.bloodHeal);
 if(profile.push&&profile.kind!=='whirlwind'&&amount!==0&&!profile.pulling)pushTarget(s,target,origin.x??target.x,origin.y??target.y,profile.push,profile.angle??owner?.angle??0);
 return actual;
}
function piercingDamage(attack){const count=attack.hitIds?.length??0;return attack.damage*Math.max(COMBAT_BALANCE.pierceMin,COMBAT_BALANCE.pierceFalloff**count);}
function castRay(s,p,angle,range,radius,amount,profile,kind='lightningLine'){
 const dx=Math.cos(angle)*range,dy=Math.sin(angle)*range,hit=wallTrace(s,p.x,p.y,dx,dy,0),x2=p.x+dx*(hit?.t??1),y2=p.y+dy*(hit?.t??1);
 const targets=victims(s,p.id).filter(t=>segmentDistance(t.x,t.y,p.x,p.y,x2,y2)<=radiusOf(s,t)+radius).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y));
 targets.forEach((target,index)=>attackHit(s,target,amount*Math.max(COMBAT_BALANCE.pierceMin,COMBAT_BALANCE.pierceFalloff**index),profile,p));
 effect(s,{kind,x:p.x,y:p.y,x2,y2},COMBAT_BALANCE.rayDuration);
}
const fieldVictims=(s,owner)=>[...puzzleActors(s),...s.targets,...(s.enemies??[]),...(s.battleRoyale?s.players.filter(p=>p.id!==owner&&p.health>0):[])];
const spellContext={fieldVictims,profile:attackProfile,hit:attackHit,effect,projectile,victims,radiusOf,hitKey,trace:wallTrace,segmentDistance,pull:pullActor,ray:castRay};

function areaDamage(s,owner,x,y,radius,amount){
 for(const target of victims(s,owner.id))if(Math.hypot(target.x-x,target.y-y)<=radius+radiusOf(s,target))attackHit(s,target,amount,attackProfile(owner),{x,y});
}
function pushTarget(s,target,x,y,distance,fallbackAngle){
 if(target.puzzle&&!target.movable)return;
 let dx=target.x-x,dy=target.y-y;let length=Math.hypot(dx,dy);
 if(length<.001){dx=Math.cos(fallbackAngle);dy=Math.sin(fallbackAngle);length=1;}
 distance*=s.battleRoyale?BATTLE_ROYALE_BALANCE.forceMultiplier:1;
 if(target.puzzle){moveActor(s,target,dx/length*distance,dy/length*distance,radiusOf(s,target));return;}
 const previous=target.knockback??{x:0,y:0};
 target.knockback={x:previous.x+dx/length*distance,y:previous.y+dy/length*distance,life:KNOCKBACK_BALANCE.duration};
}

function tickKnockback(s,dt){
 for(const actor of [...s.players,...s.targets,...s.enemies]){
  const k=actor.knockback;if(!k)continue;
  if(actor.health<=0){delete actor.knockback;continue;}
  const elapsed=Math.min(dt,k.life),fraction=(1-Math.exp(-KNOCKBACK_BALANCE.decay*elapsed))/(1-Math.exp(-KNOCKBACK_BALANCE.decay*k.life));
  const dx=k.x*fraction,dy=k.y*fraction,x=actor.x,y=actor.y;
  moveActor(s,actor,dx,dy,radiusOf(s,actor));
  k.x=Math.abs(actor.x-x-dx)>.001?0:k.x-dx;k.y=Math.abs(actor.y-y-dy)>.001?0:k.y-dy;k.life-=elapsed;
  if(k.life<1e-6||Math.hypot(k.x,k.y)<.001)delete actor.knockback;
 }
}
function createEarthWall(s,p,projectileOnly=false){
 const b=spellBalance(p),horizontal=Math.abs(Math.cos(p.angle))<Math.abs(Math.sin(p.angle));
 const width=horizontal?b.wallLength:b.wallThickness,height=horizontal?b.wallThickness:b.wallLength;
 const x=Math.max(0,Math.min(world(s).width-width,p.x+Math.cos(p.angle)*b.wallDistance-width/2));
 const y=Math.max(0,Math.min(world(s).height-height,p.y+Math.sin(p.angle)*b.wallDistance-height/2));
 // Do not create solid geometry overlapping an actor or an existing wall.
 if(!projectileOnly&&[...s.players,...s.targets,...(s.enemies??[])].some(a=>a.x+CONFIG.playerRadius>x&&a.x-CONFIG.playerRadius<x+width&&a.y+CONFIG.playerRadius>y&&a.y-CONFIG.playerRadius<y+height))return false;
 if(s.walls.some(w=>x<w.x+w.width&&x+width>w.x&&y<w.y+w.height&&y+height>w.y))return false;
 s.walls.push({id:s.nextId++,x,y,width,height,expiresAt:s.time+b.wallDuration,owner:p.id,...(puzzleAt(s,p)?{puzzlePoi:puzzleAt(s,p).id}:{}),projectileOnly,kind:projectileOnly?'lightWall':'earthWall'});return true;
}
function projectile(s,p,details){
 const angle=details.angle??p.angle,radius=details.kind==='coldWave'?details.depth:details.radius;
 const dx=Math.cos(angle)*CONFIG.projectileOffset,dy=Math.sin(angle)*CONFIG.projectileOffset;
 const hit=wallTrace(s,p.x,p.y,dx,dy,radius),offset=hit?Math.max(0,hit.t-1e-5):1;
 const x=Math.max(radius,Math.min(world(s).width-radius,p.x+dx*offset));
 const y=Math.max(radius,Math.min(world(s).height-radius,p.y+dy*offset));
 const fire=details.kind==='fire'?spellBalance(p):null;
 s.projectiles.push({id:s.nextId++,owner:p.id,...(puzzleAt(s,p)?{puzzlePoi:puzzleAt(s,p).id}:{}),x,y,angle,distance:0,power:p.charge,...attackProfile(p),...(fire?{splashRadius:fire.splashRadius*p.charge,splashDamage:scaledNormal(fire.splashDamage,CONFIG.minDamageFactor,p.charge)}:{}),...Object.fromEntries(Object.entries(details).filter(([,v])=>v!==undefined))});
}
// The caster is recorded while a spell resolves, so a client can show its own predicted effects.
// Networked casts draw their randomness from (world seed, player, input number), so a client predicting a cast
// and the host resolving it produce the same spread. Local play keeps the shared random stream.
function castSeed(s,id,seq){let h=((s.seed??0)^Math.imul(id+1,0x9E3779B1)^Math.imul(seq+1,0x85EBCA6B))>>>0;h=Math.imul(h^(h>>>16),0x7feb352d);h=Math.imul(h^(h>>>15),0x846ca68b);return (h^(h>>>16))>>>0;}
export function release(s,id){
 const saved=s.rngState,seeded=s.castSeq!==undefined;if(seeded)s.rngState=castSeed(s,id,s.castSeq);
 s.casting=id;try{releaseCast(s,id);}finally{delete s.casting;if(seeded)s.rngState=saved;}
}
// Moves a player's freshly cast projectiles forward in time. The host uses it to make up the network delay
// of a client's cast, so its projectile appears where the client already shows it.
export function fastForward(s,ownerId,fromId,seconds){
 const mine=b=>b.owner===ownerId&&!b.enemy&&b.id>=fromId;let remaining=seconds;
 while(remaining>1e-6){
  const dt=Math.min(1/60,remaining);remaining-=dt;
  const all=s.projectiles,moving=all.filter(mine);if(!moving.length)break;
  s.projectiles=all.filter(b=>!mine(b));s.activeProjectiles=all;
  for(const b of moving)if(advanceProjectile(s,b,dt))s.projectiles.push(b);
  delete s.activeProjectiles;s.projectiles=s.projectiles.filter(b=>!b.dead);
 }
}
function releaseCast(s,id){
 const p=getPlayer(s,id);if(!p)return;
 const charge=p.charge,position={x:p.x,y:p.y},angle=p.angle,mana=p.mana,health=p.health,shots=s.shots;
 const double=hasRune(p,'double')&&p.wand&&p.mode!=='Safe'&&charge>0;
 const satellites=s.effects.filter(e=>e.kind==='satellite'&&e.owner===id).map(e=>structuredClone(e));
 if(p.wand&&p.mode!=='Safe'&&p.charge>0&&hasRune(p,'unstable'))p.castMultiplier=SPECIAL_RUNE_BALANCE.unstableMin+nextRandom(s)*(SPECIAL_RUNE_BALANCE.unstableMax-SPECIAL_RUNE_BALANCE.unstableMin);
 const b=p.wand?spellBalance(p):null,wall=double&&p.mode==='Special'&&['earth','light'].includes(p.wand.type);
 const offset=wall?(b.wallLength+SPECIAL_RUNE_BALANCE.wallGap)/2:SPECIAL_RUNE_BALANCE.copyOffset;
 if(double){p.x-=Math.sin(angle)*offset;p.y+=Math.cos(angle)*offset;}
 castSingle(s,id);
 const paidMana=p.mana,paidHealth=p.health;
 if(double&&s.shots>shots){
  p.x=position.x+Math.sin(angle)*offset;p.y=position.y-Math.cos(angle)*offset;p.angle=angle;p.charge=charge;p.mana=mana;p.health=health;
  if(p.wand.type==='orbit'&&p.mode==='Special')s.effects.push(...satellites.map(e=>({...e,id:s.nextId++})));
  castSingle(s,id);p.mana=paidMana;p.health=paidHealth;
 }
 p.x=position.x;p.y=position.y;p.angle=angle;delete p.castMultiplier;
 if(s.shots>shots){p.castCount=(p.castCount??0)+1;p.castFeedback={key:s.castSeq!==undefined?`seq:${s.castSeq}`:`cast:${p.castCount}`,x:p.x,y:p.y,angle,type:p.wand.type,mode:p.mode,charge};}
}
function castSingle(s,id){
 const p=getPlayer(s,id);if(!p)return;
 if(p.health<=0||!p.wand||p.mode==='Safe'||p.charge<=0){p.charge=0;return;}
 const type=p.wand.type,balance=spellBalance(p),manaCost=wandStats(p).manaCost*(p.mode==='Special'?ITEM_BALANCE.specialMana/ITEM_BALANCE.normalMana:1);if(p.mana<manaCost){p.charge=0;return;}
 const originalAngle=p.angle;
 if(!['fire','air','test'].includes(type)||p.mode==='Normal')p.angle+=(nextRandom(s)*2-1)*wandStats(p).spread*(ITEM_BALANCE.spreadMin/ITEM_BALANCE.spreadStart+(1-ITEM_BALANCE.spreadMin/ITEM_BALANCE.spreadStart)*(1-p.charge));
 const extended=splitCastThroughPrism(s,p,spellContext)?true:castExtended(s,p,spellContext);
 if(extended!==null){p.angle=originalAngle;p.charge=0;if(extended){p.mana-=manaCost;s.shots++;}return;}
 if(p.mode==='Normal'){
  if(type==='fire')projectile(s,p,{kind:'fire',speed:balance.projectileSpeed,radius:balance.projectileRadius+balance.chargedRadiusBonus*p.charge,range:scaledNormal(balance.projectileRange,CONFIG.minRangeFactor,p.charge),damage:scaledNormal(balance.normalDamage,CONFIG.minDamageFactor,p.charge)});
  else if(type==='ice'){
   const b=balance;
   const count=b.pellets+Math.floor(nextRandom(s)*3)-1;
   for(let i=0;i<count;i++)projectile(s,p,{kind:'icicle',angle:p.angle+b.spread*(1-.7*p.charge)*(i/(count-1)-.5),speed:b.projectileSpeed,radius:b.pelletRadius+b.chargedRadiusBonus*p.charge,range:scaledNormal(b.projectileRange,CONFIG.minRangeFactor,p.charge),damage:scaledNormal(b.pelletDamage,CONFIG.minDamageFactor,p.charge)});
  }else if(type==='air'){
   const b=balance;projectile(s,p,{kind:'whirlwind',speed:b.projectileSpeed,radius:b.projectileRadius+b.chargedRadiusBonus*p.charge,range:scaledNormal(b.projectileRange,CONFIG.minRangeFactor,p.charge),damage:scaledNormal(b.normalDamage,CONFIG.minDamageFactor,p.charge),push:b.normalPush*p.charge,splashFactor:b.splashFactor});
  }else if(type==='earth'){
   const b=balance;projectile(s,p,{kind:'boulder',speed:b.projectileSpeed,radius:b.projectileRadius+b.chargedRadiusBonus*p.charge,range:scaledNormal(b.projectileRange,CONFIG.minRangeFactor,p.charge),damage:scaledNormal(b.normalDamage,CONFIG.minDamageFactor,p.charge),ricochets:0,hitIds:[]});
  }else if(type==='test'){
   const b=balance;projectile(s,p,{kind:'spark',speed:b.projectileSpeed,radius:b.projectileRadius+b.chargedRadiusBonus*p.charge,range:scaledNormal(b.projectileRange,CONFIG.minRangeFactor,p.charge),damage:0,push:b.normalPush*p.charge});
  }else if(['nature','gravity','light','crystal'].includes(type)){
   const b=balance,kind={nature:'thorn',gravity:'gravityOrb',light:'lightDisc',crystal:'crystalShard'}[type];
   projectile(s,p,{kind,speed:b.projectileSpeed,radius:b.projectileRadius+b.chargedRadiusBonus*p.charge,range:scaledNormal(b.projectileRange,CONFIG.minRangeFactor,p.charge),damage:scaledNormal(b.normalDamage,CONFIG.minDamageFactor,p.charge),hitIds:[],origin:{x:p.x,y:p.y},returning:false,rootDuration:b.rootDuration,pullRadius:b.pullRadius,pull:b.normalPull,homingRange:b.homingRange,homingAngle:b.homingAngle,turnSpeed:b.turnSpeed,childDamage:b.childDamage,childAngle:b.childAngle});
  }else if(type==='lightning'){
   const b=balance,range=scaledNormal(b.lineRange,CONFIG.minRangeFactor,p.charge);
   castRay(s,p,p.angle,range,b.lineRadius*p.charge,scaledNormal(b.lineDamage,CONFIG.minDamageFactor,p.charge),attackProfile(p));
  }
 }else if(type==='lightning'){
  // A sky strike targets the reached point directly; it performs no wall trace.
  const point=lightningPoint(p),b=balance;
  areaDamage(s,p,point.x,point.y,b.strikeRadius,b.strikeDamage);
  effect(s,{kind:'skyStrike',owner:p.id,...point,radius:b.strikeRadius},b.strikeDuration);
 }else if(p.charge>=1){
  if(type==='fire'){
   areaDamage(s,p,p.x,p.y,balance.specialRadius,balance.specialDamage);
   effect(s,{kind:'fireWave',owner:p.id,x:p.x,y:p.y,radius:balance.specialRadius},CONFIG.specialDuration);
  }else if(type==='air'){
   const b=balance;for(const target of victims(s,p.id))if(Math.hypot(target.x-p.x,target.y-p.y)<=b.specialRadius+radiusOf(s,target))attackHit(s,target,b.specialDamage,{...attackProfile(p),push:b.specialPush},p);effect(s,{kind:'airSphere',x:p.x,y:p.y,radius:b.specialRadius},b.specialDuration);
  }else if(type==='earth'){
   if(!createEarthWall(s,p)){p.angle=originalAngle;p.charge=0;return;}
  }else if(type==='test'){
   const b=balance;for(const target of puzzleActors(s))if(Math.hypot(target.x-p.x,target.y-p.y)<=b.specialRadius+target.radius)attackHit(s,target,0,attackProfile(p),p);effect(s,{kind:'testSphere',x:p.x,y:p.y,radius:b.specialRadius},b.specialDuration);
  }else if(type==='light'){
   if(!createEarthWall(s,p,true)){p.angle=originalAngle;p.charge=0;return;}
  }else if(['nature','gravity','crystal'].includes(type)){
   const b=balance,kind={nature:'vines',gravity:'gravityWell',crystal:'crystalTrap'}[type],distance=b.patchDistance??b.wellDistance??b.trapDistance;
   const radius=b.patchRadius??b.wellRadius??b.trapRadius,x=Math.max(radius,Math.min(world(s).width-radius,p.x+Math.cos(p.angle)*distance)),y=Math.max(radius,Math.min(world(s).height-radius,p.y+Math.sin(p.angle)*distance));
   effect(s,{...attackProfile(p),kind,x,y,radius,damage:b.wellDamage??b.trapDamage??b.patchDamage??0,tickInterval:b.tickInterval??.5,tick:0,pullSpeed:b.pullSpeed,slowFactor:b.slowFactor,shardCount:b.shardCount,shardSpeed:b.projectileSpeed,shardRange:b.projectileRange,shardRadius:b.projectileRadius},b.patchDuration??b.wellDuration??b.trapDuration);
  }else if(type==='ice'){
   const b=balance;projectile(s,p,{kind:'coldWave',speed:b.waveSpeed,range:b.waveRange,radius:b.waveRadius,depth:b.waveDepth,damage:b.waveDamage,hitIds:[]});
  }
 }else{p.angle=originalAngle;p.charge=0;return;}
 p.angle=originalAngle;p.mana-=manaCost;s.shots++;p.charge=0;
}
function segmentDistance(x,y,ax,ay,bx,by){const dx=bx-ax,dy=by-ay;const t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-ax-t*dx,y-ay-t*dy);}
// inputs maps a player id to {x,y,held,commands}; a missing entry means an idle player.
export function step(s,inputs,dt){
 if(s.battleRoyale?.result)return;
 s.time+=dt;s.hitFeedback=(s.hitFeedback??[]).filter(e=>s.time-e.time<.35);s.walls=s.walls.filter(w=>w.permanent||w.expiresAt>s.time);
 for(const p of s.players)stepPlayer(s,p,inputs[p.id]??IDLE,dt);
 tickKnockback(s,dt);
 tickEncounters(s,dt,{move:moveActor,damage,trace:wallTrace});
 const projectiles=s.projectiles;s.projectiles=[];s.activeProjectiles=projectiles;
 for(const b of projectiles)if(advanceProjectile(s,b,dt))s.projectiles.push(b);
 delete s.activeProjectiles;s.projectiles=s.projectiles.filter(b=>!b.dead);
 tickFields(s,dt);tickExtended(s,dt,spellContext);tickPuzzles(s,dt,{move:moveActor,trace:wallTrace});
 s.effects=s.effects.filter(e=>(e.life-=dt)>0);
 tickBattleRoyale(s,dt);
}
function stepPlayer(s,p,input,dt){
 if(p.bot)return;
 if(p.health<=0){p.charge=0;delete p.hooked;return;}
 if(p.hooked){const hook=p.hooked,enemy=s.enemies?.find(e=>e.id===hook.owner&&e.health>0);if(enemy)pullActor(s,p,enemy.x,enemy.y,hook.speed*Math.min(dt,hook.life));hook.life-=dt;if(!enemy||hook.life<=0)delete p.hooked;}
 p.mana=Math.min(PLAYER_BALANCE.mana,p.mana+PLAYER_BALANCE.manaRegen*dt);
 if(input.seq!==undefined)s.castSeq=input.seq;
 for(const command of input.commands??[])applyCommand(s,p.id,command);
 delete s.castSeq;
 let {x=0,y=0}=input;const length=Math.hypot(x,y);
 if(length>1){x/=length;y/=length;}
 if(length>CONFIG.inputDeadzone){
  p.angle=Math.atan2(y,x);
  moveActor(s,p,x*CONFIG.speed*dt,y*CONFIG.speed*dt,CONFIG.playerRadius);
 }
 if(input.held&&p.wand&&p.mode!=='Safe'){
  const b=spellBalance(p);
  p.charge=Math.min(1,p.charge+dt/(p.mode==='Special'?b.specialChargeTime:b.chargeTime));
 }
 const pedestal=s.pedestals.find(i=>Math.hypot(i.x-p.x,i.y-p.y)<=SCENE_BALANCE.pedestalRadius);
 if(pedestal&&p.activePedestal!==pedestal.id){p.wand={id:s.nextId++,...createWand(pedestal.type,s.debugRarity??'Common',()=>nextRandom(s))};p.charge=0;}
 p.activePedestal=pedestal?.id??null;
 const station=s.scene.id==='debug'&&s.runeStation;const near=station&&Math.hypot(station.x-p.x,station.y-p.y)<=SCENE_BALANCE.pedestalRadius;
 if(near&&!p.activeRuneStation){p.rune={id:s.nextId++,...createRune(()=>nextRandom(s),s.debugRarity)};if(RARITIES.indexOf(s.debugRarity)>=SPECIAL_RUNE_BALANCE.minTier&&SPECIAL_RUNES[s.debugRuneEffect])p.rune.special=[s.debugRuneEffect];p.charge=0;}p.activeRuneStation=near?station.id:null;
 const portal=s.portals.find(i=>Math.hypot(i.x-p.x,i.y-p.y)<=SCENE_BALANCE.portalRadius);p.nearPortal=portal?.id??null;
 // Items are removed on pickup, so with several nearby players the first one in order takes it.
 const item=s.items.find(i=>(i.kind==='rune'?!p.rune:!p.wand)&&s.time>=i.availableAt&&Math.hypot(i.x-p.x,i.y-p.y)<=CONFIG.pickupRadius);
 if(item){if(item.kind==='rune')p.rune={...item};else p.wand={...item};s.items=s.items.filter(i=>i!==item);}
}

// Slab intersection against expanded rectangles provides swept wall collision.
function rectTrace(x,y,dx,dy,rect,radius,allowEscape=false){
 if(rect.angle){const cx=rect.x+rect.width/2,cy=rect.y+rect.height/2,c=Math.cos(rect.angle),sn=Math.sin(rect.angle);const hit=rectTrace(cx+(x-cx)*c+(y-cy)*sn,cy-(x-cx)*sn+(y-cy)*c,dx*c+dy*sn,-dx*sn+dy*c,{...rect,angle:0},radius,allowEscape);return hit?{...hit,nx:hit.nx*c-hit.ny*sn,ny:hit.nx*sn+hit.ny*c}:null;}
 let entry=-Infinity,exit=Infinity,nx=0,ny=0;
 for(const [origin,delta,min,max,axis] of [[x,dx,rect.x-radius,rect.x+rect.width+radius,'x'],[y,dy,rect.y-radius,rect.y+rect.height+radius,'y']]){
  if(Math.abs(delta)<1e-10){if(origin<min||origin>max)return null;continue;}
  let near=(min-origin)/delta,far=(max-origin)/delta,sign=-1;if(near>far){[near,far]=[far,near];sign=1;}
  if(near>entry){entry=near;nx=axis==='x'?sign:0;ny=axis==='y'?sign:0;}exit=Math.min(exit,far);
  if(entry>exit)return null;
 }
 if(exit<0||entry>1)return null;
 if(entry<0){if(allowEscape)return null;const length=Math.hypot(dx,dy)||1;return {t:0,nx:-dx/length,ny:-dy/length};} // Actors may escape overlaps; projectiles are blocked inside walls.
 return {t:Math.max(0,entry),nx,ny};
}
function wallTrace(s,x,y,dx,dy,radius,movement=false){
 let closest=s.map?floorTrace(s.map,x,y,dx,dy,radius):null;
 for(const wall of s.walls){if(movement&&wall.projectileOnly)continue;const hit=rectTrace(x,y,dx,dy,wall,radius,movement);if(hit&&(!closest||hit.t<closest.t))closest={...hit,wall};}
 return closest;
}
function moveActor(s,actor,dx,dy,radius){
 if((actor.rootUntil??0)>s.time)return;
 const slow=s.effects.filter(e=>e.kind==='vines'&&(s.enemies?.includes(actor)||actor.puzzle||s.battleRoyale&&isPlayer(s,actor)&&actor.id!==e.owner)&&Math.hypot(actor.x-e.x,actor.y-e.y)<=e.radius+radius).reduce((value,e)=>Math.min(value,e.slowFactor),1);dx*=slow;dy*=slow;
 if(s.battleRoyale){
  for(let i=0;i<3&&(Math.abs(dx)+Math.abs(dy)>1e-7);i++){
   const hit=wallTrace(s,actor.x,actor.y,dx,dy,radius,true),t=hit?Math.max(0,hit.t-1e-6):1;
   actor.x+=dx*t;actor.y+=dy*t;if(!hit)break;
   dx*=1-t;dy*=1-t;const normal=dx*hit.nx+dy*hit.ny;
   if(normal<0){dx-=normal*hit.nx;dy-=normal*hit.ny;}else break;
  }
  actor.x=Math.max(radius,Math.min(world(s).width-radius,actor.x));actor.y=Math.max(radius,Math.min(world(s).height-radius,actor.y));return;
 }
 const xhit=wallTrace(s,actor.x,actor.y,dx,0,radius,true);
 actor.x=Math.max(radius,Math.min(world(s).width-radius,actor.x+dx*(xhit?Math.max(0,xhit.t-1e-6):1)));
 const yhit=wallTrace(s,actor.x,actor.y,0,dy,radius,true);
 actor.y=Math.max(radius,Math.min(world(s).height-radius,actor.y+dy*(yhit?Math.max(0,yhit.t-1e-6):1)));
}
function boundaryTrace(s,x,y,dx,dy,radius){
 let hit=null;
 for(const [origin,delta,min,max,axis] of [[x,dx,radius,world(s).width-radius,'x'],[y,dy,radius,world(s).height-radius,'y']]){
  const t=delta>0?(max-origin)/delta:delta<0?(min-origin)/delta:Infinity;
  if(t>=0&&t<=1&&(!hit||t<hit.t))hit={t,nx:axis==='x'?(delta>0?-1:1):0,ny:axis==='y'?(delta>0?-1:1):0};
 }
 return hit;
}
function advanceProjectile(s,b,dt){
 if(b.dead)return false;
 if(b.kind==='comet'){b.speed+=b.acceleration*dt;b.damage=b.initialDamage*(1+b.distanceDamage*Math.min(1,b.distance/b.range));}
 if(b.kind==='crystalShard'&&!b.child)homeShard(s,b,dt);
 if(b.kind==='lightDisc'&&b.returning){const owner=getPlayer(s,b.owner);if(!owner||owner.health<=0)return false;const dx=owner.x-b.x,dy=owner.y-b.y;if(Math.hypot(dx,dy)<=b.speed*dt+CONFIG.playerRadius)return false;b.angle=Math.atan2(dy,dx);}
 let remaining=Math.min(b.speed*dt,Math.max(0,b.range-b.distance));
 // Ricochets consume the same distance budget, even across several collisions.
 while(remaining>1e-8){
  const ax=b.x,ay=b.y,dx=Math.cos(b.angle)*remaining,dy=Math.sin(b.angle)*remaining;
  let hit=wallTrace(s,ax,ay,dx,dy,b.kind==='coldWave'?b.depth:b.radius);
  const edge=boundaryTrace(s,ax,ay,dx,dy,b.radius);if(edge&&(!hit||edge.t<hit.t))hit=edge;
  const travel=remaining*(hit?.t??1);b.x+=Math.cos(b.angle)*travel;b.y+=Math.sin(b.angle)*travel;b.distance+=travel;if(b.kind==='comet')b.damage=b.initialDamage*(1+b.distanceDamage*Math.min(1,b.distance/b.range));
  if(interceptProjectile(s,b,ax,ay,spellContext))return true;
  const targets=(b.enemy?s.players.filter(p=>p.health>0):victims(s,b.owner)).filter(t=>{
   const reach=radiusOf(s,t);
   if(b.kind!=='coldWave')return segmentDistance(t.x,t.y,ax,ay,b.x,b.y)<=reach+b.radius;
   const tx=t.x-ax,ty=t.y-ay,forward=tx*Math.cos(b.angle)+ty*Math.sin(b.angle),side=-tx*Math.sin(b.angle)+ty*Math.cos(b.angle);
   return forward>=-b.depth-reach&&forward<=travel+b.depth+reach&&Math.abs(side)<=b.radius+reach;
  });
  if(['coldWave','boulder','lightDisc','voidOrb'].includes(b.kind)){
   for(const target of targets.sort((a,c)=>Math.hypot(a.x-ax,a.y-ay)-Math.hypot(c.x-ax,c.y-ay)))if(!b.hitIds.includes(hitKey(s,target))){attackHit(s,target,piercingDamage(b),b,{x:ax,y:ay});b.hitIds.push(hitKey(s,target));if(b.kind==='voidOrb'&&b.hitIds.length>=b.pierceCount)return false;}
  }else if(targets.length){
   const target=targets.sort((a,c)=>Math.hypot(a.x-ax,a.y-ay)-Math.hypot(c.x-ax,c.y-ay))[0];
   if(b.kind==='fire'){const length=Math.hypot(b.x-ax,b.y-ay)||1,projection=((target.x-ax)*Math.cos(b.angle)+(target.y-ay)*Math.sin(b.angle));const travel=Math.max(0,Math.min(length,projection));b.x=ax+Math.cos(b.angle)*travel;b.y=ay+Math.sin(b.angle)*travel;explodeFire(s,b);}if(b.enemy)damage(s,target,b.damage,true);else attackHit(s,target,b.damage,b,{x:ax,y:ay});
   if(b.kind==='hook'){const owner=s.enemies?.find(e=>e.id===b.owner&&e.health>0);if(owner)target.hooked={owner:owner.id,life:b.pullDuration,speed:b.pullSpeed};}
   if(b.kind==='thorn'&&(!isPlayer(s,target)||s.battleRoyale))target.rootUntil=s.time+b.rootDuration;
   if(b.kind==='gravityOrb')for(const enemy of fieldVictims(s,b.owner))if((enemy.health??1)>0&&Math.hypot(enemy.x-target.x,enemy.y-target.y)<=b.pullRadius)pullActor(s,enemy,target.x,target.y,b.pull);
   if(b.kind==='crystalShard'&&!b.child)for(const side of [-1,1])s.projectiles.push({...b,rootId:b.rootId??b.id,id:s.nextId++,x:target.x+Math.cos(b.angle+side*b.childAngle)*(radiusOf(s,target)+b.radius+1),y:target.y+Math.sin(b.angle+side*b.childAngle)*(radiusOf(s,target)+b.radius+1),angle:b.angle+side*b.childAngle,range:Math.max(1,b.range-b.distance),distance:0,damage:b.damage*b.childDamage,radius:b.radius*.7,child:true});
   if(b.kind==='whirlwind'){
    const center={x:target.x,y:target.y};for(const t of victims(s,b.owner))if(Math.hypot(t.x-center.x,t.y-center.y)<=b.radius+radiusOf(s,t)){if(t!==target)attackHit(s,t,b.damage*(b.splashFactor??1),b,{x:ax,y:ay});pushTarget(s,t,ax,ay,b.push,b.angle);}
   }else if(b.push&&b.kind==='spark')pushTarget(s,target,ax,ay,b.push,b.angle);
   if(b.kind!=='fire')effect(s,{kind:b.kind==='icicle'?'iceImpact':b.kind==='spark'?'sparkImpact':b.kind==='whirlwind'?'airImpact':'impact',x:b.x,y:b.y,radius:(CONFIG.impactRadius+CONFIG.chargedImpactBonus)*b.power},CONFIG.impactDuration);return false;
  }
  if(hit){
   if(b.kind==='fire')explodeFire(s,b);
   if(b.kind==='lightDisc'&&!b.returning){b.returning=true;b.distance=0;b.hitIds=[];return true;}
   if(b.kind!=='boulder'||b.ricochets>=EARTH_BALANCE.maxRicochets)return false;
   const vx=Math.cos(b.angle),vy=Math.sin(b.angle),dot=vx*hit.nx+vy*hit.ny;b.angle=Math.atan2(vy-2*dot*hit.ny,vx-2*dot*hit.nx);
   b.x+=hit.nx*EARTH_BALANCE.collisionEpsilon;b.y+=hit.ny*EARTH_BALANCE.collisionEpsilon;b.ricochets++;remaining-=travel;
  }else remaining=0;
 }
 if(b.range-b.distance<=1e-7){if(b.kind==='lightDisc'&&!b.returning){b.returning=true;b.distance=0;b.hitIds=[];return true;}effect(s,{kind:b.kind==='spark'?'sparkImpact':'impact',x:b.x,y:b.y,radius:CONFIG.expiryRadius*b.power},CONFIG.expiryDuration);return false;}
 return true;
}

function explodeFire(s,b){
 for(const target of victims(s,b.owner))if(Math.hypot(target.x-b.x,target.y-b.y)<=b.splashRadius+radiusOf(s,target))attackHit(s,target,b.splashDamage,b,b);
 effect(s,{kind:'impact',x:b.x,y:b.y,radius:b.splashRadius},CONFIG.impactDuration);
}

function pullActor(s,actor,x,y,distance){distance*=s.battleRoyale?BATTLE_ROYALE_BALANCE.forceMultiplier:1;if(actor.puzzle&&!actor.movable)return;const dx=x-actor.x,dy=y-actor.y,length=Math.hypot(dx,dy);if(length>1e-6)moveActor(s,actor,dx/length*Math.min(distance,length),dy/length*Math.min(distance,length),radiusOf(s,actor));}
function homeShard(s,b,dt){
 const angleDiff=a=>Math.atan2(Math.sin(a-b.angle),Math.cos(a-b.angle));
 const target=fieldVictims(s,b.owner).filter(e=>(e.health??1)>0&&Math.hypot(e.x-b.x,e.y-b.y)<=b.homingRange&&Math.abs(angleDiff(Math.atan2(e.y-b.y,e.x-b.x)))<=b.homingAngle).sort((a,c)=>Math.hypot(a.x-b.x,a.y-b.y)-Math.hypot(c.x-b.x,c.y-b.y))[0];
 if(target){const diff=angleDiff(Math.atan2(target.y-b.y,target.x-b.x));b.angle+=Math.max(-b.turnSpeed*dt,Math.min(b.turnSpeed*dt,diff));}
}
function tickFields(s,dt){
 for(const e of s.effects){
  if(e.kind==='gravityWell'||e.kind==='vines'){
   for(const enemy of fieldVictims(s,e.owner))if((enemy.health??1)>0&&Math.hypot(enemy.x-e.x,enemy.y-e.y)<=e.radius+radiusOf(s,enemy))if(e.pullSpeed)pullActor(s,enemy,e.x,e.y,e.pullSpeed*dt);
   e.tick-=Math.min(dt,e.life);while(e.tick<=0){for(const enemy of e.healing?victims(s,e.owner):fieldVictims(s,e.owner))if((enemy.health??1)>0&&Math.hypot(enemy.x-e.x,enemy.y-e.y)<=e.radius+radiusOf(s,enemy))attackHit(s,enemy,e.damage,e,e);e.tick+=e.tickInterval;}
  }else if(e.kind==='crystalTrap'&&fieldVictims(s,e.owner).some(enemy=>enemy.health>0&&Math.hypot(enemy.x-e.x,enemy.y-e.y)<=e.radius+radiusOf(s,enemy))){
   for(const target of victims(s,e.owner))if(Math.hypot(target.x-e.x,target.y-e.y)<=e.radius+radiusOf(s,target))attackHit(s,target,e.damage,e,e);
   for(let i=0;i<e.shardCount;i++)s.projectiles.push({id:s.nextId++,owner:e.owner,healing:e.healing,push:e.push,kind:'crystalShard',child:true,x:e.x,y:e.y,angle:i/e.shardCount*Math.PI*2,speed:e.shardSpeed,range:e.shardRange,radius:e.shardRadius,distance:0,damage:e.damage*.25,power:1});
   effect(s,{kind:'crystalImpact',x:e.x,y:e.y,radius:e.radius},CONFIG.impactDuration);e.life=0;
  }
 }
}

function dropPoint(s,p){
 let best={x:p.x,y:p.y},bestDistance=-1;
 for(const offset of [0,Math.PI/2,-Math.PI/2,Math.PI]){
  const dx=Math.cos(p.angle+offset)*CONFIG.dropDistance,dy=Math.sin(p.angle+offset)*CONFIG.dropDistance;
  const wall=wallTrace(s,p.x,p.y,dx,dy,CONFIG.playerRadius,true),edge=boundaryTrace(s,p.x,p.y,dx,dy,CONFIG.playerRadius);
  const distance=Math.max(0,Math.min(wall?.t??1,edge?.t??1)-1e-5);
  if(distance>bestDistance){best={x:p.x+dx*distance,y:p.y+dy*distance};bestDistance=distance;}
  if(distance>.99)break;
 }return best;
}
