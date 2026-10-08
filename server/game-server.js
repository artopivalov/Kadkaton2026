// HTTP server for the built game plus the WebSocket endpoint used for matchmaking.
import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {WebSocketServer} from 'ws';
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.jpg':'image/jpeg','.webp':'image/webp','.txt':'text/plain; charset=utf-8'};
const BURST=60,REFILL_PER_SECOND=30,PING_MS=15000,MAX_PAYLOAD=64*1024;
export function createGameServer({root,matchmaker,log=()=>{}}){
 let server=null,sockets=null,heartbeat=null;
 async function serve(request,response){
  try{
   const url=new URL(request.url,'http://localhost');let relative=decodeURIComponent(url.pathname);
   if(relative.endsWith('/'))relative+='index.html';
   const file=path.resolve(root,'.'+relative);
   // Reject anything outside the game folder, including encoded traversal.
   if(file!==root&&!file.startsWith(root+path.sep)){response.writeHead(403).end('Forbidden');return;}
   const info=await stat(file);if(!info.isFile()){response.writeHead(404).end('Not found');return;}
   response.writeHead(200,{'Content-Type':TYPES[path.extname(file).toLowerCase()]??'application/octet-stream','Cache-Control':'no-cache'});
   response.end(await readFile(file));
  }catch{response.writeHead(404).end('Not found');}
 }
 return {
  get port(){return server?.address()?.port??null;},
  get running(){return server!==null;},
  start(port,host='0.0.0.0'){
   if(server)return Promise.reject(new Error('Game server is already running.'));
   return new Promise((resolve,reject)=>{
    const instance=http.createServer(serve);
    sockets=new WebSocketServer({server:instance,path:'/ws',maxPayload:MAX_PAYLOAD});
    sockets.on('connection',(socket,request)=>{
     const address=request.socket.remoteAddress;let tokens=BURST,last=Date.now();socket.alive=true;
     const id=matchmaker.connect(message=>{if(socket.readyState===1)socket.send(JSON.stringify(message));});
     log('debug',`Client ${id} connected (${address})`);
     socket.on('pong',()=>{socket.alive=true;});
     socket.on('message',data=>{
      const now=Date.now();tokens=Math.min(BURST,tokens+(now-last)/1000*REFILL_PER_SECOND);last=now;
      if(tokens<1){log('warn',`Client ${id} is sending too fast; disconnected`);socket.close(1008,'Rate limit');return;}
      tokens-=1;let message;try{message=JSON.parse(data.toString());}catch{return;}
      matchmaker.receive(id,message);
     });
     socket.on('close',()=>{matchmaker.disconnect(id);log('debug',`Client ${id} disconnected`);});
     socket.on('error',()=>{});
    });
    heartbeat=setInterval(()=>{for(const socket of sockets.clients){if(!socket.alive){socket.terminate();continue;}socket.alive=false;socket.ping();}},PING_MS);
    instance.once('error',error=>{clearInterval(heartbeat);sockets.close();sockets=null;reject(error);});
    instance.listen(port,host,()=>{server=instance;resolve(instance.address().port);});
   });
  },
  stop(){
   if(!server)return Promise.resolve();
   clearInterval(heartbeat);const instance=server;server=null;
   for(const socket of sockets.clients)socket.terminate();sockets.close();sockets=null;
   return new Promise(resolve=>{instance.close(()=>resolve());instance.closeAllConnections?.();});
  }
 };
}
