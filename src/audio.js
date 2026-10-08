import {createMusic} from './music.js';
import {elementStyle} from './elements.js';
// Layered material sounds with a bounded voice budget and no gameplay randomness.
export function createAudio(){
 let context=null,master=null,noise=null,voices=0,voiceLimit=22,muted=false;
 let music=null,musicActive=false;
 const last=new Map();
 try{muted=localStorage.getItem('kadkaton.muted')==='true';}catch{}
 function unlock(){try{
  if(!context){
   context=new (window.AudioContext||window.webkitAudioContext)();noise=context.createBuffer(1,Math.floor(context.sampleRate*.6),context.sampleRate);
   const data=noise.getChannelData(0);let value=0;for(let i=0;i<data.length;i++){value=(value+.12*(Math.random()*2-1))/1.12;data[i]=value*2.8;}
   master=context.createGain();master.gain.value=muted?0:.38;
   const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=4800;
   const compressor=context.createDynamicsCompressor();compressor.threshold.value=-18;compressor.ratio.value=4;compressor.attack.value=.004;compressor.release.value=.15;
   master.connect(filter);filter.connect(compressor);compressor.connect(context.destination);
  }
  if(context.state==='suspended')context.resume().catch(()=>{});
  if(musicActive){music??=createMusic(context);music.setActive(true,muted);}
 }catch{}}
 function voice(source,nodes,at,duration,gain){
  if(voices>=voiceLimit)return;
  const envelope=context.createGain();envelope.gain.setValueAtTime(.0001,at);envelope.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),at+.004);envelope.gain.exponentialRampToValueAtTime(.0001,at+duration);
  let tail=source;for(const node of nodes){tail.connect(node);tail=node;}tail.connect(envelope);envelope.connect(master);
  voices++;source.onended=()=>{voices--;source.disconnect();for(const node of nodes)node.disconnect();envelope.disconnect();};source.start(at);source.stop(at+duration+.015);
 }
 function tone(f,end,duration,gain,at){
  if(voices>=voiceLimit)return;
  const o=context.createOscillator();o.type='sine';o.frequency.setValueAtTime(Math.max(35,Math.min(1400,f)),at);o.frequency.exponentialRampToValueAtTime(Math.max(35,Math.min(1400,end)),at+duration);voice(o,[],at,duration,gain);
 }
 function texture(spec,duration,gain,at){
  if(voices>=voiceLimit)return;
  const source=context.createBufferSource(),filter=context.createBiquadFilter();source.buffer=noise;source.playbackRate.value=.93+Math.random()*.14;
  filter.type=spec[2];filter.Q.value=spec[2]==='bandpass'?1.4:.6;filter.frequency.setValueAtTime(spec[0],at);filter.frequency.exponentialRampToValueAtTime(spec[1],at+duration);voice(source,[filter],at,duration,gain);
 }
 return {unlock,setMusicActive(active){musicActive=active;if(context&&active)music??=createMusic(context);music?.setActive(active,muted);},get muted(){return muted;},toggle(){muted=!muted;if(master)master.gain.value=muted?0:.38;music?.setActive(musicActive,muted);try{localStorage.setItem('kadkaton.muted',String(muted));}catch{}return muted;},
 play(kind,type,power=1,volume=1){
  if(!context||context.state!=='running'||muted||voices>=(kind==='hurt'?28:22))return;
  voiceLimit=kind==='hurt'?28:22;
  const now=context.currentTime,key=kind+type;if(now-(last.get(key)??-1)<(kind==='trail'?.14:.055))return;last.set(key,now);
  const material=elementStyle(type),weight=Math.max(.08,Math.min(1.5,power)),gain=volume*(.3+.7*weight),hit=kind==='hit';
  if(kind==='hurt'){
   tone(145,55,.19,.19*gain,now);texture([1300,260,'lowpass'],.095,.11*gain,now);tone(210,105,.12,.065*gain,now+.025);return;
  }
  if(kind==='ready'){tone(material.tone,material.tone,.11,.045*volume,now);tone(material.tone*1.25,material.tone*1.25,.1,.025*volume,now+.045);return;}
  if(kind==='charge'){texture(material.noise,.09,.025*volume,now);tone(material.tone*.75,material.tone*.55,.1,.035*volume,now);return;}
  if(kind==='trail'){texture(material.noise,.065,.012*volume,now);return;}
  const duration=hit?.16:.13+.07*weight;
  texture(material.noise,duration,.065*gain,now);
  tone(material.tone*(hit?.75:1)*(1+(Math.random()-.5)*.06),material.tone*(hit?.32:.55),duration,.105*gain,now);
  tone(material.body,material.body*.6,.14+.055*weight,.095*gain,now+.008);
  if(['ice','crystal','mirror'].includes(type)){
   for(let i=0;i<3;i++)texture([2800+i*420,1600,'bandpass'],.025,.033*gain,now+i*.025);
   tone(material.tone*1.5,material.tone,.12,.028*gain,now+.015);
  }else if(['lightning','storm','prism'].includes(type)){
   for(let i=0;i<3;i++)texture([2300-i*300,750,'bandpass'],.028,.04*gain,now+i*.022);
  }else if(['fire','comet'].includes(type)){
   texture([2600,850,'bandpass'],.18,.032*gain,now+.04);
  }else if(['gravity','void'].includes(type)){
   tone(material.tone*1.5,material.body,.24,.045*gain,now+.025);
  }else if(['light','orbit','test'].includes(type)){
   tone(material.tone*1.25,material.tone,.15,.037*gain,now+.045);
  }else if(type==='nature'){texture([2100,550,'bandpass'],.045,.045*gain,now+.025);texture([1450,400,'bandpass'],.055,.03*gain,now+.06);}
  else if(type==='earth'){texture([900,180,'lowpass'],.08,.075*gain,now+.02);tone(88,40,.2,.055*gain,now+.035);}
  else if(type==='air')texture([1100,300,'bandpass'],.2,.045*gain,now+.03);
  else if(type==='blood')texture([750,240,'bandpass'],.065,.055*gain,now+.02);
 }
 };
}
