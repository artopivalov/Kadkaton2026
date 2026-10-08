import {WANDS} from './wands.js';
import {elementStyle,elementType,drawMote} from './elements.js';

// Presentation state never enters simulation snapshots or the gameplay random stream.
export function createFeedback({sound=()=>{},reducedMotion=false}={}){
 let scene=null,time=0,shake=0,hurt=0;
 const actors=new Map(),seen=new Set(),particles=[],rings=[],numbers=[],emitters=new Map();
 function mote(x,y,type,power=1,angle=null,trail=false){
  const style=elementStyle(type),a=angle===null?Math.random()*Math.PI*2:angle+(Math.random()-.5)*(trail?.7:2.1),speed=(trail?20:75+Math.random()*160)*power;
  if(particles.length>=160)particles.shift();
  const life=(trail?.18:.3)+Math.random()*.2;
  if(!trail&&['gravity','void'].includes(type)){x+=Math.cos(a)*(12+power*24);y+=Math.sin(a)*(12+power*24);}
  particles.push({x,y,vx:Math.cos(a)*speed*(!trail&&['gravity','void'].includes(type)?-1:1),vy:Math.sin(a)*speed*(!trail&&['gravity','void'].includes(type)?-1:1),color:style.palette[Math.floor(Math.random()*style.palette.length)],shape:style.shape,size:(trail?1.5:2.5+Math.random()*2)*(.65+power*.5),angle:a,spin:style.spin,drag:style.drag,life,max:life});
 }
 function burst(x,y,type,count,power=1,angle=null){
  for(let i=0;i<count;i++)mote(x,y,type,power,angle);
  if(rings.length>=12)rings.shift();
  rings.push({x,y,color:elementStyle(type).palette[0],life:.3,max:.3,radius:14+power*28,shape:elementStyle(type).shape,contract:type==='gravity'||type==='void'});
 }

 return {
  actors,particles,rings,numbers,get time(){return time;},get hurt(){return hurt;},get reducedMotion(){return reducedMotion;},
  get offset(){return reducedMotion?{x:0,y:0}:{x:Math.sin(time*103)*shake,y:Math.cos(time*127)*shake*.65};},
  reset(){actors.clear();seen.clear();particles.length=0;rings.length=0;numbers.length=0;emitters.clear();shake=0;hurt=0;},
  update(s,localId,dt){
   const key=`${s.scene.id}:${s.seed}:${s.map?.seed??''}`;
   if(scene!==key){this.reset();scene=key;for(const e of s.hitFeedback??[])seen.add('hit:'+e.key);}
   time+=dt;hurt*=Math.exp(-9*dt);shake*=Math.exp(-18*dt);
   const live=new Set();
   for(const [prefix,list] of [['p',s.players],['e',s.enemies??[]],['t',s.targets]])for(const p of list){
    const id=prefix+p.id;live.add(id);
    let a=actors.get(id);
    if(!a){a={x:p.x,y:p.y,hits:p.hits??0,health:p.health,healthTrail:p.health,damage:p.damage??0,angle:p.angle??0,charge:p.charge??0,cast:p.castFeedback?.key,speed:0,stride:0,recoil:0,recoilAge:1,recoilPower:0,recoilAngle:p.angle??0,chargeEmit:0,flash:0};actors.set(id,a);continue;}
    const distance=Math.hypot(p.x-a.x,p.y-a.y),speed=dt>0&&distance<80?Math.min(350,distance/dt):0;
    a.speed+=(speed-a.speed)*(1-Math.exp(-20*dt));a.stride+=distance<80?distance*.055:0;
    a.angle+=Math.atan2(Math.sin((p.angle??0)-a.angle),Math.cos((p.angle??0)-a.angle))*(1-Math.exp(-28*dt));
    a.healthTrail=Math.max(p.health??0,(a.healthTrail??p.health??0)+((p.health??0)-(a.healthTrail??p.health??0))*(1-Math.exp(-6*dt)));
    a.recoilAge+=dt;a.recoil=a.recoilPower*Math.exp(-17*a.recoilAge)*Math.cos(23*a.recoilAge);a.flash=Math.max(0,a.flash-dt);
    const cast=p.castFeedback;
    if(cast&&cast.key!==a.cast){
     const eventKey=`${id}:${cast.key}`;
     if(!seen.has(eventKey)){
      seen.add(eventKey);if(seen.size>256)seen.delete(seen.values().next().value);
      const power=.12+.88*cast.charge**2;
      a.recoilPower=power*(cast.mode==='Special'?19:12);a.recoil=a.recoilPower;a.recoilAge=0;a.recoilAngle=cast.angle;
      burst(cast.x+Math.cos(cast.angle)*32-Math.sin(cast.angle)*12,cast.y+Math.sin(cast.angle)*32+Math.cos(cast.angle)*12,cast.type,cast.mode==='Special'?26:14,power,cast.angle);
      sound('cast',cast.type,power*(cast.mode==='Special'?1.25:1),p.id===localId?1:.25);
      if(p.id===localId)shake=Math.min(3,shake+power*(cast.mode==='Special'?2.5:.85));
     }
    }
    if((p.hits??0)>a.hits){
     a.flash=.1;
     if(prefix==='p'&&p.id===localId&&p.health<a.health)shake=Math.min(2,shake+1.5);
    }
    if(a.charge===0&&p.charge>0&&p.id===localId)sound('charge',p.wand?.type,.3,.5);
    if(a.charge<1&&p.charge>=1){burst(p.x,p.y,p.wand?.type??'test',8,.4);if(p.id===localId)sound('ready',p.wand?.type,.4,1);}
    if(p.charge>0&&p.wand&&p.mode!=='Safe'){
     a.chargeEmit+=dt*(8+p.charge*18);let count=Math.min(3,Math.floor(a.chargeEmit));a.chargeEmit-=count;
     const x=p.x+Math.cos(p.angle)*32-Math.sin(p.angle)*12,y=p.y+Math.sin(p.angle)*32+Math.cos(p.angle)*12;
     while(count-->0)mote(x,y,p.wand.type,.2+p.charge*.2,p.angle,true);
    }else a.chargeEmit=0;
    Object.assign(a,{x:p.x,y:p.y,hits:p.hits??0,health:p.health,charge:p.charge??0,cast:cast?.key});
   }
   const grouped=new Map();
   for(const e of s.hitFeedback??[]){const key='hit:'+e.key;if(seen.has(key))continue;seen.add(key);const previous=grouped.get(e.target);grouped.set(e.target,{...e,amount:(previous?.amount??0)+e.amount,killed:e.killed||previous?.killed});}
   while(seen.size>256)seen.delete(seen.values().next().value);
   for(const e of grouped.values()){
    const color=e.amount<0?'#65e299':WANDS[e.spell]?.color??'#ffe4a3';
    burst(e.x,e.y,e.amount<0?'nature':e.spell,e.killed?20:12,e.killed?1.1:.8);
    if(e.localPlayer===localId&&e.amount>0){
     const power=Math.min(1,e.amount/30);hurt=Math.min(1,hurt+.35+power*.65);shake=Math.min(3,shake+1+power*2);sound('hurt',e.spell,power,1);
    }else sound('hit',e.spell,e.killed?1:.6,e.localPlayer===localId?1:.45);
    if(Math.abs(e.amount)>=.5){if(numbers.length>=12)numbers.shift();numbers.push({x:e.x,y:e.y-28,text:e.amount<0?`+${Math.round(-e.amount)}`:`${Math.round(e.amount)}`,color,life:.5});}
   }
   const active=new Set();
   for(const b of s.projectiles){if(b.enemy)continue;const key=`${b.owner}:${b.id}:${b.auth?'auth':'pred'}`;active.add(key);let age=(emitters.get(key)??0)+dt;const count=Math.min(2,Math.floor(age/.045));age-=count*.045;emitters.set(key,age);for(let i=0;i<count;i++)mote(b.x-Math.cos(b.angle)*(b.radius??4),b.y-Math.sin(b.angle)*(b.radius??4),elementType(b),.35,b.angle+Math.PI,true);}
   for(const key of emitters.keys())if(!active.has(key))emitters.delete(key);
   for(let i=numbers.length-1;i>=0;i--){const n=numbers[i];n.life-=dt;n.y-=30*dt;if(n.life<=0)numbers.splice(i,1);}
   for(const id of actors.keys())if(!live.has(id))actors.delete(id);
   for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;if(p.life<=0){particles.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.exp(-p.drag*dt);p.vy*=Math.exp(-p.drag*dt);p.angle+=p.spin*dt;}
   for(let i=rings.length-1;i>=0;i--)if((rings[i].life-=dt)<=0)rings.splice(i,1);
  }
 };
}
export function drawFeedback(ctx,f){
 if(!f)return;
 ctx.save();
 for(const r of f.rings){ctx.globalAlpha=(r.life/r.max)**2*.65;ctx.strokeStyle=r.color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(r.x,r.y,Math.max(0,r.radius*(r.contract?r.life/r.max:1-r.life/r.max)+5),0,Math.PI*2);ctx.stroke();ctx.globalAlpha=(r.life/r.max)**3*.8;ctx.strokeStyle='#fff6d9';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(r.x,r.y,Math.max(0,r.radius*(r.contract?r.life/r.max:1-r.life/r.max)*.6+2),0,Math.PI*2);ctx.stroke();
  if(['bolt','shard','diamond','stone'].includes(r.shape)){ctx.globalAlpha=(r.life/r.max)**2*.6;ctx.strokeStyle=r.color;for(let i=0;i<6;i++){const angle=i*Math.PI/3,inner=8+r.radius*(1-r.life/r.max),outer=inner+5*r.life/r.max;ctx.beginPath();ctx.moveTo(r.x+Math.cos(angle)*inner,r.y+Math.sin(angle)*inner);ctx.lineTo(r.x+Math.cos(angle)*outer,r.y+Math.sin(angle)*outer);ctx.stroke();}}
 }
 ctx.font='600 15px system-ui';ctx.textAlign='center';for(const n of f.numbers){ctx.globalAlpha=Math.min(1,n.life/.15);ctx.lineWidth=3;ctx.strokeStyle='#182c28';ctx.strokeText(n.text,n.x,n.y);ctx.fillStyle=n.color;ctx.fillText(n.text,n.x,n.y);}
 for(const p of f.particles){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.globalAlpha=Math.min(1,p.life/.1)*.85;ctx.fillStyle=p.color;ctx.strokeStyle=p.color;drawMote(ctx,p.shape,Math.max(.3,p.size*(.35+.65*p.life/p.max)));ctx.restore();}
 ctx.restore();
}

// Interpolate fixed simulation ticks for local/host rendering, without moving collision bodies.
export function capturePoses(s){
 return Object.fromEntries(['players','enemies','projectiles'].map(key=>[key,new Map((s[key]??[]).map(p=>[p.id,{x:p.x,y:p.y}]))]));
}
export function interpolatePoses(s,previous,alpha){
 if(!previous)return s;
 const result={...s},t=Math.max(0,Math.min(1,alpha));
 for(const key of ['players','enemies','projectiles'])result[key]=(s[key]??[]).map(p=>{
  const old=previous[key].get(p.id);if(!old||Math.hypot(p.x-old.x,p.y-old.y)>300)return p;
  return {...p,x:old.x+(p.x-old.x)*t,y:old.y+(p.y-old.y)*t};
 });
 return result;
}
