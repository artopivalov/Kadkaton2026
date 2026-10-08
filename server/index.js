// Launcher: serves the control panel, and starts or stops the matchmaking server from it.
// Closing the panel tab stops everything, so the server never runs unattended.
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {readFile,access} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {WebSocketServer} from 'ws';
import {createMatchmaker} from './matchmaker.js';
import {createGameServer} from './game-server.js';
import {createTunnel} from './tunnel.js';
const here=path.dirname(fileURLToPath(import.meta.url));
const project=path.resolve(here,'..');
const LOG_LIMIT=500;
export function createLauncher({tunnelProvider='cloudflare',bakedUrl=null,controlPort=8700,gamePort=8701,gameRoot=path.join(project,'dist/game'),build=null,grace=3000,onShutdown=()=>{}}={}){
 const panels=new Set(),logs=[];
 let control=null,controlSockets=null,graceTimer=null,publicUrl=null,tunnelWanted=false,rooms=[],clients=0,startedAt=null,gamePortInUse=null;
 const send=(socket,message)=>{if(socket.readyState===1)socket.send(JSON.stringify(message));};
 const broadcast=message=>{for(const panel of panels)send(panel,message);};
 const log=(level,text)=>{
  const entry={time:new Date().toISOString().slice(11,19),level,text};logs.push(entry);if(logs.length>LOG_LIMIT)logs.shift();
  if(level!=='debug')console.log(`[${entry.time}] ${level.toUpperCase()} ${text}`);broadcast({t:'log',...entry});
 };
 const matchmaker=createMatchmaker({log});
 const game=createGameServer({root:gameRoot,matchmaker,log});
 const tunnel=createTunnel({provider:tunnelProvider,url:bakedUrl?`https://${new URL(bakedUrl).host}`:null,log,onUrl:url=>{if(publicUrl===url)return;publicUrl=url;log('info',`Public URL: ${url}`);if(bakedUrl&&new URL(bakedUrl).host!==new URL(url).host)log('warn',`The public address differs from the one baked into the build (${new URL(bakedUrl).host}). Players with that build will not find this server.`);else if(bakedUrl)log('info','Matches the address baked into the build.');broadcastState();},onExit:()=>{publicUrl=null;broadcastState();}});
 matchmaker.hooks.onRooms=list=>{rooms=list;broadcast({t:'rooms',rooms});};
 matchmaker.hooks.onClients=count=>{clients=count;broadcast({t:'clients',clients});};
 const lanUrls=()=>Object.values(os.networkInterfaces()).flat().filter(i=>i&&i.family==='IPv4'&&!i.internal).map(i=>`http://${i.address}:${gamePortInUse}/`);
 const state=()=>({t:'state',tunnelProvider,bakedUrl,running:game.running,localUrl:game.running?`http://localhost:${gamePortInUse}/`:null,lanUrls:game.running?lanUrls():[],publicUrl,tunnel:tunnel.running,tunnelWanted,startedAt,rooms,clients});
 const broadcastState=()=>broadcast(state());
 async function start({withTunnel}){
  if(game.running){log('warn','The server is already running.');return;}
  try{
   if(build){try{await build('game');log('info','Game build is up to date.');}catch(error){log('warn',`Build failed (${error.message}); using the existing build if there is one.`);}}
   await access(path.join(gameRoot,'index.html'));
  }catch{log('error',`No game build found in ${gameRoot}. Run "npm run build:game" first.`);broadcastState();return;}
  try{gamePortInUse=await game.start(gamePort);}catch(error){log('error',error.code==='EADDRINUSE'?`Port ${gamePort} is already in use.`:`Could not start: ${error.message}`);broadcastState();return;}
  startedAt=Date.now();tunnelWanted=Boolean(withTunnel);log('info',`Server started on port ${gamePortInUse}.`);
  if(tunnelWanted){log('info',`Starting public tunnel (${tunnelProvider})...`);await tunnel.start(gamePortInUse);}
  broadcastState();
 }
 async function stop(){
  if(!game.running)return;
  tunnel.stop();publicUrl=null;tunnelWanted=false;await game.stop();startedAt=null;rooms=[];clients=0;
  log('info','Server stopped.');broadcast({t:'rooms',rooms});broadcastState();
 }
 async function shutdown(){await stop();controlSockets?.close();for(const panel of panels)panel.terminate();await new Promise(resolve=>{if(!control)return resolve();control.close(()=>resolve());control.closeAllConnections?.();});control=null;onShutdown();}
 function allowedHost(value){const host=String(value??'').replace(/:\d+$/,'');return host==='localhost'||host==='127.0.0.1';}
 return {
  get port(){return control?.address()?.port??null;},
  get gameRunning(){return game.running;},
  get gamePort(){return gamePortInUse;},
  start,stop,shutdown,logs,killTunnel(){tunnel.stop();},
  listen(){
   return new Promise((resolve,reject)=>{
    control=http.createServer(async(request,response)=>{
     // Only the local machine may reach the panel; this also blocks DNS rebinding.
     if(!allowedHost(request.headers.host)){response.writeHead(403).end('Forbidden');return;}
     if(request.url==='/'||request.url==='/index.html'){response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});response.end(await readFile(path.join(here,'panel.html')));return;}
     if(request.url==='/launcher.html'){response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});response.end((await readFile(path.join(project,'launcher.html'),'utf8')).replaceAll('__GAME_PORT__',String(gamePort)));return;}
     // Expose only generated builds, never arbitrary project files.
     try{
      const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
      if(/^\/dist\/(debug|game|generation)\//.test(pathname)){
       const root=path.join(project,'dist'),file=path.resolve(root,'.'+pathname.slice(5)+(pathname.endsWith('/')?'index.html':''));
       if(!file.startsWith(root+path.sep)){response.writeHead(403).end('Forbidden');return;}
       const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
       const data=await readFile(file);response.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});response.end(data);return;
      }
     }catch{}
     response.writeHead(404).end('Not found');
    });
    controlSockets=new WebSocketServer({noServer:true,maxPayload:4096});
    control.on('upgrade',(request,socket,head)=>{
     // A web page from another origin must not be able to drive the panel.
     const origin=request.headers.origin;let originOk=false;
     try{originOk=Boolean(origin)&&allowedHost(new URL(origin).host)&&new URL(origin).port===String(control.address().port);}catch{}
     if(request.url!=='/control'||!allowedHost(request.headers.host)||!originOk){socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');socket.destroy();return;}
     controlSockets.handleUpgrade(request,socket,head,ws=>controlSockets.emit('connection',ws));
    });
    controlSockets.on('connection',socket=>{
     clearTimeout(graceTimer);graceTimer=null;panels.add(socket);
     send(socket,{t:'hello',logs});send(socket,state());
     socket.on('message',data=>{
      let message;try{message=JSON.parse(data.toString());}catch{return;}
      if(message.t==='start')start({withTunnel:message.tunnel});else if(message.t==='stop')stop();
     });
     socket.on('close',()=>{
      panels.delete(socket);
      if(panels.size===0){graceTimer=setTimeout(async()=>{log('info','Panel closed; shutting down.');await shutdown();},grace);}
     });
     socket.on('error',()=>{});
    });
    control.once('error',reject);
    control.listen(controlPort,'127.0.0.1',()=>resolve(control.address().port));
   });
  }
 };
}
// Command line entry point.
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const {build,configuredServerUrl}=await import('../scripts/build.mjs');
 const bakedUrl=await configuredServerUrl();
 const tunnelArg=process.argv.find(a=>a.startsWith('--tunnel='))?.split('=')[1];
 // The address baked into the build picks the tunnel: ngrok or Tailscale domains are fixed, Cloudflare quick tunnels are temporary.
 const bakedHost=bakedUrl?new URL(bakedUrl).hostname:'';
 const tunnelProvider=tunnelArg??(/\.ngrok(-free)?\.(app|dev|io)$/.test(bakedHost)?'ngrok':bakedHost.endsWith('.ts.net')?'tailscale':'cloudflare');
 if(process.argv.includes('--launcher'))for(const variant of ['debug','game','generation'])await build(variant);
 const controlPort=Number(process.env.KADKATON_CONTROL_PORT)||8700,gamePort=Number(process.env.KADKATON_GAME_PORT)||8701;
 const launcher=createLauncher({controlPort,gamePort,build,tunnelProvider,bakedUrl,onShutdown:()=>process.exit(0)});
 if(bakedUrl)console.log(`Builds connect to: ${bakedUrl}`);
 try{await launcher.listen();}catch(error){console.error(error.code==='EADDRINUSE'?`Port ${controlPort} is busy. Is the control panel already open?`:error.message);process.exit(1);}
 const url=`http://localhost:${controlPort}/${process.argv.includes('--launcher')?'launcher.html':''}`;console.log(`Control panel: ${url}\nClose the panel tab to stop the server.`);
 process.on('exit',()=>launcher.killTunnel());
 if(process.argv.includes('--autostart'))await launcher.start({withTunnel:process.argv.some(a=>a==='--tunnel'||a.startsWith('--tunnel='))});
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await launcher.shutdown();});
 if(!process.argv.includes('--no-open')&&process.platform==='darwin')spawn('open',[url],{stdio:'ignore',detached:true}).unref();
 else if(!process.argv.includes('--no-open')&&process.platform==='win32')spawn('cmd',['/c','start','',url],{stdio:'ignore',detached:true}).unref();
 else if(!process.argv.includes('--no-open'))spawn('xdg-open',[url],{stdio:'ignore',detached:true}).unref();
}
