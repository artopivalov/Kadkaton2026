import {mkdir,writeFile,copyFile,access,rm,rename,mkdtemp} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function build(variant){
 if(!['debug','game','generation'].includes(variant))throw new Error('Build variant must be debug, game or generation.');
 const dist=path.join(root,'dist'),output=path.join(dist,variant);await mkdir(dist,{recursive:true});
 try{await access(output);await access(path.join(output,'.kadkaton-build'));}catch(error){
  try{await access(output);throw new Error(`Refusing to replace unmanaged build directory: ${output}`);}catch(missing){if(missing.code!=='ENOENT')throw missing;}
 }
 const staging=await mkdtemp(path.join(dist,`.${variant}-`));
 try{
  await mkdir(path.join(staging,'src/scenes'),{recursive:true});await mkdir(path.join(staging,'src/net'),{recursive:true});
  for(const file of ['index.html','style.css','src/main.js','src/simulation.js','src/balance.js','src/rng.js','src/wands.js','src/items.js','src/enemies.js','src/spells.js','src/renderer.js','src/generator.js','src/locations.js','src/scenes/lobby.js','src/net/codec.js','src/net/snapshot.js','src/net/host.js','src/net/client.js','src/net/matchmaking.js','src/net/rtc.js'])await copyFile(path.join(root,file),path.join(staging,file));
  const scene=variant==='debug'?'debug':variant==='generation'?'generation':'lobby';
  await copyFile(path.join(root,`src/scenes/${scene}.js`),path.join(staging,`src/scenes/${scene}.js`));
  await writeFile(path.join(staging,'src/scene.js'),`export {createScene} from './scenes/${scene}.js';\n`);
  await writeFile(path.join(staging,'.kadkaton-build'),variant+'\n');
  await writeFile(path.join(staging,'build-info.json'),JSON.stringify({variant,scene},null,2)+'\n');
  // The managed marker was checked above; no unrelated files are removed.
  await rm(output,{recursive:true,force:true});await rename(staging,output);
 }catch(error){await rm(staging,{recursive:true,force:true});throw error;}
 return output;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const variant=process.argv[2]||'all';for(const target of variant==='all'?['debug','game','generation']:[variant])console.log(`Built ${target}: ${await build(target)}`);
}
