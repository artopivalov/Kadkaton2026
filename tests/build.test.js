import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,access} from 'node:fs/promises';
import path from 'node:path';
import {build,toSocketUrl} from '../scripts/build.mjs';
test('three builds share identical menu and game artifact excludes the debug scene',async()=>{
 const debug=await build('debug'),game=await build('game'),generation=await build('generation');
 assert.deepEqual(await readdir(path.join(generation,'src/scenes')),['generation.js','lobby.js']);
 assert.equal(await readFile(path.join(game,'index.html'),'utf8'),await readFile(path.join(debug,'index.html'),'utf8'));
 assert.equal(await readFile(path.join(game,'index.html'),'utf8'),await readFile(path.join(generation,'index.html'),'utf8'));
 assert.deepEqual(await readdir(path.join(game,'src/scenes')),['lobby.js']);
 assert.deepEqual(await readdir(path.join(debug,'src/scenes')),['debug.js','lobby.js']);
 assert.match(await readFile(path.join(game,'src/scene.js'),'utf8'),/lobby\.js/);
 assert.doesNotMatch(await readFile(path.join(game,'src/simulation.js'),'utf8'),/Wand playground/);
 // Every relative module dependency in the distributed entry graph must exist.
 for(const output of [debug,game,generation]){
  const seen=new Set();
  async function check(file){
   if(seen.has(file))return;seen.add(file);const source=await readFile(file,'utf8');
   for(const match of source.matchAll(/(?:from\s+|import\s*)['"](\.[^'"]+)['"]/g)){
    const dependency=path.resolve(path.dirname(file),match[1]);await access(dependency);await check(dependency);
   }
  }
  await check(path.join(output,'src/main.js'));
 }
});

test('a configured server address is baked into every page of the build, otherwise none',async()=>{
 const {mkdtemp,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');
 const dist=await mkdtemp(path.join(tmpdir(),'kadkaton-dist-'));
 try{
  const baked=await build('game',{serverUrl:'https://my-mac.example.ts.net',dist});
  assert.match(await readFile(path.join(baked,'src/net/config.js'),'utf8'),/SERVER_URL="wss:\/\/my-mac\.example\.ts\.net\/ws"/);
  assert.equal(JSON.parse(await readFile(path.join(baked,'build-info.json'),'utf8')).serverUrl,'wss://my-mac.example.ts.net/ws');
  const plain=await build('debug',{serverUrl:null,dist});
  assert.match(await readFile(path.join(plain,'src/net/config.js'),'utf8'),/SERVER_URL=null/);
  assert.throws(()=>toSocketUrl('ftp://nope'),/http\(s\) or ws\(s\)/);
  assert.equal(toSocketUrl('Host.ts.net'),'wss://host.ts.net/ws');assert.equal(toSocketUrl('http://localhost:8701'),'ws://localhost:8701/ws');assert.equal(toSocketUrl(''),null);
 }finally{await rm(dist,{recursive:true,force:true});}
});
