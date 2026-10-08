// Builds the game with the matchmaking server address baked in and zips it for sending or uploading.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {rm,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build,configuredServerUrl} from './build.mjs';
const run=promisify(execFile);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function packageGame(){
 const serverUrl=await configuredServerUrl();
 if(!serverUrl)throw new Error('No server address is configured. Copy kadkaton.config.example.json to kadkaton.config.json and put your server address in it (or set KADKATON_SERVER_URL).');
 const output=await build('game',{serverUrl}),archive=path.join(root,'dist','Ebaboba-game.zip');
 await rm(archive,{force:true});
 await run('zip',['-qr',archive,'.'],{cwd:output});
 return {output,archive,serverUrl,size:(await stat(archive)).size};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const result=await packageGame();console.log(`Game folder: ${result.output}\nZip archive: ${result.archive} (${Math.round(result.size/1024)} KB)\nThe build connects to: ${result.serverUrl}`);}
 catch(error){console.error(error.message);process.exit(1);}
}
