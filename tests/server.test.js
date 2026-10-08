import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {WebSocket} from 'ws';
import {createLauncher} from '../server/index.js';
function open(url,options){return new Promise((resolve,reject)=>{const socket=new WebSocket(url,options);const inbox=[];const waiters=[];
 socket.on('message',data=>{const m=JSON.parse(data.toString());inbox.push(m);for(const w of [...waiters])if(w.match(m)){waiters.splice(waiters.indexOf(w),1);w.resolve(m);}});
 const api={socket,inbox,send:m=>socket.send(JSON.stringify(m)),next:match=>{const found=inbox.find(match);return found?Promise.resolve(found):new Promise(resolve=>waiters.push({match,resolve}));}};
 socket.once('open',()=>resolve(api));socket.once('error',reject);socket.once('unexpected-response',(request,response)=>{request.destroy();reject(new Error(`HTTP ${response.statusCode}`));});});}
const raw=(port,requestPath)=>new Promise((resolve,reject)=>http.get({host:'127.0.0.1',port,path:requestPath,agent:false},response=>{let body='';response.on('data',c=>body+=c);response.on('end',()=>resolve({status:response.statusCode,body}));}).on('error',reject));
test('launcher: panel control, matchmaking over WebSocket, static files, and shutdown on panel close',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'kadkaton-server-'));await writeFile(path.join(root,'index.html'),'<h1>game</h1>');
 let down=false;const launcher=createLauncher({controlPort:0,gamePort:0,gameRoot:root,grace:60,onShutdown:()=>{down=true;}});
 const control=await launcher.listen();
 try{
  assert.match((await raw(control,'/')).body,/Ebaboba matchmaking server/);
  // Foreign origins cannot drive the panel.
  await assert.rejects(open(`ws://localhost:${control}/control`,{origin:'http://evil.example'}));
  await assert.rejects(open(`ws://localhost:${control}/control`));
  const panel=await open(`ws://localhost:${control}/control`,{origin:`http://localhost:${control}`});
  assert.equal((await panel.next(m=>m.t==='state')).running,false);
  panel.send({t:'start',tunnel:false});
  const running=await panel.next(m=>m.t==='state'&&m.running);
  assert.match(running.localUrl,/^http:\/\/localhost:\d+\/$/);const port=launcher.gamePort;
  assert.equal(running.publicUrl,null);
  // Static files are served, traversal is refused.
  assert.equal((await raw(port,'/')).body,'<h1>game</h1>');
  for(const bad of ['/..%2fpackage.json','/%2e%2e/package.json','/..%2f..%2f..%2fetc%2fpasswd'])assert.ok([403,404].includes((await raw(port,bad)).status),bad);
  // Two players meet through the server and the panel sees the room.
  const host=await open(`ws://localhost:${port}/ws`),guest=await open(`ws://localhost:${port}/ws`);
  guest.send({t:'subscribe'});host.send({t:'host',name:'Ann',roomName:'Test room',max:3});
  const hosted=await host.next(m=>m.t==='hosted');
  const list=await guest.next(m=>m.t==='rooms'&&m.rooms.length===1);assert.equal(list.rooms[0].id,hosted.room);
  const panelRooms=await panel.next(m=>m.t==='rooms'&&m.rooms.length===1);assert.equal(panelRooms.rooms[0].name,'Test room');
  guest.send({t:'join',room:hosted.room,name:'Bob'});await host.next(m=>m.t==='peer-joined');
  guest.send({t:'signal',to:host.inbox[0].id,data:{hello:1}});assert.deepEqual((await host.next(m=>m.t==='signal')).data,{hello:1});
  host.socket.close();await guest.next(m=>m.t==='room-closed');
  await panel.next(m=>m.t==='rooms'&&m.rooms.length===0);
  assert.ok(launcher.logs.some(l=>/opened room/.test(l.text)));
  // Stop closes the port.
  panel.send({t:'stop'});await panel.next(m=>m.t==='state'&&!m.running);
  await assert.rejects(raw(port,'/'));
  // Closing the panel shuts the launcher down.
  panel.socket.close();await new Promise(resolve=>{const timer=setInterval(()=>{if(down){clearInterval(timer);resolve();}},20);});
  assert.equal(down,true);
 }finally{await launcher.shutdown().catch(()=>{});await rm(root,{recursive:true,force:true});}
});
test('launcher refuses to start without a game build',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'kadkaton-empty-'));const launcher=createLauncher({controlPort:0,gamePort:0,gameRoot:root,grace:60});
 await launcher.listen();await launcher.start({withTunnel:false});assert.equal(launcher.gameRunning,false);assert.ok(launcher.logs.some(l=>l.level==='error'));
 await launcher.shutdown();await rm(root,{recursive:true,force:true});
});
