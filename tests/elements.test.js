import test from 'node:test';
import assert from 'node:assert/strict';
import {WANDS} from '../src/wands.js';
import {ELEMENT_STYLES,drawElementProjectile,drawElementEffect,drawMote} from '../src/elements.js';
import {createAudio} from '../src/audio.js';

test('every wand has a material and all decorative paths use finite geometry',()=>{
 assert.deepEqual(Object.keys(ELEMENT_STYLES).sort(),Object.keys(WANDS).sort());
 const ctx=new Proxy({}, {get:(obj,key)=>obj[key]??((...args)=>{for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n),`${key}: ${n}`);if(key==='arc')assert.ok(args[2]>=0);if(key==='ellipse')assert.ok(args[2]>=0&&args[3]>=0);})});
 for(const [type,style] of Object.entries(ELEMENT_STYLES)){
  drawMote(ctx,style.shape,4);
  for(const radius of [.001,6,220])drawElementProjectile(ctx,{id:5,x:0,y:0,radius,angle:1,spellType:type},.25);
  for(const kind of ['fireWave','stormCloud','lightningLine','prismRay','vines','mirror','gravityWell','voidRift','crystalTrap','skyStrike'])drawElementEffect(ctx,{kind,spellType:type,x:0,y:0,x2:100,y2:50,radius:20,duration:.5,life:.25},.25);
 }
});
test('audio materials schedule bounded, finite envelopes and mute stops new voices',()=>{
 const oldWindow=globalThis.window,started=[];
 const param=()=>({value:0,setValueAtTime(v){assert.ok(Number.isFinite(v));},exponentialRampToValueAtTime(v){assert.ok(v>0&&Number.isFinite(v));}});
 const node=()=>({gain:param(),frequency:param(),Q:{},playbackRate:{},threshold:{},ratio:{},attack:{},release:{},connect(){},disconnect(){},start(){started.push(this);},stop(){}});
 class Context{constructor(){this.state='running';this.currentTime=0;this.sampleRate=8000;this.destination={};}createBuffer(_,length){return {getChannelData:()=>new Float32Array(length)};}createGain(){return node();}createBiquadFilter(){return node();}createDynamicsCompressor(){return node();}createOscillator(){return node();}createBufferSource(){return node();}}
 globalThis.window={AudioContext:Context};
 try{const audio=createAudio();audio.unlock();for(const type of Object.keys(WANDS)){audio.play('cast',type,1);audio.play('hit',type,1);audio.play('ready',type,1);}assert.ok(started.length>0&&started.length<=28);const count=started.length;audio.toggle();audio.play('hit','earth');assert.equal(started.length,count);}
 finally{if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;}
});
