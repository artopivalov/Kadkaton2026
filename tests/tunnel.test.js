import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,chmod,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createTunnel} from '../server/tunnel.js';
import {serverUrl} from '../src/net/matchmaking.js';
const until=async(condition,ms=3000)=>{const end=Date.now()+ms;while(Date.now()<end){if(condition())return;await new Promise(r=>setTimeout(r,10));}throw new Error('timed out');};
test('the tailscale tunnel finds the fixed address in the funnel output and can be stopped',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'kadkaton-ts-')),fake=path.join(dir,'tailscale');
 await writeFile(fake,'#!/bin/sh\necho "Available on the internet:"\necho ""\necho "https://my-mac.tail1234.ts.net/"\necho "|-- / proxy http://127.0.0.1:$2"\nsleep 30\n');await chmod(fake,0o755);
 try{
  const urls=[],logs=[];const tunnel=createTunnel({provider:'tailscale',binary:fake,log:(level,text)=>logs.push([level,text]),onUrl:u=>urls.push(u)});
  await tunnel.start(8701);await until(()=>urls.length>0);assert.equal(urls[0],'https://my-mac.tail1234.ts.net');assert.equal(tunnel.running,true);
  tunnel.stop();assert.equal(tunnel.running,false);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('funnel problems are shown as warnings and a missing program is explained',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'kadkaton-ts-')),fake=path.join(dir,'tailscale');
 await writeFile(fake,'#!/bin/sh\necho "Funnel is not enabled on your tailnet. To enable, visit:"\necho "https://login.tailscale.com/f/funnel?node=abc"\nexit 1\n');await chmod(fake,0o755);
 try{
  const logs=[];let exited=false;const tunnel=createTunnel({provider:'tailscale',binary:fake,log:(l,t)=>logs.push([l,t]),onExit:()=>{exited=true;}});
  await tunnel.start(8701);await until(()=>exited);assert.ok(logs.some(([l,t])=>l==='warn'&&/not enabled/i.test(t)));
  const missing=[];let gone=false;const absent=createTunnel({provider:'tailscale',binary:path.join(dir,'nope'),log:(l,t)=>missing.push(t),onExit:()=>{gone=true;}});
  await absent.start(8701);await until(()=>gone);assert.ok(missing.some(t=>/not installed/.test(t)));
  assert.throws(()=>createTunnel({provider:'nope'}),/Unknown tunnel provider/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('a baked server address wins over the page address',()=>{
 assert.equal(serverUrl({host:'a.test',protocol:'https:'},'wss://baked.ts.net/ws'),'wss://baked.ts.net/ws');
 assert.equal(serverUrl({host:'a.test',protocol:'https:'},null),'wss://a.test/ws');
 assert.equal(serverUrl({host:'',protocol:'file:'},'wss://baked.ts.net/ws'),'wss://baked.ts.net/ws');
 assert.equal(serverUrl({host:'',protocol:'file:'},null),null);
});
test('the ngrok tunnel asks for the fixed domain, reports it, and warns about token problems',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'kadkaton-ng-')),fake=path.join(dir,'ngrok'),argsFile=path.join(dir,'args.txt');
 await writeFile(fake,`#!/bin/sh\necho "$@" > "${argsFile}"\necho 't=2026-10-08 lvl=info msg="started tunnel" obj=tunnels name=command_line addr=http://localhost:8701 url=https://my-game.ngrok-free.app'\nsleep 30\n`);await chmod(fake,0o755);
 try{
  const urls=[];const tunnel=createTunnel({provider:'ngrok',binary:fake,url:'https://my-game.ngrok-free.app',onUrl:u=>urls.push(u)});
  await tunnel.start(8701);await until(()=>urls.length>0);assert.equal(urls[0],'https://my-game.ngrok-free.app');
  const {readFile}=await import('node:fs/promises');assert.equal((await readFile(argsFile,'utf8')).trim(),'http --url=https://my-game.ngrok-free.app --log=stdout --log-format=logfmt 8701');
  tunnel.stop();
  await writeFile(fake,'#!/bin/sh\necho "ERROR:  authentication failed: Usage of ngrok requires a verified account and authtoken."\necho "ERR_NGROK_4018"\nexit 1\n');
  const logs=[];let exited=false;const bad=createTunnel({provider:'ngrok',binary:fake,log:(l,t)=>logs.push([l,t]),onExit:()=>{exited=true;}});
  await bad.start(8701);await until(()=>exited);assert.ok(logs.some(([l,t])=>l==='warn'&&/authtoken|4018/i.test(t)));
 }finally{await rm(dir,{recursive:true,force:true});}
});
