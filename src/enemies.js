import {ENEMY_BALANCE,ENCOUNTER_BALANCE,ENEMY_SPAWN_BALANCE,BIOME_NEW_ENEMIES,BIOME_RARE_ENEMIES,CONFIG} from './balance.js';

export function alertEnemies(s,victim,owner){
 if(!s.enemies?.includes(victim)||!s.players.some(p=>p.id===owner&&p.health>0))return;
 for(const enemy of s.enemies)if(enemy.health>0&&(enemy===victim||Math.hypot(enemy.x-victim.x,enemy.y-victim.y)<=ENCOUNTER_BALANCE.groupAggroRadius)){
  enemy.targetId=owner;delete enemy.path;
 }
}
export function spawnEnemy(s,type,x,y,poi,progress=0){
 const b=ENEMY_BALANCE[type],party=Math.max(0,(s.map?.partySize??s.players.length)-1);
 const health=b.health*(1+party*ENCOUNTER_BALANCE.partyHealth)*(1+progress*ENCOUNTER_BALANCE.progressHealth);
 const enemy={id:s.nextId++,type,x,y,home:{x,y},poi,health,maxHealth:health,attackDamage:b.damage*(1+party*ENCOUNTER_BALANCE.partyDamage)*(1+progress*ENCOUNTER_BALANCE.progressDamage),hits:0,damage:0,cooldown:ENEMY_SPAWN_BALANCE.initialCooldown,pattern:0,angle:0,targetId:null};
 s.enemies.push(enemy);return enemy;
}
export function rollEnemy(random,location,progress,fallback){
 const pool=BIOME_NEW_ENEMIES[location];return random()<ENEMY_SPAWN_BALANCE.specialChance+progress*ENEMY_SPAWN_BALANCE.progressSpecialChance?pool[Math.floor(random()*pool.length)]:fallback;
}
export function spawnRare(s,poi,location,random){
 if(poi.type==='combat'&&!poi.boss&&poi.id!==0&&random()<ENEMY_SPAWN_BALANCE.rareChance)spawnEnemy(s,BIOME_RARE_ENEMIES[location],poi.x,poi.y,poi.id,poi.progress);
}
export function protectedDamage(s,target,amount,origin){
 const b=ENEMY_BALANCE[target.type];if(!b||amount<=0)return amount;
 if(b.behavior==='summoner'&&(target.openUntil??0)<=s.time)amount*=b.closedDamage;
 if(b.behavior==='charge'&&(target.stunUntil??0)<=s.time&&origin){const angle=Math.atan2(origin.y-target.y,origin.x-target.x);if(Math.abs(Math.atan2(Math.sin(angle-target.angle),Math.cos(angle-target.angle)))<=b.frontAngle)amount*=b.frontDamage;}
 return amount;
}
export function constrainRare(s,e){
 if(!ENEMY_BALANCE[e.type].rare)return;const poi=s.map?.pois[e.poi];if(!poi)return;
 const dx=e.x-poi.x,dy=e.y-poi.y,length=Math.hypot(dx,dy),limit=poi.radius*ENEMY_SPAWN_BALANCE.rareLeash;
 if(length>limit){e.x=poi.x+dx/length*limit;e.y=poi.y+dy/length*limit;}
}
export function tickEnemyAction(s,e,player,dt,{move,damage,trace}){
 const b=ENEMY_BALANCE[e.type];
 if(e.flight){
  const f=e.flight;f.elapsed=Math.min(f.duration,f.elapsed+dt);const t=f.elapsed/f.duration;
  const x=f.from.x+(f.to.x-f.from.x)*t,y=f.from.y+(f.to.y-f.from.y)*t;move(s,e,x-e.x,y-e.y,b.radius);e.visualLift=Math.sin(t*Math.PI)*(b.flightHeight??45);
  if(t>=1){for(const p of s.players)if(p.health>0&&Math.hypot(p.x-e.x,p.y-e.y)<=b.landingRadius+CONFIG.playerRadius)damage(s,p,e.attackDamage,true);delete e.flight;delete e.visualLift;}
  return true;
 }
 if(e.dash){
  const d=e.dash,dx=Math.cos(d.angle)*b.chargeSpeed*dt,dy=Math.sin(d.angle)*b.chargeSpeed*dt;
  const hit=trace(s,e.x,e.y,dx,dy,b.radius,true);move(s,e,dx,dy,b.radius);d.life-=dt;
  for(const p of s.players)if(p.health>0&&!d.hitIds.includes(p.id)&&Math.hypot(p.x-e.x,p.y-e.y)<=b.radius+CONFIG.playerRadius){damage(s,p,e.attackDamage,true);d.hitIds.push(p.id);}
  if(hit||d.life<=0){if(hit)e.stunUntil=s.time+b.stunDuration;delete e.dash;}return true;
 }
 if((e.stunUntil??0)>s.time||s.telegraphs.some(t=>t.owner===e.id&&['jump','charge','spore'].includes(t.action)))return true;
 if(!player||e.cooldown>0||Math.hypot(player.x-e.x,player.y-e.y)>b.range)return false;
 if(!b.behavior)return false;e.cooldown=b.cooldown;
 const warn=(action,kind,x,y,radius,extra={})=>s.telegraphs.push({id:s.nextId++,owner:e.id,action,kind,x,y,radius,angle:e.angle,delay:b.warning??ENCOUNTER_BALANCE.telegraphDelay,duration:b.warning??ENCOUNTER_BALANCE.telegraphDelay,damage:e.attackDamage,...extra});
 if(b.behavior==='jump')warn('jump','area',player.x,player.y,b.landingRadius);
 else if(b.behavior==='wizard')warn('blast','area',player.x,player.y,b.areaRadius);
 else if(b.behavior==='hook'){
  if(!trace(s,e.x,e.y,player.x-e.x,player.y-e.y,0))s.projectiles.push({id:s.nextId++,enemy:true,owner:e.id,kind:'hook',x:e.x,y:e.y,angle:e.angle,speed:b.projectileSpeed,range:b.range,radius:6,distance:0,power:1,damage:e.attackDamage,pullSpeed:b.pullSpeed,pullDuration:b.pullDuration});
 }else if(b.behavior==='spore')warn('spore','area',e.x,e.y,b.areaRadius);
 else if(b.behavior==='summoner'){
  e.openUntil=s.time+b.openDuration;
  for(let i=0;i<b.summonCount;i++){const angle=i/b.summonCount*Math.PI*2;const child=spawnEnemy(s,'mushroom',e.x+Math.cos(angle)*b.summonRadius,e.y+Math.sin(angle)*b.summonRadius,e.poi,s.map?.pois[e.poi]?.progress??0);child.targetId=player.id;child.summoner=e.id;}
 }else if(b.behavior==='charge')warn('charge','charge',e.x,e.y,b.chargeSpeed*b.chargeDuration,{width:b.chargeWidth});
 else if(b.behavior==='scribe'){
  const players=s.players.filter(p=>p.health>0);for(let i=0;i<Math.min(b.sealCount,Math.max(players.length,1)+1);i++){const p=players[i%players.length];warn('seal','seal',p.x+(i>=players.length?b.sealSpacing:0),p.y,25);}
 }
 return true;
}
export function resolveEnemyWarning(s,t,{damage}){
 const e=s.enemies.find(e=>e.id===t.owner&&e.health>0);if(!e)return;
 const b=ENEMY_BALANCE[e.type];
 if(t.action==='jump')e.flight={from:{x:e.x,y:e.y},to:{x:t.x,y:t.y},duration:b.flightDuration,elapsed:0};
 else if(t.action==='charge')e.dash={angle:t.angle,life:b.chargeDuration,hitIds:[]};
 else if(t.action==='seal')for(let i=0;i<b.sealDirections;i++)s.projectiles.push({id:s.nextId++,enemy:true,owner:e.id,kind:'arrow',x:t.x,y:t.y,angle:i/b.sealDirections*Math.PI*2,speed:b.projectileSpeed,range:b.sealRange,radius:5,distance:0,power:1,damage:t.damage});
 else {for(const p of s.players)if(p.health>0&&Math.hypot(p.x-t.x,p.y-t.y)<=t.radius+CONFIG.playerRadius)damage(s,p,t.damage,true);s.effects.push({...t,kind:'dangerImpact',life:.4,duration:.4});if(t.action==='spore')e.health=0;}
}
