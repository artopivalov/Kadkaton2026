// Room registry and signaling relay. Pure logic: it knows nothing about sockets, only send callbacks.
import {randomBytes} from 'node:crypto';
export const LIMITS = Object.freeze({maxRooms:20,maxPlayers:8,minPlayers:2,maxNameLength:24,maxSignalBytes:16384});
const clean=(value,fallback)=>{const text=String(value??'').replace(/[\u0000-\u001f\u007f<>]/g,'').trim().slice(0,LIMITS.maxNameLength);return text||fallback;};
export function createMatchmaker({log=()=>{}}={}){
 const clients=new Map(); // id -> {id,send,room,name,subscribed}
 const rooms=new Map(); // id -> {id,name,scene,max,inGame,hostId,hostName,peers:Map,createdAt}
 let nextClient=1;
 const post=(client,message)=>{try{client.send(message);}catch{}};
 const summary=room=>({id:room.id,name:room.name,scene:room.scene,hostName:room.hostName,players:1+room.peers.size,max:room.max,inGame:room.inGame,joinable:!room.inGame&&1+room.peers.size<room.max,createdAt:room.createdAt});
 const roomList=()=>[...rooms.values()].map(summary);
 const onRoomsChanged=()=>{const message={t:'rooms',rooms:roomList()};for(const client of clients.values())if(client.subscribed)post(client,message);hooks.onRooms(roomList());};
 const fail=(client,code,message)=>post(client,{t:'error',code,message});
 function closeRoom(room,reason){
  rooms.delete(room.id);
  for(const peerId of room.peers.keys()){const peer=clients.get(peerId);if(peer){peer.room=null;post(peer,{t:'room-closed',room:room.id});}}
  const host=clients.get(room.hostId);if(host)host.room=null;
  log('info',`Room "${room.name}" (${room.id}) closed: ${reason}`);
 }
 function leave(client,reason){
  const room=client.room&&rooms.get(client.room);if(!room)return;
  if(room.hostId===client.id){closeRoom(room,reason);return;}
  room.peers.delete(client.id);client.room=null;
  const host=clients.get(room.hostId);if(host)post(host,{t:'peer-left',id:client.id});
  log('info',`${client.name} left "${room.name}" (${room.peers.size+1}/${room.max})`);
 }
 const hooks={onRooms:()=>{},onClients:()=>{}};
 return {
  hooks,
  get roomCount(){return rooms.size;},get clientCount(){return clients.size;},
  rooms:roomList,
  connect(send){
   const client={id:`c${nextClient++}`,send,room:null,name:'Player',subscribed:false};clients.set(client.id,client);
   post(client,{t:'welcome',id:client.id});hooks.onClients(clients.size);return client.id;
  },
  disconnect(id){
   const client=clients.get(id);if(!client)return;
   const hadRoom=Boolean(client.room);leave(client,'host disconnected');clients.delete(id);
   hooks.onClients(clients.size);if(hadRoom)onRoomsChanged();
  },
  receive(id,message){
   const client=clients.get(id);if(!client||!message||typeof message!=='object')return;
   if(message.t==='subscribe'){client.subscribed=true;post(client,{t:'rooms',rooms:roomList()});return;}
   if(message.t==='unsubscribe'){client.subscribed=false;return;}
   if(message.t==='host'){
    if(client.room)return fail(client,'busy','Already in a room.');
    if(rooms.size>=LIMITS.maxRooms)return fail(client,'full','Too many rooms.');
    const max=Math.max(LIMITS.minPlayers,Math.min(LIMITS.maxPlayers,Math.trunc(Number(message.max))||4));
    client.name=clean(message.name,'Host');
    let roomId;do{roomId=randomBytes(3).toString('hex');}while(rooms.has(roomId));
    const room={id:roomId,name:clean(message.roomName,`${client.name}'s game`),scene:clean(message.scene,'lobby'),max,inGame:false,hostId:client.id,hostName:client.name,peers:new Map(),createdAt:Date.now()};
    rooms.set(roomId,room);client.room=roomId;post(client,{t:'hosted',room:roomId,id:client.id,max});
    log('info',`${client.name} opened room "${room.name}" (${roomId}, up to ${max} players)`);onRoomsChanged();return;
   }
   if(message.t==='status'){
    const room=client.room&&rooms.get(client.room);if(!room||room.hostId!==client.id)return fail(client,'not-host','Only the host can do that.');
    room.inGame=Boolean(message.inGame);onRoomsChanged();return;
   }
   if(message.t==='join'){
    if(client.room)return fail(client,'busy','Already in a room.');
    const room=rooms.get(String(message.room));
    if(!room)return fail(client,'not-found','Room does not exist.');
    if(room.inGame)return fail(client,'started','The game has already started.');
    if(1+room.peers.size>=room.max)return fail(client,'full','Room is full.');
    client.name=clean(message.name,'Player');room.peers.set(client.id,client.name);client.room=room.id;
    post(client,{t:'joined',room:room.id,id:client.id,hostId:room.hostId,hostName:room.hostName,scene:room.scene});
    const host=clients.get(room.hostId);if(host)post(host,{t:'peer-joined',id:client.id,name:client.name});
    log('info',`${client.name} joined "${room.name}" (${1+room.peers.size}/${room.max})`);onRoomsChanged();return;
   }
   if(message.t==='leave'){const had=Boolean(client.room);leave(client,'host left');if(had)onRoomsChanged();return;}
   if(message.t==='signal'){
    const room=client.room&&rooms.get(client.room);if(!room)return fail(client,'not-in-room','Join a room first.');
    if(JSON.stringify(message.data??null).length>LIMITS.maxSignalBytes)return fail(client,'too-large','Signal is too large.');
    // Signaling runs only between the host and a client of the same room.
    const to=String(message.to);const allowed=client.id===room.hostId?room.peers.has(to):to===room.hostId;
    if(!allowed)return fail(client,'bad-target','Unknown target.');
    const target=clients.get(to);if(target)post(target,{t:'signal',from:client.id,data:message.data});return;
   }
   fail(client,'bad-message','Unknown message.');
  }
 };
}
