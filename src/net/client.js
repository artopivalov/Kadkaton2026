// Remote side of a session. It never simulates the world for others: it renders interpolated host snapshots,
// and predicts the local player so controls and casts respond without waiting for the network.
import {step,getPlayer} from '../simulation.js';
import {applySnapshot,cloneForPrediction} from './snapshot.js';
import {NET_BALANCE} from '../balance.js';
const TICK=NET_BALANCE.tick;
const lerpAngle=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
function lerpList(from,to,alpha){
 if(alpha>=1||from===to)return [...to];
 const previous=new Map(from.map(e=>[e.id,e]));
 return to.map(e=>{
  const p=previous.get(e.id);if(!p||e.x===undefined||p.x===undefined)return e;
  const dx=e.x-p.x,dy=e.y-p.y;if(dx*dx+dy*dy>300*300)return e; // teleports and respawns are not smoothed
  const moved={...e,x:p.x+dx*alpha,y:p.y+dy*alpha};
  if(e.angle!==undefined&&p.angle!==undefined)moved.angle=lerpAngle(p.angle,e.angle,alpha);
  return moved;
 });
}
export function createClient(link,profile,{now=()=>performance.now(),onNotice=()=>{},onClose=()=>{}}={}){
 const auth={},buffer=[];
 let localId=null,seq=0,unacked=[],pred=null,accumulator=0,offset=null,rtt=null,lastSnap=null,lastSnapAt=now(),lastPing=0,lastFrame=null,corr={x:0,y:0},closed=false;
 function fail(reason){if(closed)return;closed=true;try{link.close();}catch{}onClose(reason);}
 function reconcile(){
  const before=pred?getPlayer(pred,localId):null,bx=before?before.x+corr.x:0,by=before?before.y+corr.y:0;
  pred=cloneForPrediction(auth);
  for(const frame of unacked)step(pred,{[localId]:{...frame.input,seq:frame.seq}},TICK);
  const after=getPlayer(pred,localId);
  // Smooth over disagreements with the host instead of snapping the character.
  if(before&&after){const dx=bx-after.x,dy=by-after.y,d=Math.hypot(dx,dy);corr=d>.01&&d<=NET_BALANCE.maxCorrection?{x:dx,y:dy}:{x:0,y:0};}
 }
 function onSnapshot(snap){
  if(lastSnap&&snap.tick<=lastSnap.tick)return;
  const at=now();lastSnap=snap;lastSnapAt=at;
  const sample=at-snap.time*1000;offset=offset===null?sample:Math.min(sample,offset+.5);
  buffer.push({time:snap.time,snap});while(buffer.length>12)buffer.shift();
  applySnapshot(auth,snap);unacked=unacked.filter(f=>f.seq>snap.ack);
  if(localId!==null&&getPlayer(auth,localId))reconcile();
 }
 link.onmessage=message=>{
  if(!message||typeof message!=='object')return;
  if(message.t==='welcome')localId=message.id;
  else if(message.t==='snap')onSnapshot(message);
  else if(message.t==='pong')rtt=now()-message.ts;
  else if(message.t==='notice')onNotice(message.text);
  else if(message.t==='bye')fail(message.reason||'The host closed the game.');
 };
 link.onclose=()=>fail('Connection to the host was lost.');
 link.send({t:'hello',name:profile.name,color:profile.color},true);
 function display(at){
  const b0=buffer.at(-1),t=(at-offset)/1000-NET_BALANCE.interpolationDelay;
  let a=buffer[0],b=b0;
  for(let i=buffer.length-1;i>=0;i--)if(buffer[i].time<=t){a=buffer[i];b=buffer[Math.min(i+1,buffer.length-1)];break;}
  const span=b.time-a.time,alpha=span>0?Math.max(0,Math.min(1,(t-a.time)/span)):1,time=Math.min(b.time,Math.max(a.time,t)),ahead=b.time-time;
  const rs={...auth,time};
  const me=pred?getPlayer(pred,localId):null;
  rs.players=lerpList(a.snap.players,b.snap.players,alpha).map(p=>p.id===localId&&me?{...p,x:me.x+corr.x,y:me.y+corr.y,angle:me.angle,mode:me.mode,charge:me.charge,mana:me.mana,castFeedback:me.castFeedback}:p);
  rs.enemies=lerpList(a.snap.enemies,b.snap.enemies,alpha);
  rs.projectiles=lerpList(a.snap.projectiles,b.snap.projectiles,alpha).filter(e=>e.owner!==localId||e.enemy);
  rs.targets=b.snap.targets;rs.portals=b.snap.portals;rs.pedestals=b.snap.pedestals;
  // Things the local player created are not held back for interpolation: they are taken from the newest
  // snapshot and advanced by the time that has passed since, so a cast never seems to wait for the network.
  const newest=b0.snap,age=Math.max(0,Math.min(.3,(at-offset)/1000-newest.time+(rtt??0)/2000));
  rs.items=newest.items;rs.walls=newest.walls;
  rs.projectiles.push(...newest.projectiles.filter(e=>e.owner===localId&&!e.enemy).map(e=>{
   const travel=Math.min((e.speed??0)*age,Math.max(0,(e.range??Infinity)-(e.distance??0)));
   return {...e,x:e.x+Math.cos(e.angle)*travel,y:e.y+Math.sin(e.angle)*travel};
  }));
  rs.effects=[...b.snap.effects.filter(e=>e.by!==localId).map(e=>({...e,life:Math.min(e.duration,e.life+ahead)})),...newest.effects.filter(e=>e.by===localId).map(e=>({...e,life:e.life-age})).filter(e=>e.life>0)];
  rs.telegraphs=b.snap.telegraphs.map(e=>({...e,delay:e.delay+ahead}));
  if(pred){
   // The player's own casts show at once; the host's versions replace them when the host catches up.
   rs.projectiles.push(...pred.projectiles.filter(e=>!e.auth&&e.owner===localId&&!e.enemy));
   rs.effects.push(...pred.effects.filter(e=>!e.auth&&e.by===localId));
   rs.walls=[...rs.walls,...pred.walls.filter(e=>!e.auth&&e.owner===localId)];
  }
  return rs;
 }
 return {
  get localId(){return localId;},get rtt(){return rtt;},get ready(){return lastSnap!==null&&localId!==null&&pred!==null;},get closed(){return closed;},
  // One rendered frame: runs the fixed ticks for local input, then returns the state to draw (or null before the first snapshot).
  update(at,getInput){
   if(closed)return null;
   if((at-lastSnapAt)/1000>NET_BALANCE.silenceTimeout){fail('Connection to the host was lost.');return null;}
   const dt=lastFrame===null?0:Math.min((at-lastFrame)/1000,.1);lastFrame=at;
   if((at-lastPing)/1000>=NET_BALANCE.pingInterval){lastPing=at;link.send({t:'ping',ts:at,rtt:rtt===null?0:Math.round(rtt)},false);}
   if(!this.ready)return null;
   accumulator+=dt;
   while(accumulator>=TICK){
    const input=getInput(),frame={seq:++seq,input:{x:input.x,y:input.y,held:input.held,commands:input.commands??[]}};
    unacked.push(frame);if(unacked.length>NET_BALANCE.maxUnacked)unacked.shift();
    step(pred,{[localId]:{...frame.input,seq:frame.seq}},TICK);
    link.send({t:'in',frames:unacked.slice(-NET_BALANCE.inputRedundancy).map(f=>({seq:f.seq,...f.input}))},false);
    accumulator-=TICK;
   }
   const k=Math.exp(-NET_BALANCE.correctionRate*dt);corr={x:corr.x*k,y:corr.y*k};
   return display(at);
  },
  requestLobby(){link.send({t:'lobby'},true);},
  close(){closed=true;try{link.close();}catch{}}
 };
}
