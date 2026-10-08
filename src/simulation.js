import {CONFIG} from './balance.js';
export {CONFIG} from './balance.js';
export function createState(profile){return {time:0,nextId:10,player:{id:1,x:600,y:450,angle:-Math.PI/2,name:profile.name,color:profile.color,wand:{id:2,type:'fire'},mode:'Safe',charge:0},items:[{id:3,type:'fire',x:730,y:450,availableAt:0}],projectiles:[],effects:[],targets:[{id:4,x:600,y:210,hits:0,damage:0},{id:5,x:850,y:310,hits:0,damage:0},{id:6,x:350,y:310,hits:0,damage:0}],shots:0};}
export function setMode(s,mode){if(!['Safe','Normal','Special'].includes(mode))return;s.player.mode=mode;s.player.charge=0;}
export function dropWand(s){const p=s.player;if(!p.wand)return false;s.items.push({...p.wand,x:Math.max(CONFIG.playerRadius,Math.min(CONFIG.worldWidth-CONFIG.playerRadius,p.x+Math.cos(p.angle)*CONFIG.dropDistance)),y:Math.max(CONFIG.playerRadius,Math.min(CONFIG.worldHeight-CONFIG.playerRadius,p.y+Math.sin(p.angle)*CONFIG.dropDistance)),availableAt:s.time+CONFIG.pickupDelay});p.wand=null;p.charge=0;return true;}
export function release(s){
  const p=s.player;
  if(p.wand&&p.mode==='Normal'&&p.charge>0){
    s.projectiles.push({id:s.nextId++,owner:p.id,x:p.x+Math.cos(p.angle)*CONFIG.projectileOffset,y:p.y+Math.sin(p.angle)*CONFIG.projectileOffset,angle:p.angle,distance:0,radius:CONFIG.projectileRadius+CONFIG.chargedRadiusBonus*p.charge,power:p.charge});
    s.shots++;
  }else if(p.wand&&p.mode==='Special'&&p.charge>=1){
    // Self-damage is unresolved in the GDD; this lobby applies damage to dummies only.
    for(const target of s.targets){
      if(Math.hypot(target.x-p.x,target.y-p.y)<=CONFIG.specialRadius+CONFIG.targetRadius){target.hits++;target.damage+=CONFIG.specialDamage;}
    }
    s.effects.push({kind:'fireWave',owner:p.id,x:p.x,y:p.y,life:CONFIG.specialDuration,duration:CONFIG.specialDuration,radius:CONFIG.specialRadius});
    s.shots++;
  }
  p.charge=0;
}
function segmentDistance(x,y,ax,ay,bx,by){const dx=bx-ax,dy=by-ay;const t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-ax-t*dx,y-ay-t*dy);}
export function step(s,input,dt){s.time+=dt;const p=s.player;let {x,y}=input;const length=Math.hypot(x,y);if(length>1){x/=length;y/=length;}if(length>CONFIG.inputDeadzone){p.angle=Math.atan2(y,x);p.x=Math.max(CONFIG.playerRadius,Math.min(CONFIG.worldWidth-CONFIG.playerRadius,p.x+x*CONFIG.speed*dt));p.y=Math.max(CONFIG.playerRadius,Math.min(CONFIG.worldHeight-CONFIG.playerRadius,p.y+y*CONFIG.speed*dt));if(p.wand&&p.mode!=='Safe')p.charge=Math.min(1,p.charge+dt/(p.mode==='Special'?CONFIG.specialChargeTime:CONFIG.chargeTime));}
const item=s.items.find(i=>s.time>=i.availableAt&&Math.hypot(i.x-p.x,i.y-p.y)<=CONFIG.pickupRadius);if(!p.wand&&item){p.wand={id:item.id,type:item.type};s.items=s.items.filter(i=>i!==item);}
s.projectiles=s.projectiles.filter(b=>{const ax=b.x,ay=b.y;const travel=CONFIG.projectileSpeed*dt;b.x+=Math.cos(b.angle)*travel;b.y+=Math.sin(b.angle)*travel;b.distance+=travel;const target=s.targets.find(t=>segmentDistance(t.x,t.y,ax,ay,b.x,b.y)<=CONFIG.targetRadius+b.radius);if(target){target.hits++;target.damage+=CONFIG.normalDamage;s.effects.push({x:b.x,y:b.y,life:CONFIG.impactDuration,duration:CONFIG.impactDuration,radius:CONFIG.impactRadius+b.power*CONFIG.chargedImpactBonus});return false;}if(b.distance>=CONFIG.projectileRange||b.x<0||b.x>CONFIG.worldWidth||b.y<0||b.y>CONFIG.worldHeight){s.effects.push({x:b.x,y:b.y,life:CONFIG.expiryDuration,duration:CONFIG.expiryDuration,radius:CONFIG.expiryRadius});return false;}return true;});s.effects=s.effects.filter(e=>(e.life-=dt)>0);}
