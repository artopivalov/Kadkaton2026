import {CONFIG,ICE_BALANCE,LIGHTNING_BALANCE,AIR_BALANCE,EARTH_BALANCE,TEST_BALANCE,SCENE_BALANCE} from './balance.js';
import {WANDS,scaledNormal,lightningPoint} from './wands.js';
export {CONFIG} from './balance.js';
export function createState(profile){return {
 time:0,nextId:100,scene:{id:'base',title:'Game',description:''},
 player:{id:1,x:600,y:450,angle:-Math.PI/2,name:profile.name,color:profile.color,wand:{id:2,type:'test'},mode:'Safe',charge:0},
 items:[],pedestals:[],portals:[],walls:[],activePedestal:null,nearPortal:null,
 projectiles:[],effects:[],targets:[],shots:0
};}
export function setMode(s,mode){if(!['Safe','Normal','Special'].includes(mode))return;s.player.mode=mode;s.player.charge=0;}
export function dropWand(s){
 const p=s.player;if(!p.wand)return false;
 s.items.push({...p.wand,x:Math.max(CONFIG.playerRadius,Math.min(CONFIG.worldWidth-CONFIG.playerRadius,p.x+Math.cos(p.angle)*CONFIG.dropDistance)),y:Math.max(CONFIG.playerRadius,Math.min(CONFIG.worldHeight-CONFIG.playerRadius,p.y+Math.sin(p.angle)*CONFIG.dropDistance)),availableAt:s.time+CONFIG.pickupDelay});
 p.wand=null;p.charge=0;return true;
}
function effect(s,details,duration){s.effects.push({...details,life:duration,duration});}
function damage(target,amount){target.hits++;target.damage+=amount;}
function areaDamage(s,x,y,radius,amount){
 // Self-damage and friendly fire are unresolved; this lobby affects dummies only.
 for(const target of s.targets)if(Math.hypot(target.x-x,target.y-y)<=radius+CONFIG.targetRadius)damage(target,amount);
}
function pushTarget(s,target,x,y,distance){
 let dx=target.x-x,dy=target.y-y;let length=Math.hypot(dx,dy);
 if(length<.001){dx=Math.cos(s.player.angle);dy=Math.sin(s.player.angle);length=1;}
 moveActor(s,target,dx/length*distance,dy/length*distance,CONFIG.targetRadius);
}
function areaPush(s,x,y,radius,distance){for(const target of s.targets)if(Math.hypot(target.x-x,target.y-y)<=radius+CONFIG.targetRadius)pushTarget(s,target,x,y,distance);}
function createEarthWall(s){
 const p=s.player,b=EARTH_BALANCE,horizontal=Math.abs(Math.cos(p.angle))<Math.abs(Math.sin(p.angle));
 const width=horizontal?b.wallLength:b.wallThickness,height=horizontal?b.wallThickness:b.wallLength;
 const x=Math.max(0,Math.min(CONFIG.worldWidth-width,p.x+Math.cos(p.angle)*b.wallDistance-width/2));
 const y=Math.max(0,Math.min(CONFIG.worldHeight-height,p.y+Math.sin(p.angle)*b.wallDistance-height/2));
 // Do not create solid geometry overlapping an actor or an existing wall.
 if([p,...s.targets].some(a=>a.x+CONFIG.playerRadius>x&&a.x-CONFIG.playerRadius<x+width&&a.y+CONFIG.playerRadius>y&&a.y-CONFIG.playerRadius<y+height))return false;
 if(s.walls.some(w=>x<w.x+w.width&&x+width>w.x&&y<w.y+w.height&&y+height>w.y))return false;
 s.walls.push({id:s.nextId++,x,y,width,height,expiresAt:s.time+b.wallDuration,owner:p.id});return true;
}
function projectile(s,details){
 const p=s.player,angle=details.angle??p.angle,radius=details.kind==='coldWave'?details.depth:details.radius;
 const dx=Math.cos(angle)*CONFIG.projectileOffset,dy=Math.sin(angle)*CONFIG.projectileOffset;
 const hit=wallTrace(s,p.x,p.y,dx,dy,radius),offset=hit?Math.max(0,hit.t-1e-5):1;
 const x=Math.max(radius,Math.min(CONFIG.worldWidth-radius,p.x+dx*offset));
 const y=Math.max(radius,Math.min(CONFIG.worldHeight-radius,p.y+dy*offset));
 s.projectiles.push({id:s.nextId++,owner:p.id,x,y,angle,distance:0,power:p.charge,...details});
}
export function release(s){
 const p=s.player;
 if(!p.wand||p.mode==='Safe'||p.charge<=0){p.charge=0;return;}
 const type=p.wand.type;
 if(p.mode==='Normal'){
  if(type==='fire')projectile(s,{kind:'fire',speed:CONFIG.projectileSpeed,radius:CONFIG.projectileRadius+CONFIG.chargedRadiusBonus*p.charge,range:scaledNormal(CONFIG.projectileRange,CONFIG.minRangeFactor,p.charge),damage:scaledNormal(CONFIG.normalDamage,CONFIG.minDamageFactor,p.charge)});
  else if(type==='ice'){
   const b=ICE_BALANCE;
   for(let i=0;i<b.pellets;i++)projectile(s,{kind:'icicle',angle:p.angle+b.spread*(i/(b.pellets-1)-.5),speed:b.projectileSpeed,radius:b.pelletRadius+b.chargedRadiusBonus*p.charge,range:scaledNormal(b.projectileRange,CONFIG.minRangeFactor,p.charge),damage:scaledNormal(b.pelletDamage,CONFIG.minDamageFactor,p.charge)});
  }else if(type==='air'){
   const b=AIR_BALANCE;projectile(s,{kind:'whirlwind',speed:b.projectileSpeed,radius:b.projectileRadius+b.chargedRadiusBonus*p.charge,range:scaledNormal(b.projectileRange,CONFIG.minRangeFactor,p.charge),damage:scaledNormal(b.normalDamage,CONFIG.minDamageFactor,p.charge),push:b.normalPush*p.charge});
  }else if(type==='earth'){
   const b=EARTH_BALANCE;projectile(s,{kind:'boulder',speed:b.projectileSpeed,radius:b.projectileRadius+b.chargedRadiusBonus*p.charge,range:scaledNormal(b.projectileRange,CONFIG.minRangeFactor,p.charge),damage:scaledNormal(b.normalDamage,CONFIG.minDamageFactor,p.charge),ricochets:0,hitIds:[]});
  }else if(type==='test'){
   const b=TEST_BALANCE;projectile(s,{kind:'spark',speed:b.projectileSpeed,radius:b.projectileRadius+b.chargedRadiusBonus*p.charge,range:scaledNormal(b.projectileRange,CONFIG.minRangeFactor,p.charge),damage:0,push:b.normalPush*p.charge});
  }else if(type==='lightning'){
   const b=LIGHTNING_BALANCE,range=scaledNormal(b.lineRange,CONFIG.minRangeFactor,p.charge);
   const wall=wallTrace(s,p.x,p.y,Math.cos(p.angle)*range,Math.sin(p.angle)*range,0);
   const visibleRange=range*(wall?.t??1);const x2=p.x+Math.cos(p.angle)*visibleRange,y2=p.y+Math.sin(p.angle)*visibleRange;
   for(const target of s.targets)if(segmentDistance(target.x,target.y,p.x,p.y,x2,y2)<=CONFIG.targetRadius+b.lineRadius*p.charge)damage(target,scaledNormal(b.lineDamage,CONFIG.minDamageFactor,p.charge));
   effect(s,{kind:'lightningLine',x:p.x,y:p.y,x2,y2},b.lineDuration);
  }
 }else if(type==='lightning'){
  // A sky strike targets the reached point directly; it performs no wall trace.
  const point=lightningPoint(p),b=LIGHTNING_BALANCE;
  areaDamage(s,point.x,point.y,b.strikeRadius,b.strikeDamage);
  effect(s,{kind:'skyStrike',owner:p.id,...point,radius:b.strikeRadius},b.strikeDuration);
 }else if(p.charge>=1){
  if(type==='fire'){
   areaDamage(s,p.x,p.y,CONFIG.specialRadius,CONFIG.specialDamage);
   effect(s,{kind:'fireWave',owner:p.id,x:p.x,y:p.y,radius:CONFIG.specialRadius},CONFIG.specialDuration);
  }else if(type==='air'){
   const b=AIR_BALANCE;areaPush(s,p.x,p.y,b.specialRadius,b.specialPush);effect(s,{kind:'airSphere',x:p.x,y:p.y,radius:b.specialRadius},b.specialDuration);
  }else if(type==='earth'){
   if(!createEarthWall(s)){p.charge=0;return;}
  }else if(type==='test'){
   const b=TEST_BALANCE;effect(s,{kind:'testSphere',x:p.x,y:p.y,radius:b.specialRadius},b.specialDuration);
  }else if(type==='ice'){
   const b=ICE_BALANCE;projectile(s,{kind:'coldWave',speed:b.waveSpeed,range:b.waveRange,radius:b.waveRadius,depth:b.waveDepth,damage:b.waveDamage,hitIds:[]});
  }
 }else{p.charge=0;return;}
 s.shots++;p.charge=0;
}
function segmentDistance(x,y,ax,ay,bx,by){const dx=bx-ax,dy=by-ay;const t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-ax-t*dx,y-ay-t*dy);}
export function step(s,input,dt){
 s.time+=dt;s.walls=s.walls.filter(w=>w.permanent||w.expiresAt>s.time);const p=s.player;let {x,y}=input;const length=Math.hypot(x,y);
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
 if(pedestal&&s.activePedestal!==pedestal.id){p.wand={id:s.nextId++,type:pedestal.type};p.charge=0;}
 s.activePedestal=pedestal?.id??null;
 const portal=s.portals.find(i=>Math.hypot(i.x-p.x,i.y-p.y)<=SCENE_BALANCE.portalRadius);s.nearPortal=portal?.id??null;
 const item=s.items.find(i=>s.time>=i.availableAt&&Math.hypot(i.x-p.x,i.y-p.y)<=CONFIG.pickupRadius);
 if(!p.wand&&item){p.wand={id:item.id,type:item.type};s.items=s.items.filter(i=>i!==item);}
 s.projectiles=s.projectiles.filter(b=>advanceProjectile(s,b,dt));
 s.effects=s.effects.filter(e=>(e.life-=dt)>0);
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
 let closest=null;
 for(const wall of s.walls){const hit=rectTrace(x,y,dx,dy,wall,radius);if(hit&&(!closest||hit.t<closest.t))closest=hit;}
 return closest;
}
function moveActor(s,actor,dx,dy,radius){
 const xhit=wallTrace(s,actor.x,actor.y,dx,0,radius);
 actor.x=Math.max(radius,Math.min(CONFIG.worldWidth-radius,actor.x+dx*(xhit?Math.max(0,xhit.t-1e-6):1)));
 const yhit=wallTrace(s,actor.x,actor.y,0,dy,radius);
 actor.y=Math.max(radius,Math.min(CONFIG.worldHeight-radius,actor.y+dy*(yhit?Math.max(0,yhit.t-1e-6):1)));
}
function boundaryTrace(x,y,dx,dy,radius){
 let hit=null;
 for(const [origin,delta,min,max,axis] of [[x,dx,radius,CONFIG.worldWidth-radius,'x'],[y,dy,radius,CONFIG.worldHeight-radius,'y']]){
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
  const edge=boundaryTrace(ax,ay,dx,dy,b.radius);if(edge&&(!hit||edge.t<hit.t))hit=edge;
  const travel=remaining*(hit?.t??1);b.x+=Math.cos(b.angle)*travel;b.y+=Math.sin(b.angle)*travel;b.distance+=travel;
  const targets=s.targets.filter(t=>{
   if(b.kind!=='coldWave')return segmentDistance(t.x,t.y,ax,ay,b.x,b.y)<=CONFIG.targetRadius+b.radius;
   const tx=t.x-ax,ty=t.y-ay,forward=tx*Math.cos(b.angle)+ty*Math.sin(b.angle),side=-tx*Math.sin(b.angle)+ty*Math.cos(b.angle);
   return forward>=-b.depth-CONFIG.targetRadius&&forward<=travel+b.depth+CONFIG.targetRadius&&Math.abs(side)<=b.radius+CONFIG.targetRadius;
  });
  if(b.kind==='coldWave'||b.kind==='boulder'){
   for(const target of targets)if(!b.hitIds.includes(target.id)){damage(target,b.damage);b.hitIds.push(target.id);}
  }else if(targets.length){
   const target=targets[0];damage(target,b.damage);
   if(b.kind==='whirlwind'){
    const center={x:target.x,y:target.y};for(const t of s.targets)if(Math.hypot(t.x-center.x,t.y-center.y)<=b.radius+CONFIG.targetRadius)pushTarget(s,t,ax,ay,b.push);
   }else if(b.push)pushTarget(s,target,ax,ay,b.push);
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
