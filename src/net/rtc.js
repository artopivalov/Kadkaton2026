// Peer-to-peer links over WebRTC data channels. The matchmaking server only relays the handshake.
import {encode,split,createReassembler} from './codec.js';
import {NET_BALANCE} from '../balance.js';
export const DIRECT_FAILED='Could not connect directly to the host. Your network may block peer-to-peer connections.';
const config=()=>({iceServers:[{urls:NET_BALANCE.stunServers}]});
// Messages can arrive before anyone listens (the other side talks as soon as the channel opens),
// so every channel is tapped at creation and its messages are kept until the link has a handler.
function tap(channel){
 const tapped={queue:[],deliver:null},reassemble=createReassembler();
 channel.onmessage=event=>{const message=reassemble(event.data);if(!message)return;if(tapped.deliver)tapped.deliver(message);else tapped.queue.push(message);};
 return tapped;
}
// One reliable ordered channel for events and one unreliable unordered channel for inputs and snapshots.
function makeLink(pc,channels,taps){
 const link={onclose:null};let id=0,closed=false,handler=null;
 const backlog=[];
 Object.defineProperty(link,'onmessage',{get:()=>handler,set(fn){handler=fn;if(fn)for(const message of backlog.splice(0))fn(message);}});
 const deliver=message=>{if(handler)handler(message);else backlog.push(message);};
 const end=()=>{if(closed)return;closed=true;link.onclose?.();};
 for(const name of ['u','r']){
  taps[name].deliver=deliver;for(const message of taps[name].queue.splice(0))deliver(message);
  channels[name].onclose=end;
 }
 pc.onconnectionstatechange=()=>{if(pc.connectionState==='failed'||pc.connectionState==='closed')end();};
 link.send=(message,reliable=false)=>{
  const channel=reliable?channels.r:channels.u;if(channel.readyState!=='open')return;
  try{for(const part of split(encode(message),++id))channel.send(part);}catch{}
 };
 link.close=()=>{closed=true;try{pc.close();}catch{}};
 return link;
}
function waitForOpen(pc,get,taps,timeoutMs,cleanup){
 return new Promise((resolve,reject)=>{
  let done=false;
  const fail=reason=>{if(done)return;done=true;clearTimeout(timer);cleanup();try{pc.close();}catch{}reject(new Error(reason));};
  const check=()=>{
   const channels=get();if(done||!channels.u||!channels.r||!taps.u||!taps.r)return;
   if(channels.u.readyState==='open'&&channels.r.readyState==='open'){done=true;clearTimeout(timer);resolve(makeLink(pc,channels,taps));}
  };
  const timer=setTimeout(()=>fail(DIRECT_FAILED),timeoutMs*1000);
  pc.addEventListener('connectionstatechange',()=>{if(pc.connectionState==='failed')fail(DIRECT_FAILED);});
  const poll=setInterval(()=>{check();if(done)clearInterval(poll);},50);
 });
}
// Accepts a joining client (host side, creates the offer).
export async function acceptPeer(match,peerId,{timeoutMs=NET_BALANCE.connectTimeout,RTC=globalThis.RTCPeerConnection}={}){
 const pc=new RTC(config()),queued=[],channels={},taps={};let remoteSet=false;
 channels.u=pc.createDataChannel('u',{ordered:false,maxRetransmits:0});channels.r=pc.createDataChannel('r',{ordered:true});taps.u=tap(channels.u);taps.r=tap(channels.r);
 pc.onicecandidate=event=>{if(event.candidate)match.signal(peerId,{ice:event.candidate.toJSON()});};
 const stop=match.watch(peerId,async data=>{
  try{
   if(data.answer){await pc.setRemoteDescription(data.answer);remoteSet=true;for(const c of queued.splice(0))await pc.addIceCandidate(c);}
   else if(data.ice){if(remoteSet)await pc.addIceCandidate(data.ice);else queued.push(data.ice);}
  }catch{}
 });
 const opened=waitForOpen(pc,()=>channels,taps,timeoutMs,stop);opened.catch(()=>{});
 const offer=await pc.createOffer();await pc.setLocalDescription(offer);match.signal(peerId,{offer:{type:offer.type,sdp:offer.sdp}});
 try{return await opened;}finally{stop();}
}
// Connects to the host (client side, answers the offer).
export async function connectToHost(match,hostId,{timeoutMs=NET_BALANCE.connectTimeout,RTC=globalThis.RTCPeerConnection}={}){
 const pc=new RTC(config()),queued=[],channels={},taps={};let remoteSet=false;
 pc.ondatachannel=event=>{channels[event.channel.label]=event.channel;taps[event.channel.label]=tap(event.channel);};
 pc.onicecandidate=event=>{if(event.candidate)match.signal(hostId,{ice:event.candidate.toJSON()});};
 const stop=match.watch(hostId,async data=>{
  try{
   if(data.offer){
    await pc.setRemoteDescription(data.offer);remoteSet=true;for(const c of queued.splice(0))await pc.addIceCandidate(c);
    const answer=await pc.createAnswer();await pc.setLocalDescription(answer);match.signal(hostId,{answer:{type:answer.type,sdp:answer.sdp}});
   }else if(data.ice){if(remoteSet)await pc.addIceCandidate(data.ice);else queued.push(data.ice);}
  }catch{}
 });
 try{return await waitForOpen(pc,()=>channels,taps,timeoutMs,stop);}finally{stop();}
}
