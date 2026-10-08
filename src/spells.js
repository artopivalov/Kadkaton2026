import {COMBAT_BALANCE,CONFIG} from './balance.js';
import {spellBalance,scaledNormal} from './wands.js';

const extendedTypes=new Set(['blood','storm','void','mirror','orbit','comet','prism']);
export function castExtended(s,p,ctx){
 if(!extendedTypes.has(p.wand.type))return null;
 const b=spellBalance(p),profile=ctx.profile(p),normal=p.mode==='Normal';
 const power=value=>scaledNormal(value,CONFIG.minDamageFactor,p.charge),range=scaledNormal(b.projectileRange,CONFIG.minRangeFactor,p.charge);
 const point=distance=>({x:p.x+Math.cos(p.angle)*distance,y:p.y+Math.sin(p.angle)*distance});
 const field=(kind,distance,radius,duration,extra)=>ctx.effect(s,{...profile,kind,...point(distance),radius,...extra},duration);
 if(!normal&&p.charge<1)return false;
 if(p.wand.type==='blood'){
  if(!normal&&p.health<=Math.max(b.minHealth,b.healthCost))return false;
  if(normal)ctx.projectile(s,p,{kind:'bloodBolt',speed:b.projectileSpeed,range,radius:b.projectileRadius+b.chargedRadiusBonus*p.charge,damage:power(b.normalDamage),bloodHeal:b.healFactor});
  else {p.health-=b.healthCost;for(let i=0;i<b.needles;i++)ctx.projectile(s,p,{kind:'bloodNeedle',angle:p.angle+b.spread*(i/(b.needles-1)-.5),speed:b.projectileSpeed,range:b.projectileRange,radius:b.projectileRadius,damage:b.specialDamage});}
 }else if(p.wand.type==='storm'){
  if(normal){
   const first=ctx.victims(s,p.id).filter(t=>ctx.segmentDistance(t.x,t.y,p.x,p.y,...Object.values(point(range)))<=ctx.radiusOf(s,t)+b.projectileRadius).sort((a,c)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(c.x-p.x,c.y-p.y))[0];
   if(first&&!ctx.trace(s,p.x,p.y,first.x-p.x,first.y-p.y,0)){
    let from={x:p.x,y:p.y},target=first;const visited=new Set();
    for(let i=0;target&&i<b.chainCount;i++){
     visited.add(target);ctx.hit(s,target,power(b.normalDamage)*b.chainFalloff**i,profile,from);ctx.effect(s,{kind:'stormLine',x:from.x,y:from.y,x2:target.x,y2:target.y},COMBAT_BALANCE.rayDuration);
     from={x:target.x,y:target.y};target=[...s.targets,...(s.enemies??[])].filter(t=>(t.health??1)>0&&!visited.has(t)&&Math.hypot(t.x-from.x,t.y-from.y)<=b.chainRange).sort((a,c)=>Math.hypot(a.x-from.x,a.y-from.y)-Math.hypot(c.x-from.x,c.y-from.y))[0];
    }
   }
  }else field('stormCloud',b.cloudDistance,b.cloudRadius,b.cloudDuration,{damage:b.cloudDamage,tick:0,tickInterval:b.tickInterval});
 }else if(p.wand.type==='void'){
  if(normal)ctx.projectile(s,p,{kind:'voidOrb',speed:b.projectileSpeed,range,radius:b.projectileRadius+b.chargedRadiusBonus*p.charge,damage:power(b.normalDamage),hitIds:[],pierceCount:b.pierceCount});
  else field('voidRift',b.riftDistance,b.riftRadius,b.riftDuration,{damage:b.riftDamage,pullSpeed:b.pullSpeed,warning:true});
 }else if(p.wand.type==='mirror'){
  if(normal)ctx.projectile(s,p,{kind:'mirrorShard',speed:b.projectileSpeed,range,radius:b.projectileRadius+b.chargedRadiusBonus*p.charge,damage:power(b.normalDamage)});
  else field('mirror',b.mirrorDistance,b.mirrorLength/2,b.mirrorDuration,{angle:p.angle,reflections:b.reflections});
 }else if(p.wand.type==='orbit'){
  if(normal){const satellites=s.effects.filter(e=>e.kind==='satellite'&&e.owner===p.id);if(satellites.length>=b.maxSatellites)return false;ctx.effect(s,{...profile,kind:'satellite',x:p.x,y:p.y,radius:b.projectileRadius,orbitRadius:b.orbitRadius,angle:p.angle+satellites.length*Math.PI*2/b.maxSatellites,angularSpeed:b.orbitSpeed,damage:power(b.normalDamage),contactInterval:b.contactInterval,contacts:{}},b.orbitDuration);}
  else {const satellites=s.effects.filter(e=>e.kind==='satellite'&&e.owner===p.id);if(!satellites.length)return false;for(const [i,e] of satellites.entries())ctx.projectile(s,p,{kind:'orbitBolt',angle:p.angle+b.launchSpread*(satellites.length===1?0:i/(satellites.length-1)-.5),speed:b.projectileSpeed,range:b.projectileRange,radius:e.radius,damage:e.damage,healing:e.healing,push:e.push});s.effects=s.effects.filter(e=>!satellites.includes(e));}
 }else if(p.wand.type==='comet'){
  if(normal)ctx.projectile(s,p,{kind:'comet',speed:b.projectileSpeed,range,radius:b.projectileRadius+b.chargedRadiusBonus*p.charge,damage:power(b.normalDamage),initialDamage:power(b.normalDamage),acceleration:b.acceleration,distanceDamage:b.distanceDamage});
  else field('meteorWarning',b.meteorDistance,b.meteorRadius,b.meteorDelay,{damage:b.meteorDamage,debrisCount:b.debrisCount,debrisDamage:b.debrisDamage,debrisSpeed:b.projectileSpeed*2,debrisRange:b.projectileRange/2,debrisRadius:b.projectileRadius});
 }else if(p.wand.type==='prism'){
  if(normal)ctx.ray(s,p,p.angle,range,b.projectileRadius, power(b.normalDamage),profile,'prismRay');
  else field('prism',b.prismDistance,b.prismRadius,b.prismDuration,{angle:p.angle,shots:b.prismShots,spread:b.prismSpread,sideDamage:b.sideDamage});
 }
 return true;
}

