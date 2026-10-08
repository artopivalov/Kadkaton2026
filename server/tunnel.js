// Optional public address in front of the game server port.
// cloudflare: a quick tunnel, new address on every start. tailscale: Funnel and ngrok: one fixed address that can be baked into a build.
import {spawn} from 'node:child_process';
import {access} from 'node:fs/promises';
const PROVIDERS={

 ngrok:{
  binary:'ngrok',alternatives:['/opt/homebrew/bin/ngrok','/usr/local/bin/ngrok'],missing:'ngrok is not installed. Install it with "brew install --cask ngrok" and add your auth token (see README).',
  // The static domain is requested explicitly; without one ngrok picks a temporary address.
  args:(port,{url})=>['http',...(url?[`--url=${url}`]:[]),'--log=stdout','--log-format=logfmt',String(port)],
  pattern:/https:\/\/[a-z0-9.-]+\.ngrok(?:-free)?\.(?:app|dev|io)/,
  hint:/err_ngrok|authtoken|authentication failed|lvl=(?:eror|crit)|failed to/i
 },
 cloudflare:{
  binary:'cloudflared',missing:'cloudflared is not installed or not in PATH.',
  args:port=>['tunnel','--no-autoupdate','--url',`http://127.0.0.1:${port}`],pattern:/https:\/\/[a-z0-9-]+\.trycloudflare\.com/
 },
 tailscale:{
  binary:'tailscale',alternatives:['/Applications/Tailscale.app/Contents/MacOS/Tailscale'],
  missing:'Tailscale is not installed. Install the Tailscale app, sign in, and enable Funnel (see README).',
  args:port=>['funnel',String(port)],pattern:/https:\/\/[a-z0-9.-]+\.ts\.net/,
  // The CLI says what to do when Funnel is off or the user is signed out; these lines are shown as warnings.
  hint:/funnel is not enabled|not logged in|logged out|not enabled on your tailnet|login\.tailscale\.com/i
 }
};
export const providerNames=Object.keys(PROVIDERS);
async function resolveBinary(provider){
 for(const candidate of provider.alternatives??[]){try{await access(candidate);return candidate;}catch{}}
 return provider.binary;
}
export function createTunnel({provider='cloudflare',binary=null,url=null,log=()=>{},onUrl=()=>{},onExit=()=>{}}){
 const spec=PROVIDERS[provider];if(!spec)throw new Error(`Unknown tunnel provider: ${provider}`);
 let child=null;
 return {
  provider,
  get running(){return child!==null;},
  async start(port){
   if(child)return;
   const command=binary??await resolveBinary(spec);
   const process=spawn(command,spec.args(port,{url}),{stdio:['ignore','pipe','pipe']});child=process;
   const read=data=>{for(const line of data.toString().split('\n')){const text=line.trim();if(!text)continue;const match=text.match(spec.pattern);if(match)onUrl(match[0]);log(spec.hint?.test(text)?'warn':'debug',`${provider}: ${text}`);}};
   process.stdout.on('data',read);process.stderr.on('data',read);
   process.on('error',error=>{if(child!==process)return;log('error',error.code==='ENOENT'?spec.missing:`${provider} failed: ${error.message}`);child=null;onExit();});
   process.on('exit',code=>{if(child!==process)return;log('warn',`${provider} exited (code ${code}).`);child=null;onExit();});
  },
  stop(){if(!child)return;const process=child;child=null;process.kill('SIGTERM');}
 };
}
