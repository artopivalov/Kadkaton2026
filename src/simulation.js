import {floorTrace} from './generator.js';
import {tickEncounters} from './locations.js';
import {CONFIG,ICE_BALANCE,LIGHTNING_BALANCE,AIR_BALANCE,EARTH_BALANCE,TEST_BALANCE,SCENE_BALANCE,PVP_BALANCE,PLAYER_BALANCE,ENEMY_BALANCE} from './balance.js';
import {WANDS,scaledNormal,lightningPoint} from './wands.js';
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
  projectiles:[],effects:[],targets:[],shots:0
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
 if(p.wand)s.items.push({...p.wand,x:p.x,y:p.y,availableAt:s.time});
 s.players=s.players.filter(i=>i!==p);return true;
}
export function setMode(s,id,mode){const p=getPlayer(s,id);if(!p||!['Safe','Normal','Special'].includes(mode))return;p.mode=mode;p.charge=0;}
export function cancelCharge(s,id){const p=getPlayer(s,id);if(p)p.charge=0;}
export function dropWand(s,id){
 const p=getPlayer(s,id);if(!p?.wand)return false;
 s.items.push({...p.wand,x:Math.max(CONFIG.playerRadius,Math.min(world(s).width-CONFIG.playerRadius,p.x+Math.cos(p.angle)*CONFIG.dropDistance)),y:Math.max(CONFIG.playerRadius,Math.min(world(s).height-CONFIG.playerRadius,p.y+Math.sin(p.angle)*CONFIG.dropDistance)),availableAt:s.time+CONFIG.pickupDelay});
 p.wand=null;p.charge=0;return true;
}
// Discrete player actions travel as commands next to the continuous input so none is lost between ticks.
export function applyCommand(s,id,command){
 if(command.type==='setMode')setMode(s,id,command.mode);
 else if(command.type==='dropRune'){const p=getPlayer(s,id);if(p?.rune){s.items.push({...p.rune,kind:'rune',x:p.x+50,y:p.y,availableAt:s.time+CONFIG.pickupDelay});p.rune=null;}}
 else if(command.type==='drop')dropWand(s,id);
 else if(command.type==='release')release(s,id);
 else if(command.type==='cancel')cancelCharge(s,id);
}
// Group travel: a portal is ready only when every player in the world stands in it.
export function readyPortal(s){
 if(!s.players.length)return null;
 return s.portals.find(portal=>portal.available&&s.players.every(p=>p.nearPortal===portal.id))??null;
}
function effect(s,details,duration){s.effects.push({...details,life:duration,duration});}
const isPlayer=(s,actor)=>s.players.includes(actor);
const radiusOf=(s,actor)=>isPlayer(s,actor)?CONFIG.playerRadius:(ENEMY_BALANCE[actor.type]?.radius??CONFIG.targetRadius);
const hitKey=(s,actor)=>`${isPlayer(s,actor)?'p':(s.enemies?.includes(actor)?'e':'t')}${actor.id}`;
// Everything an attack of this owner can affect: dummies and other players, never the attacker.
function victims(s,ownerId){return [...s.targets,...(s.enemies??[]).filter(e=>e.health>0),...s.players.filter(p=>p.id!==ownerId&&p.health>0)];}
function damage(s,victim,amount,enemy=false){const actual=isPlayer(s,victim)&&!enemy?amount*PVP_BALANCE.friendlyFireMultiplier:amount;victim.hits++;victim.damage+=actual;if(victim.health!==undefined)victim.health=Math.max(0,victim.health-actual);}
const runeFactor=(p,type)=>p.rune?.type===type?p.rune.factor:1;
function areaDamage(s,owner,x,y,radius,amount){
 radius*=runeFactor(owner,'size');amount*=runeFactor(owner,'damage');
 for(const target of victims(s,owner.id))if(Math.hypot(target.x-x,target.y-y)<=radius+radiusOf(s,target))damage(s,target,amount);
}
function pushTarget(s,target,x,y,distance,fallbackAngle){
 let dx=target.x-x,dy=target.y-y;let length=Math.hypot(dx,dy);
 if(length<.001){dx=Math.cos(fallbackAngle);dy=Math.sin(fallbackAngle);length=1;}
 moveActor(s,target,dx/length*distance,dy/length*distance,radiusOf(s,target));
}
function areaPush(s,owner,x,y,radius,distance){radius*=runeFactor(owner,'size');for(const target of victims(s,owner.id))if(Math.hypot(target.x-x,target.y-y)<=radius+radiusOf(s,target))pushTarget(s,target,x,y,distance,owner.angle);}
function createEarthWall(s,p){
 const b=EARTH_BALANCE,horizontal=Math.abs(Math.cos(p.angle))<Math.abs(Math.sin(p.angle));
 const width=horizontal?b.wallLength:b.wallThickness,height=horizontal?b.wallThickness:b.wallLength;
 const x=Math.max(0,Math.min(world(s).width-width,p.x+Math.cos(p.angle)*b.wallDistance-width/2));
 const y=Math.max(0,Math.min(world(s).height-height,p.y+Math.sin(p.angle)*b.wallDistance-height/2));
 // Do not create solid geometry overlapping an actor or an existing wall.
 if([...s.players,...s.targets,...(s.enemies??[])].some(a=>a.x+CONFIG.playerRadius>x&&a.x-CONFIG.playerRadius<x+width&&a.y+CONFIG.playerRadius>y&&a.y-CONFIG.playerRadius<y+height))return false;
 if(s.walls.some(w=>x<w.x+w.width&&x+width>w.x&&y<w.y+w.height&&y+height>w.y))return false;
 s.walls.push({id:s.nextId++,x,y,width,height,expiresAt:s.time+b.wallDuration,owner:p.id});return true;
}
function projectile(s,p,details){
 const angle=details.angle??p.angle,radius=details.kind==='coldWave'?details.depth:details.radius;
 const dx=Math.cos(angle)*CONFIG.projectileOffset,dy=Math.sin(angle)*CONFIG.projectileOffset;
 const hit=wallTrace(s,p.x,p.y,dx,dy,radius),offset=hit?Math.max(0,hit.t-1e-5):1;
 const x=Math.max(radius,Math.min(world(s).width-radius,p.x+dx*offset));
 const y=Math.max(radius,Math.min(world(s).height-radius,p.y+dy*offset));
 const rune=p.rune;const multiplier=field=>rune?.type===field?rune.factor:1;
 s.projectiles.push({id:s.nextId++,owner:p.id,x,y,angle,distance:0,power:p.charge,...details,damage:details.damage*multiplier('damage'),range:details.range*multiplier('range'),radius:details.radius*multiplier('size')});
}
export function release(s,id){
 const p=getPlayer(s,id);if(!p)return;
 if(p.health<=0||!p.wand||p.mode==='Safe'||p.charge<=0){p.charge=0;return;}
 const type=p.wand.type;if(p.mode==='Special'&&p.mana<PLAYER_BALANCE.specialMana){p.charge=0;return;}
 if(p.mode==='Normal'){
  if(type==='fire')projectile(s,p,{kind:'fire',speed:CONFIG.projectileSpeed,radius:CONFIG.projectileRadius+CONFIG.chargedRadiusBonus*p.charge,range:scaledNormal(CONFIG.projectileRange,CONFIG.minRangeFactor,p.charge),damage:scaledNormal(CONFIG.normalDamage,CONFIG.minDamageFactor,p.charge)});
  else if(type==='ice'){
   const b=ICE_BALANCE;
   for(let i=0;i<b.pellets;i++)projectile(s,p,{kind:'icicle',angle:p.angle+b.spread*(i/(b.pellets-1)-.5),speed:b.projectileSpeed,radius:b.pelletRadius+b.chargedRadiusBonus*p.charge,range:scaledNormal(b.projectileRange,CONFIG.minRangeFactor,p.charge),damage:scaledNormal(b.pelletDamage,CONFIG.minDamageFactor,p.charge)});
  }else if(type==='air'){
   const b=AIR_BALANCE;projectile(s,p,{kind:'whirlwind',speed:b.projectileSpeed,radius:b.projectileRadius+b.chargedRadiusBonus*p.charge,range:scaledNormal(b.projectileRange,CONFIG.minRangeFactor,p.charge),damage:scaledNormal(b.normalDamage,CONFIG.minDamageFactor,p.charge),push:b.normalPush*p.charge});
  }else if(type==='earth'){
   const b=EARTH_BALANCE;projectile(s,p,{kind:'boulder',speed:b.projectileSpeed,radius:b.projectileRadius+b.chargedRadiusBonus*p.charge,range:scaledNormal(b.projectileRange,CONFIG.minRangeFactor,p.charge),damage:scaledNormal(b.normalDamage,CONFIG.minDamageFactor,p.charge),ricochets:0,hitIds:[]});
  }else if(type==='test'){
   const b=TEST_BALANCE;projectile(s,p,{kind:'spark',speed:b.projectileSpeed,radius:b.projectileRadius+b.chargedRadiusBonus*p.charge,range:scaledNormal(b.projectileRange,CONFIG.minRangeFactor,p.charge),damage:0,push:b.normalPush*p.charge});
  }else if(type==='lightning'){
   const b=LIGHTNING_BALANCE,range=scaledNormal(b.lineRange,CONFIG.minRangeFactor,p.charge)*runeFactor(p,'range');
   const wall=wallTrace(s,p.x,p.y,Math.cos(p.angle)*range,Math.sin(p.angle)*range,0);
   const visibleRange=range*(wall?.t??1);const x2=p.x+Math.cos(p.angle)*visibleRange,y2=p.y+Math.sin(p.angle)*visibleRange;
   for(const target of victims(s,p.id))if(segmentDistance(target.x,target.y,p.x,p.y,x2,y2)<=radiusOf(s,target)+b.lineRadius*p.charge*runeFactor(p,'size'))damage(s,target,scaledNormal(b.lineDamage,CONFIG.minDamageFactor,p.charge)*runeFactor(p,'damage'));
   effect(s,{kind:'lightningLine',x:p.x,y:p.y,x2,y2},b.lineDuration);
  }
 }else if(type==='lightning'){
  // A sky strike targets the reached point directly; it performs no wall trace.
  const point=lightningPoint(p),b=LIGHTNING_BALANCE;
  areaDamage(s,p,point.x,point.y,b.strikeRadius,b.strikeDamage);
  effect(s,{kind:'skyStrike',owner:p.id,...point,radius:b.strikeRadius*runeFactor(p,'size')},b.strikeDuration);
 }else if(p.charge>=1){
  if(type==='fire'){
   areaDamage(s,p,p.x,p.y,CONFIG.specialRadius,CONFIG.specialDamage);
   effect(s,{kind:'fireWave',owner:p.id,x:p.x,y:p.y,radius:CONFIG.specialRadius*runeFactor(p,'size')},CONFIG.specialDuration);
  }else if(type==='air'){
   const b=AIR_BALANCE;areaPush(s,p,p.x,p.y,b.specialRadius,b.specialPush);effect(s,{kind:'airSphere',x:p.x,y:p.y,radius:b.specialRadius*runeFactor(p,'size')},b.specialDuration);
  }else if(type==='earth'){
   if(!createEarthWall(s,p)){p.charge=0;return;}
  }else if(type==='test'){
   const b=TEST_BALANCE;effect(s,{kind:'testSphere',x:p.x,y:p.y,radius:b.specialRadius*runeFactor(p,'size')},b.specialDuration);
  }else if(type==='ice'){
   const b=ICE_BALANCE;projectile(s,p,{kind:'coldWave',speed:b.waveSpeed,range:b.waveRange,radius:b.waveRadius,depth:b.waveDepth,damage:b.waveDamage,hitIds:[]});
  }
 }else{p.charge=0;return;}
 if(p.mode==='Special')p.mana-=PLAYER_BALANCE.specialMana;s.shots++;p.charge=0;
}
function segmentDistance(x,y,ax,ay,bx,by){const dx=bx-ax,dy=by-ay;const t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-ax-t*dx,y-ay-t*dy);}
// inputs maps a player id to {x,y,held,commands}; a missing entry means an idle player.
export function step(s,inputs,dt){
 s.time+=dt;s.walls=s.walls.filter(w=>w.permanent||w.expiresAt>s.time);
 for(const p of s.players)stepPlayer(s,p,inputs[p.id]??IDLE,dt);
 tickEncounters(s,dt,{move:moveActor,damage,trace:wallTrace});
 s.projectiles=s.projectiles.filter(b=>advanceProjectile(s,b,dt));
 s.effects=s.effects.filter(e=>(e.life-=dt)>0);
}
function stepPlayer(s,p,input,dt){
 if(p.health<=0){p.charge=0;return;}p.mana=Math.min(PLAYER_BALANCE.mana,p.mana+PLAYER_BALANCE.manaRegen*dt);
 for(const command of input.commands??[])applyCommand(s,p.id,command);
 let {x=0,y=0}=input;const length=Math.hypot(x,y);
 if(length>1){x/=length;y/=length;}
 if(length>CONFIG.inputDeadzone){
  p.angle=Math.atan2(y,x);
  moveActor(s,p,x*CONFIG.speed*dt,y*CONFIG.speed*dt,CONFIG.playerRadius);
 }
 if(input.held&&p.wand&&p.mode!=='Safe'){
  const b=WANDS[p.wand.type].balance;
  p.charge=Math.min(1,p.charge+dt/(p.mode==='Special'?b.specialChargeTime:b.chargeTime));
 }
 const pedestal=s.pedestals.find(i=>Math.hypot(i.x-p.x,i.y-p.y)<=SCENE_BALANCE.pedestalRadius);
 if(pedestal&&p.activePedestal!==pedestal.id){p.wand={id:s.nextId++,type:pedestal.type};p.charge=0;}
 p.activePedestal=pedestal?.id??null;
 const portal=s.portals.find(i=>Math.hypot(i.x-p.x,i.y-p.y)<=SCENE_BALANCE.portalRadius);p.nearPortal=portal?.id??null;
 // Items are removed on pickup, so with several nearby players the first one in order takes it.
 const item=s.items.find(i=>(i.kind==='rune'?!p.rune:!p.wand)&&s.time>=i.availableAt&&Math.hypot(i.x-p.x,i.y-p.y)<=CONFIG.pickupRadius);
 if(item){if(item.kind==='rune')p.rune={id:item.id,type:item.type,factor:item.factor};else p.wand={id:item.id,type:item.type};s.items=s.items.filter(i=>i!==item);}
}