export function tickExtended(s,dt,ctx){
 for(const e of [...s.effects]){
  if(e.life<=0)continue;
  if(e.kind==='satellite'){
   const owner=s.players.find(p=>p.id===e.owner&&p.health>0);if(!owner){e.life=0;continue;}
   e.angle+=e.angularSpeed*dt;e.x=owner.x+Math.cos(e.angle)*e.orbitRadius;e.y=owner.y+Math.sin(e.angle)*e.orbitRadius;
   for(const t of ctx.victims(s,e.owner)){const key=ctx.hitKey(s,t);if(Math.hypot(t.x-e.x,t.y-e.y)<=e.radius+ctx.radiusOf(s,t)&&(e.contacts[key]??0)<=s.time){ctx.hit(s,t,e.damage,e,e);e.contacts[key]=s.time+e.contactInterval;}}
  }else if(e.kind==='stormCloud'){
   e.tick-=Math.min(dt,e.life);while(e.tick<=0){for(const t of (e.healing?ctx.victims(s,e.owner):[...s.targets,...(s.enemies??[])]).filter(t=>(t.health??1)>0&&Math.hypot(t.x-e.x,t.y-e.y)<=e.radius+ctx.radiusOf(s,t))){ctx.hit(s,t,e.damage,e,e);ctx.effect(s,{kind:'stormLine',x:e.x,y:e.y-50,x2:t.x,y2:t.y},COMBAT_BALANCE.rayDuration);}e.tick+=e.tickInterval;}
  }else if(e.kind==='voidRift'){
   for(const t of (e.healing?ctx.victims(s,e.owner):[...s.targets,...(s.enemies??[])]).filter(t=>(t.health??1)>0&&Math.hypot(t.x-e.x,t.y-e.y)<=e.radius+ctx.radiusOf(s,t)))ctx.pull(s,t,e.x,e.y,e.pullSpeed*Math.min(dt,e.life));
   if(e.life<=dt){for(const t of ctx.victims(s,e.owner))if(Math.hypot(t.x-e.x,t.y-e.y)<=e.radius+ctx.radiusOf(s,t))ctx.hit(s,t,e.damage,e,e);ctx.effect(s,{kind:'voidImpact',x:e.x,y:e.y,radius:e.radius},CONFIG.impactDuration);e.life=0;}
  }else if(e.kind==='meteorWarning'&&e.life<=dt){
   for(const t of ctx.victims(s,e.owner))if(Math.hypot(t.x-e.x,t.y-e.y)<=e.radius+ctx.radiusOf(s,t))ctx.hit(s,t,e.damage,e,e);
   for(let i=0;i<e.debrisCount;i++)s.projectiles.push({...e,id:s.nextId++,kind:'meteorDebris',angle:i/e.debrisCount*Math.PI*2,speed:e.debrisSpeed,range:e.debrisRange,radius:e.debrisRadius,distance:0,power:1,damage:e.debrisDamage});
   ctx.effect(s,{kind:'cometImpact',x:e.x,y:e.y,radius:e.radius},CONFIG.impactDuration);e.life=0;
  }
 }
}
export function interceptProjectile(s,b,ax,ay,ctx){
 if(b.kind==='mirrorShard')for(const bullet of s.activeProjectiles??[])if(bullet.enemy&&!bullet.dead&&ctx.segmentDistance(bullet.x,bullet.y,ax,ay,b.x,b.y)<=b.radius+bullet.radius)bullet.dead=true;
 if(!b.enemy)return;
 for(const mirror of s.effects.filter(e=>e.kind==='mirror'&&e.life>0&&e.reflections>0)){
  const dx=b.x-ax,dy=b.y-ay,normal={x:Math.cos(mirror.angle),y:Math.sin(mirror.angle)},denominator=dx*normal.x+dy*normal.y;if(Math.abs(denominator)<1e-8)continue;
  const t=((mirror.x-ax)*normal.x+(mirror.y-ay)*normal.y)/denominator;if(t<0||t>1)continue;
  const x=ax+dx*t,y=ay+dy*t,side=-(x-mirror.x)*normal.y+(y-mirror.y)*normal.x;if(Math.abs(side)>mirror.radius+b.radius)continue;
  const vx=Math.cos(b.angle),vy=Math.sin(b.angle),dot=vx*normal.x+vy*normal.y;b.angle=Math.atan2(vy-2*dot*normal.y,vx-2*dot*normal.x);b.x=x+Math.cos(b.angle)*(b.radius+1);b.y=y+Math.sin(b.angle)*(b.radius+1);b.enemy=false;b.owner=mirror.owner;b.healing=mirror.healing;b.push=mirror.push;b.distance=0;mirror.reflections--;if(!mirror.reflections)mirror.life=0;return true;
 }
}
export function splitCastThroughPrism(s,p,ctx){
 if(p.mode!=='Normal'||p.wand.type==='orbit')return false;
 const b=spellBalance(p),range=scaledNormal(b.projectileRange??b.lineRange,CONFIG.minRangeFactor,p.charge),x2=p.x+Math.cos(p.angle)*range,y2=p.y+Math.sin(p.angle)*range;
 const prism=s.effects.filter(e=>e.kind==='prism'&&e.owner===p.id&&e.life>0&&e.shots>0&&ctx.segmentDistance(e.x,e.y,p.x,p.y,x2,y2)<=e.radius&&((e.x-p.x)*Math.cos(p.angle)+(e.y-p.y)*Math.sin(p.angle))>0).sort((a,c)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(c.x-p.x,c.y-p.y))[0];
 if(!prism||ctx.trace(s,p.x,p.y,prism.x-p.x,prism.y-p.y,0))return false;
 const origin={...p,x:prism.x,y:prism.y};for(const side of [-1,0,1])ctx.ray(s,origin,p.angle+side*prism.spread,range,b.projectileRadius??b.lineRadius??8,scaledNormal(b.normalDamage??b.lineDamage??b.pelletDamage??0,CONFIG.minDamageFactor,p.charge)*(side===0?1:prism.sideDamage),ctx.profile(p),'prismRay');
 prism.shots--;if(!prism.shots)prism.life=0;return true;
}
