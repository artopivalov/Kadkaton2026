import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {createLauncher} from '../server/index.js';
import {connectServer,serverUrl,UNAVAILABLE} from '../src/net/matchmaking.js';
const freePort=()=>new Promise(resolve=>{const s=net.createServer().listen(0,'127.0.0.1',()=>{const {port}=s.address();s.close(()=>resolve(port));});});
const until=async(condition,ms=3000)=>{const end=Date.now()+ms;while(Date.now()<end){if(condition())return;await new Promise(r=>setTimeout(r,10));}throw new Error('timed out');};
test('the client reports an unavailable server in plain words',async()=>{
 const port=await freePort();
 await assert.rejects(connectServer({url:`ws://127.0.0.1:${port}/ws`,timeoutMs:1500}),error=>error.message===UNAVAILABLE&&error.code==='unavailable');
 assert.equal(serverUrl({host:'',protocol:'file:'}),null);assert.equal(serverUrl({host:'a.test:80',protocol:'http:'}),'ws://a.test:80/ws');assert.equal(serverUrl({host:'a.test',protocol:'https:'}),'wss://a.test/ws');
 await assert.rejects(connectServer({url:null}),error=>error.message===UNAVAILABLE);
});
test('hosting, listing, joining and signaling work through the client library',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'kadkaton-mm-'));await writeFile(path.join(root,'index.html'),'x');
 const launcher=createLauncher({controlPort:0,gamePort:0,gameRoot:root,grace:60});await launcher.listen();await launcher.start({withTunnel:false});
 const url=`ws://127.0.0.1:${launcher.gamePort}/ws`;
 try{
  const host=await connectServer({url}),guest=await connectServer({url});
  let rooms=[];guest.onRooms=list=>{rooms=list;};guest.subscribe();await until(()=>guest.rooms.length===0&&rooms.length===0);
  const hosted=await host.host({name:'Ann',roomName:'Room A',scene:'lobby',max:3});assert.equal(hosted.max,3);
  await until(()=>rooms.length===1);assert.equal(rooms[0].name,'Room A');
  const joinedPeers=[];host.onPeerJoined=(id,name)=>joinedPeers.push([id,name]);
  const joined=await guest.join(hosted.room,'Bob');assert.equal(joined.hostId,host.id);
  await until(()=>joinedPeers.length===1);assert.deepEqual(joinedPeers[0],[guest.id,'Bob']);
  // A signal sent before anyone watches is delivered once a watcher appears.
  host.signal(guest.id,{offer:'x'});await new Promise(r=>setTimeout(r,100));
  const received=[];guest.watch(host.id,data=>received.push(data));await until(()=>received.length===1);assert.deepEqual(received[0],{offer:'x'});
  await assert.rejects(guest.join('nope','Bob'),error=>error.code==='busy');
  const late=await connectServer({url});await assert.rejects(late.join('nope','Zed'),error=>error.code==='not-found');
  let closed=false;guest.onRoomClosed=()=>{closed=true;};host.close();await until(()=>closed);
  guest.close();late.close();
 }finally{await launcher.shutdown().catch(()=>{});await rm(root,{recursive:true,force:true});}
});
