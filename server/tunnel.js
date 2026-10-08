// Optional public tunnel (Cloudflare quick tunnel) in front of the game server port.
import {spawn} from 'node:child_process';
const URL_PATTERN=/https:\/\/[a-z0-9-]+\.trycloudflare\.com/;
export function createTunnel({log=()=>{},onUrl=()=>{},onExit=()=>{}}){
 let child=null;
 return {
  get running(){return child!==null;},
  start(port){
   if(child)return;
   child=spawn('cloudflared',['tunnel','--no-autoupdate','--url',`http://127.0.0.1:${port}`],{stdio:['ignore','pipe','pipe']});
   const read=data=>{for(const line of data.toString().split('\n')){const text=line.trim();if(!text)continue;const match=text.match(URL_PATTERN);if(match)onUrl(match[0]);log('debug',`cloudflared: ${text}`);}};
   child.stdout.on('data',read);child.stderr.on('data',read);
   child.on('error',error=>{log('error',error.code==='ENOENT'?'cloudflared is not installed or not in PATH.':`cloudflared failed: ${error.message}`);child=null;onExit();});
   child.on('exit',code=>{if(child){log('warn',`cloudflared exited (code ${code}).`);child=null;onExit();}});
  },
  stop(){if(!child)return;const process=child;child=null;process.kill('SIGTERM');}
 };
}
