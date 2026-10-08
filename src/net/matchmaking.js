// Talks to the matchmaking server over WebSocket: room list, hosting, joining, and signaling relay.
export const UNAVAILABLE='The matchmaking server is not available.';
export class ServerError extends Error{constructor(message,code){super(message);this.code=code;}}
export function serverUrl(location=globalThis.location){
 if(!location||!location.host||!/^https?:$/.test(location.protocol))return null;
 return `${location.protocol==='https:'?'wss':'ws'}://${location.host}/ws`;
}
export function connectServer({url=serverUrl(),timeoutMs=8000,WebSocketImpl=globalThis.WebSocket}={}){
 return new Promise((resolve,reject)=>{
  if(!url||!WebSocketImpl)return reject(new ServerError(UNAVAILABLE,'unavailable'));
  let socket,settled=false;
  const fail=()=>{if(settled)return;settled=true;clearTimeout(timer);try{socket?.close();}catch{}reject(new ServerError(UNAVAILABLE,'unavailable'));};
  const timer=setTimeout(fail,timeoutMs);
  try{socket=new WebSocketImpl(url);}catch{return fail();}
  const client={
   id:null,rooms:[],onRooms:null,onPeerJoined:null,onPeerLeft:null,onRoomClosed:null,onClose:null,
   _pending:null,_watchers:new Map(),_early:[],
   _send(message){if(socket.readyState===1)socket.send(JSON.stringify(message));},
   _request(message,okType){
    return new Promise((ok,bad)=>{
     if(client._pending)return bad(new ServerError('Another request is in progress.','busy'));
     client._pending={okType,ok,bad,timer:setTimeout(()=>{client._pending=null;bad(new ServerError(UNAVAILABLE,'unavailable'));},6000)};
     client._send(message);
    });
   },
   subscribe(){client._send({t:'subscribe'});},unsubscribe(){client._send({t:'unsubscribe'});},
   host({name,roomName,scene,max}){return client._request({t:'host',name,roomName,scene,max},'hosted');},
   join(room,name){return client._request({t:'join',room,name},'joined');},
   setInGame(inGame){client._send({t:'status',inGame:Boolean(inGame)});},
   leave(){client._send({t:'leave'});},
   signal(to,data){client._send({t:'signal',to,data});},
   // Receives signaling from one peer. Messages that arrived before anyone listened are delivered first.
   watch(from,handler){
    client._watchers.set(from,handler);
    for(const message of client._early.splice(0))if(message.from===from)handler(message.data);else client._early.push(message);
    return ()=>client._watchers.delete(from);
   },
   close(){clearTimeout(client._pending?.timer);client._pending=null;try{socket.close();}catch{}}
  };
  socket.onmessage=event=>{
   let m;try{m=JSON.parse(event.data);}catch{return;}
   if(m.t==='welcome'){client.id=m.id;if(!settled){settled=true;clearTimeout(timer);resolve(client);}return;}
   const pending=client._pending;
   if(pending&&m.t===pending.okType){clearTimeout(pending.timer);client._pending=null;pending.ok(m);return;}
   if(pending&&m.t==='error'){clearTimeout(pending.timer);client._pending=null;pending.bad(new ServerError(m.message,m.code));return;}
   if(m.t==='rooms'){client.rooms=m.rooms;client.onRooms?.(m.rooms);}
   else if(m.t==='peer-joined')client.onPeerJoined?.(m.id,m.name);
   else if(m.t==='peer-left')client.onPeerLeft?.(m.id);
   else if(m.t==='room-closed')client.onRoomClosed?.(m.room);
   else if(m.t==='signal'){const handler=client._watchers.get(m.from);if(handler)handler(m.data);else{client._early.push(m);if(client._early.length>200)client._early.shift();}}
  };
  socket.onerror=()=>{if(!settled)fail();};
  socket.onclose=()=>{if(!settled)fail();else{clearTimeout(client._pending?.timer);client._pending?.bad(new ServerError(UNAVAILABLE,'unavailable'));client._pending=null;client.onClose?.();}};
 });
}
