// Authoritative side of a session. It owns the world state, feeds remote inputs into the simulation
// and sends every client a snapshot of its surroundings.
import {addPlayer,removePlayer,getPlayer,fastForward} from '../simulation.js';
import {buildSnapshot} from './snapshot.js';
import {NET_BALANCE} from '../balance.js';
const IDLE=Object.freeze({x:0,y:0,held:false});
export function createHost(state,{maxPlayers=NET_BALANCE.maxPlayers,onJoin=()=>{},onLeave=()=>{},onRequest=()=>{}}={}){
 const peers=new Map();let tick=0;
 function receive(peer,message){
  if(!message||typeof message!=='object')return;
  if(message.t==='hello'&&peer.playerId===null){
   if(state.players.length>=maxPlayers){peer.link.send({t:'bye',reason:'The room is full.'},true);peer.link.close();return;}
   const name=String(message.name??'Wizard').slice(0,24)||'Wizard',color=/^#[0-9a-f]{6}$/i.test(message.color)?message.color:'#79a9ff';
   const player=addPlayer(state,{name,color});peer.playerId=player.id;peer.name=name;
   peer.link.send({t:'welcome',id:player.id},true);onJoin(name,player.id);
  }else if(message.t==='in'&&peer.playerId!==null&&Array.isArray(message.frames)){
   for(const frame of message.frames){
    if(!Number.isInteger(frame?.seq)||frame.seq<=peer.last||peer.queue.some(f=>f.seq===frame.seq))continue;
    peer.queue.push({seq:frame.seq,x:Number(frame.x)||0,y:Number(frame.y)||0,held:Boolean(frame.held),commands:Array.isArray(frame.commands)?frame.commands.slice(0,8):[]});
   }
   peer.queue.sort((a,b)=>a.seq-b.seq);
   if(peer.queue.length>NET_BALANCE.hostQueueLimit*4)peer.queue.length=NET_BALANCE.hostQueueLimit*4;
  }else if(message.t==='ping'){peer.rtt=Math.max(0,Math.min(1000,Number(message.rtt)||0));peer.link.send({t:'pong',ts:message.ts},false);}
  else if(message.t==='lobby'&&peer.playerId!==null)onRequest('lobby',peer.playerId);
 }
 // A silent client stops moving after a moment instead of walking on forever.
 const repeat=peer=>{if(++peer.silent>12)peer.input=IDLE;return {...peer.input,commands:peer.carry.splice(0)};};
 function nextInput(peer){
  // Too many queued frames: skip the oldest ones but never lose their commands.
  while(peer.queue.length>NET_BALANCE.hostCatchUpAt){const skipped=peer.queue.shift();peer.carry.push(...skipped.commands);peer.last=skipped.seq;peer.ack=skipped.seq;}
  const head=peer.queue[0];
  if(!head)return repeat(peer);
  // A hole in the sequence is given a couple of ticks to fill; after that the lost frames are skipped.
  if(head.seq!==peer.last+1&&peer.starved<NET_BALANCE.hostGapWaitTicks){peer.starved++;return repeat(peer);}
  peer.starved=0;peer.silent=0;peer.queue.shift();peer.last=peer.ack=head.seq;
  peer.input={x:head.x,y:head.y,held:head.held};
  const commands=[...peer.carry.splice(0),...head.commands];
  // A cast is resolved on this tick; remember where new projectiles start so they can be caught up.
  if(commands.some(c=>c.type==='release'))peer.castFrom=state.nextId;
  return {...peer.input,commands,seq:head.seq};
 }
 return {
  peers,
  get tick(){return tick;},
  addPeer(id,link){
   const peer={id,link,playerId:null,name:'',queue:[],carry:[],last:0,ack:0,starved:0,silent:0,rtt:0,castFrom:null,input:IDLE};
   link.onmessage=message=>receive(peer,message);
   link.onclose=()=>this.removePeer(id);
   peers.set(id,peer);return peer;
  },
  removePeer(id){
   const peer=peers.get(id);if(!peer)return;peers.delete(id);
   if(peer.playerId!==null&&getPlayer(state,peer.playerId)){removePlayer(state,peer.playerId);onLeave(peer.name,peer.playerId);}
   peer.link.onclose=null;try{peer.link.close();}catch{}
  },
  // Inputs for the next simulation tick, keyed by player id.
  collectInputs(){
   const inputs={};
   for(const peer of peers.values())if(peer.playerId!==null)inputs[peer.playerId]=nextInput(peer);
   return inputs;
  },
  // Call after every simulation tick.
  afterTick(){
   tick++;
   // The client cast this one-way delay ago: bring its projectiles to where the client already shows them.
   for(const peer of peers.values())if(peer.castFrom!==null){if(peer.playerId!==null)fastForward(state,peer.playerId,peer.castFrom,Math.min(peer.rtt/2000,NET_BALANCE.maxCompensation));peer.castFrom=null;}
   if(tick%NET_BALANCE.snapshotEvery!==0)return;
   for(const peer of peers.values())if(peer.playerId!==null)peer.link.send(buildSnapshot(state,peer.playerId,{tick,ack:peer.ack}),false);
  },
  notify(message){for(const peer of peers.values())if(peer.playerId!==null)peer.link.send({t:'notice',text:message},true);},
  close(reason='The host closed the game.'){for(const peer of [...peers.values()]){try{peer.link.send({t:'bye',reason},true);}catch{}this.removePeer(peer.id);}}
 };
}
