import {BATTLE_ROYALE_BALANCE as B,PLAYER_BALANCE} from './balance.js';
import {rollWand,createRune} from './items.js';
import {nextRandom} from './rng.js';

export function clearBattleRoyale(s){
 delete s.battleRoyale;
 s.players=s.players.filter(p=>!p.bot);
 for(const p of s.players){delete p.maxHealth;delete p.cameraAngle;delete p.rootUntil;delete p.hooked;p.charge=0;}
}
export function enterBattleRoyale(s){
 clearBattleRoyale(s);delete s.map;delete s.runeStation;
 const humans=s.players.length,solo=humans===1;
 if(solo)for(let i=0;i<B.soloBots;i++)s.players.push({...s.players[0],id:s.nextPlayerId++,name:`Training bot ${i+1}`,color:['#c58a45','#aa85bf'][i],bot:true});
 const size=(B.radius+B.lavaMargin)*2,c=size/2;
 s.world={width:size,height:size};s.spawn={x:c,y:c};
 s.scene={id:'battleRoyale',title:'Battle Royale',description:'Push rivals into lava. Last survivor wins.'};
 for(const key of ['walls','targets','pedestals','portals','items','effects','hitFeedback','projectiles','enemies','telegraphs'])s[key]=[];
 s.completed=false;s.battleRoyale={x:c,y:c,radius:B.radius,startedAt:s.time,solo,humanId:s.players[0]?.id,participants:s.players.map(p=>p.id),result:null};
 const random=()=>nextRandom(s),n=s.players.length;
 for(const [i,p] of s.players.entries()){
  const a=Math.PI/2+i*Math.PI*2/n;
  Object.assign(p,{x:c+Math.cos(a)*B.radius*B.spawnRadius,y:c+Math.sin(a)*B.radius*B.spawnRadius,angle:a+Math.PI,cameraAngle:-Math.PI/2-(a+Math.PI),maxHealth:PLAYER_BALANCE.health*B.healthMultiplier,health:PLAYER_BALANCE.health*B.healthMultiplier,mana:PLAYER_BALANCE.mana,mode:'Normal',charge:0,nearPortal:null,activePedestal:null,activeRuneStation:null,hits:0,damage:0,wand:{id:s.nextId++,...rollWand(random,'Legendary')},rune:{id:s.nextId++,...createRune(random,'Legendary')}});
 }
 for(const [ring,r] of B.coverRings.entries())for(let i=0;i<n*B.coversPerSector;i++){
  const a=Math.PI/2+i*Math.PI*2/(n*B.coversPerSector)+(ring===0?Math.PI/(n*B.coversPerSector):0);
  const length=Math.min(B.coverLength,2*B.radius*r*Math.sin(Math.PI/(n*B.coversPerSector))*.65);
  s.walls.push({id:s.nextId++,x:c+Math.cos(a)*B.radius*r-length/2,y:c+Math.sin(a)*B.radius*r-B.coverThickness/2,width:length,height:B.coverThickness,angle:a+Math.PI/2,permanent:true,kind:'arenaCover'});
 }
 return s;
}
export function safeRadius(s,time=s.time){const b=s.battleRoyale;return b?b.radius*Math.max(0,1-(time-b.startedAt)/B.fillSeconds):null;}
export function tickBattleRoyale(s,dt){
 const b=s.battleRoyale;if(!b||b.result)return;
 for(const p of s.players){
  if(p.health<=0)continue;
  const distance=Math.hypot(p.x-b.x,p.y-b.y),contactAt=b.startedAt+B.fillSeconds*Math.max(0,1-distance/b.radius);
  const exposure=Math.max(0,s.time-Math.max(s.time-dt,contactAt));
  if(exposure>0){p.health=Math.max(0,p.health-p.maxHealth*B.lavaDamage*exposure);if(p.health<1e-8)p.health=0;}
  if(p.health<=0)p.charge=0;
 }
 const living=s.players.filter(p=>p.health>0);
 if(b.solo){if(!s.players.some(p=>p.id===b.humanId&&p.health>0))b.result={kind:'survived',seconds:s.time-b.startedAt};}
 else if(living.length<=1)b.result=living.length?{kind:'winner',playerId:living[0].id,name:living[0].name}:{kind:'draw'};
 if(b.result){s.completed=true;b.endedAt=s.time;s.projectiles=[];s.effects=[];for(const p of s.players)p.charge=0;}
}
export function cameraPlayer(s,localId,spectatedId){
 const local=s.players.find(p=>p.id===localId);
 if(!s.battleRoyale||local?.health>0||s.completed)return local;
 return s.players.find(p=>p.id===spectatedId&&p.health>0)??s.players.find(p=>p.health>0)??local;
}
export function screenInput(input,angle=0){
 const c=Math.cos(angle),s=Math.sin(angle);return {...input,x:input.x*c+input.y*s,y:-input.x*s+input.y*c};
}