// Slab intersection against expanded rectangles provides swept wall collision.
function rectTrace(x,y,dx,dy,rect,radius){
 let entry=-Infinity,exit=Infinity,nx=0,ny=0;
 for(const [origin,delta,min,max,axis] of [[x,dx,rect.x-radius,rect.x+rect.width+radius,'x'],[y,dy,rect.y-radius,rect.y+rect.height+radius,'y']]){
  if(Math.abs(delta)<1e-10){if(origin<min||origin>max)return null;continue;}
  let near=(min-origin)/delta,far=(max-origin)/delta,sign=-1;if(near>far){[near,far]=[far,near];sign=1;}
  if(near>entry){entry=near;nx=axis==='x'?sign:0;ny=axis==='y'?sign:0;}exit=Math.min(exit,far);
  if(entry>exit)return null;
 }
 if(exit<0||entry>1)return null;
 if(entry<0)return null; // Existing overlapping geometry must allow escape.
 return {t:Math.max(0,entry),nx,ny};
}
function wallTrace(s,x,y,dx,dy,radius){
 let closest=s.map?floorTrace(s.map,x,y,dx,dy,radius):null;
 for(const wall of s.walls){const hit=rectTrace(x,y,dx,dy,wall,radius);if(hit&&(!closest||hit.t<closest.t))closest=hit;}
 return closest;
}
function moveActor(s,actor,dx,dy,radius){
 const xhit=wallTrace(s,actor.x,actor.y,dx,0,radius);
 actor.x=Math.max(radius,Math.min(world(s).width-radius,actor.x+dx*(xhit?Math.max(0,xhit.t-1e-6):1)));
 const yhit=wallTrace(s,actor.x,actor.y,0,dy,radius);
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
 let remaining=Math.min(b.speed*dt,Math.max(0,b.range-b.distance));
 // Ricochets consume the same distance budget, even across several collisions.
 while(remaining>1e-8){
  const ax=b.x,ay=b.y,dx=Math.cos(b.angle)*remaining,dy=Math.sin(b.angle)*remaining;
  let hit=wallTrace(s,ax,ay,dx,dy,b.kind==='coldWave'?b.depth:b.radius);
  const edge=boundaryTrace(s,ax,ay,dx,dy,b.radius);if(edge&&(!hit||edge.t<hit.t))hit=edge;
  const travel=remaining*(hit?.t??1);b.x+=Math.cos(b.angle)*travel;b.y+=Math.sin(b.angle)*travel;b.distance+=travel;
  const targets=(b.enemy?s.players.filter(p=>p.health>0):victims(s,b.owner)).filter(t=>{
   const reach=radiusOf(s,t);
   if(b.kind!=='coldWave')return segmentDistance(t.x,t.y,ax,ay,b.x,b.y)<=reach+b.radius;
   const tx=t.x-ax,ty=t.y-ay,forward=tx*Math.cos(b.angle)+ty*Math.sin(b.angle),side=-tx*Math.sin(b.angle)+ty*Math.cos(b.angle);
   return forward>=-b.depth-reach&&forward<=travel+b.depth+reach&&Math.abs(side)<=b.radius+reach;
  });
  if(b.kind==='coldWave'||b.kind==='boulder'){
   for(const target of targets)if(!b.hitIds.includes(hitKey(s,target))){damage(s,target,b.damage,Boolean(b.enemy));b.hitIds.push(hitKey(s,target));}
  }else if(targets.length){
   const target=targets[0];damage(s,target,b.damage,Boolean(b.enemy));
   if(b.kind==='whirlwind'){
    const center={x:target.x,y:target.y};for(const t of victims(s,b.owner))if(Math.hypot(t.x-center.x,t.y-center.y)<=b.radius+radiusOf(s,t))pushTarget(s,t,ax,ay,b.push,b.angle);
   }else if(b.push)pushTarget(s,target,ax,ay,b.push,b.angle);
   effect(s,{kind:b.kind==='icicle'?'iceImpact':b.kind==='spark'?'sparkImpact':b.kind==='whirlwind'?'airImpact':'impact',x:b.x,y:b.y,radius:(CONFIG.impactRadius+CONFIG.chargedImpactBonus)*b.power},CONFIG.impactDuration);return false;
  }
  if(hit){
   if(b.kind!=='boulder'||b.ricochets>=EARTH_BALANCE.maxRicochets)return false;
   const vx=Math.cos(b.angle),vy=Math.sin(b.angle),dot=vx*hit.nx+vy*hit.ny;b.angle=Math.atan2(vy-2*dot*hit.ny,vx-2*dot*hit.nx);
   b.x+=hit.nx*EARTH_BALANCE.collisionEpsilon;b.y+=hit.ny*EARTH_BALANCE.collisionEpsilon;b.ricochets++;remaining-=travel;
  }else remaining=0;
 }
 if(b.distance>=b.range){effect(s,{kind:b.kind==='spark'?'sparkImpact':'impact',x:b.x,y:b.y,radius:CONFIG.expiryRadius*b.power},CONFIG.expiryDuration);return false;}
 return true;
}
