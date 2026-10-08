import {spawnEnemy,rollEnemy,spawnRare,tickEnemyAction,resolveEnemyWarning,constrainRare} from './enemies.js';
import {createWand,combatWands,rollRarity,rollWand} from './items.js';
import {generateLocation,routeTo} from './generator.js';
import {LOCATION_BALANCE,ENEMY_BALANCE,ENCOUNTER_BALANCE,PLAYER_BALANCE,ENEMY_SPAWN_BALANCE} from './balance.js';
import {createRandom} from './rng.js';
export function enterLocation(s,location,seed=s.seed+1,{viewer=false}={}){
 const map=generateLocation(location,seed,Math.max(1,s.players.length));s.seed=seed>>>0;s.rngState=s.seed;s.map=map;s.world=map.world;s.spawn=map.spawn;
 s.scene={id:location,title:`${LOCATION_BALANCE[location].name}${viewer?' · Generation viewer':''}`,description:viewer?'Free camera · choose a seed and regenerate':'Clear arenas, solve plates in order, and open shared chests.',viewer};
 s.walls=[];s.targets=[];s.pedestals=[];s.portals=[];s.items=[];s.effects=[];s.projectiles=[];s.enemies=[];s.telegraphs=[];s.completed=false;
 for(const [i,p] of s.players.entries()){p.x=map.spawn.x+[0,1,-1][i%3]*45;p.y=map.spawn.y+Math.floor(i/3)*40;p.health=PLAYER_BALANCE.health;p.mana=PLAYER_BALANCE.mana;p.charge=0;p.nearPortal=null;p.activePedestal=null;p.activeRuneStation=null;p.wand={id:s.nextId++,...rollWand(createRandom(seed+i+77),rollRarity(createRandom(seed+i+99),location,0))};}
 const random=createRandom(seed^0xabc123),config=LOCATION_BALANCE[location];
 const spawn=(type,x,y,poi,progress)=>spawnEnemy(s,type,x,y,poi,progress);
 for(const poi of map.pois){
  if(poi.type==='combat'){const count=ENCOUNTER_BALANCE.combatBase+Math.floor(poi.progress*ENEMY_SPAWN_BALANCE.combatProgress);for(let i=0;i<count;i++){const a=random()*Math.PI*2,r=ENEMY_SPAWN_BALANCE.spawnMinRadius+random()*ENEMY_SPAWN_BALANCE.spawnRadiusSpan;spawn(rollEnemy(random,location,poi.progress,i%3===2?config.ranged:config.melee),poi.x+Math.cos(a)*r,poi.y+Math.sin(a)*r,poi.id,poi.progress);}}
  spawnRare(s,poi,location,random);
  if(poi.boss)spawn(config.boss,poi.x,poi.y,poi.id,1);
 }
 for(const corridor of map.corridors){const point=corridor.points[1],progress=map.pois[corridor.to].progress;for(let i=0;i<ENCOUNTER_BALANCE.corridorBase+Math.floor(progress*2);i++)spawn(rollEnemy(random,location,progress,i%2?config.ranged:config.melee),point.x+(i-1)*ENEMY_SPAWN_BALANCE.corridorSpacing,point.y,null,progress);}
 // First combat wand is reachable with the harmless lobby wand, before any fight is required.
 s.items.push({id:s.nextId++,...createWand('fire','Common',random),x:map.spawn.x,y:map.spawn.y-45,availableAt:s.time});
 return s;
}
export function tickEncounters(s,dt,{move,damage,trace}){
 if((!s.map&&s.scene.id!=='debug')||s.scene.viewer)return;
 const living=s.players.filter(p=>p.health>0),b=ENCOUNTER_BALANCE;
 for(const enemy of s.enemies){
  if(enemy.health<=0)continue;constrainRare(s,enemy);const def=ENEMY_BALANCE[enemy.type];enemy.cooldown-=dt;
  const locked=living.find(p=>p.id===enemy.targetId);if(!locked&&enemy.targetId!==null){enemy.targetId=null;delete enemy.path;}
  const player=locked??living.reduce((best,p)=>!best||Math.hypot(p.x-enemy.x,p.y-enemy.y)<Math.hypot(best.x-enemy.x,best.y-enemy.y)?p:best,null);if(!player)continue;
  const dx=player.x-enemy.x,dy=player.y-enemy.y,distance=Math.hypot(dx,dy);if(!locked&&distance>b.activationDistance)continue;
  if(!enemy.dash&&!enemy.flight)enemy.angle=Math.atan2(dy,dx);
  if(tickEnemyAction(s,enemy,player,dt,{move,damage,trace})){constrainRare(s,enemy);continue;}
  if(distance>def.range*b.standoffFactor){let waypoint=player;if(s.map&&trace(s,enemy.x,enemy.y,dx,dy,def.radius,true)){if(!enemy.path||!enemy.pathTarget||Math.hypot(player.x-enemy.pathTarget.x,player.y-enemy.pathTarget.y)>b.pathRefreshDistance){enemy.path=routeTo(s.map,enemy,player);enemy.pathTarget={x:player.x,y:player.y};}while(enemy.path.length>1&&Math.hypot(enemy.path[0].x-enemy.x,enemy.path[0].y-enemy.y)<b.waypointRadius)enemy.path.shift();waypoint=enemy.path[0];}else delete enemy.path;const mx=waypoint.x-enemy.x,my=waypoint.y-enemy.y,length=Math.hypot(mx,my)||1;move(s,enemy,mx/length*def.speed*dt,my/length*def.speed*dt,def.radius);}
  constrainRare(s,enemy);
  if(enemy.cooldown>0||distance>def.range)continue;enemy.cooldown=def.cooldown;
  if(def.boss){const pattern=enemy.pattern++%3;s.telegraphs.push({id:s.nextId++,owner:enemy.id,kind:['ring','cone','area'][pattern],x:pattern===2?player.x:enemy.x,y:pattern===2?player.y:enemy.y,angle:enemy.angle,radius:pattern===2?b.areaRadius:b.bulletRange,delay:b.telegraphDelay,damage:enemy.attackDamage});}
  else if(def.projectileSpeed){if(!trace(s,enemy.x,enemy.y,dx,dy,0))s.projectiles.push({id:s.nextId++,enemy:true,owner:enemy.id,kind:'arrow',x:enemy.x,y:enemy.y,angle:enemy.angle,speed:def.projectileSpeed,range:def.range+150,radius:5,distance:0,power:1,damage:enemy.attackDamage});}
  else if(distance<=def.range)damage(s,player,enemy.attackDamage,true);
 }
 s.enemies=s.enemies.filter(e=>e.health>0);
 s.telegraphs=s.telegraphs.filter(t=>{
  if(!s.enemies.some(e=>e.id===t.owner&&e.health>0))return false;t.delay-=dt;if(t.delay>0)return true;
  if(t.action){resolveEnemyWarning(s,t,{damage});return false;}
  if(t.kind==='area'){for(const p of living)if(Math.hypot(p.x-t.x,p.y-t.y)<=t.radius+20)damage(s,p,t.damage,true);s.effects.push({...t,kind:'dangerImpact',life:.4,duration:.4});}
  else {const count=t.kind==='ring'?b.bulletCount:b.coneCount;for(let i=0;i<count;i++){const angle=t.kind==='ring'?i/count*Math.PI*2:t.angle-b.coneAngle/2+i/(count-1)*b.coneAngle;s.projectiles.push({id:s.nextId++,enemy:true,owner:t.owner,kind:'arrow',x:t.x,y:t.y,angle,speed:b.bulletSpeed,range:t.radius,radius:7,distance:0,power:1,damage:t.damage});}}
  return false;
 });
 if(!s.map)return;
 for(const poi of s.map.pois){
  if(!poi.completed){
   if(poi.type==='combat')poi.completed=!s.enemies.some(e=>e.poi===poi.id);
   else {const next=poi.plates.find(p=>!p.active);if(next&&living.some(p=>Math.hypot(p.x-next.x,p.y-next.y)<b.puzzlePlateRadius))next.active=true;poi.completed=poi.plates.every(p=>p.active)&&!s.enemies.some(e=>e.poi===poi.id);}
  }
  if(poi.completed&&!poi.opened&&living.some(p=>Math.hypot(p.x-poi.x,p.y-(poi.y-75))<b.chestRadius)){
   poi.opened=true;poi.loot.forEach((item,i)=>s.items.push({...item,id:s.nextId++,x:poi.x+(i?45:-45),y:poi.y-75,availableAt:s.time}));
  }
 }
 if(!s.enemies.some(e=>e.poi===s.map.bossPoi)){s.completed=true;if(!s.portals.length)s.portals.push({id:s.nextId++,x:s.map.pois[s.map.bossPoi].x,y:s.map.pois[s.map.bossPoi].y-120,label:'Return to lobby',location:'lobby',available:true});}
}
