// Original seamless chamber-fantasy loop: felt bells, plucked strings, warm bass, soft pulse.
export const MUSIC_SCORE=Object.freeze({bpm:80,bars:16,beatsPerBar:4});
export function composeMusic(sampleRate=22050){
 const beat=60/MUSIC_SCORE.bpm,duration=MUSIC_SCORE.bars*4*beat,length=Math.round(duration*sampleRate);
 const left=new Float32Array(length),right=new Float32Array(length);
 const hz=midi=>440*2**((midi-69)/12);
 function note(midi,start,seconds,volume,pan=0,instrument='pluck'){
  const f=hz(midi),n=Math.round(seconds*sampleRate),offset=Math.round(start*sampleRate),l=Math.sqrt((1-pan)/2),r=Math.sqrt((1+pan)/2);
  for(let i=0;i<n;i++){
   const t=i/sampleRate,u=t/seconds,phase=2*Math.PI*f*t;
   const attack=Math.min(1,t/(instrument==='pad'?.18:.008)),release=Math.min(1,(seconds-t)/.09);
   const envelope=attack*release*(instrument==='pad'?Math.sin(Math.PI*u)**.7:Math.exp(-t*(instrument==='bass'?3:5)));
   const signal=(Math.sin(phase)+.16*Math.sin(phase*2)+.035*Math.sin(phase*3))*envelope*volume,index=(offset+i)%length;
   left[index]+=signal*l;right[index]+=signal*r;
  }
 }
 const chords=[[50,57,60,64],[53,60,64,69],[48,55,62,67],[55,62,65,69],[46,53,60,65],[48,55,62,64],[50,57,60,64],[55,62,65,69]];
 const melody=[[74,77,76,72],[69,72,76,74],[72,74,79,76],[74,69,72,67],[77,76,72,69],[72,76,74,67],[69,72,74,77],[76,74,72,69]];
 for(let bar=0;bar<16;bar++){
  const chord=chords[Math.floor(bar/2)],start=bar*4*beat;
  note(chord[0]-12,start,1.1,.1,0,'bass');note(chord[0]-12,start+2*beat,.9,.065,0,'bass');
  for(let i=1;i<4;i++)note(chord[i],start,2.85,.025,(i-2)*.3,'pad');
  for(let step=0;step<8;step++){const midi=chord[1+[0,1,2,1,0,2,1,2][step]]+12;note(midi,start+step*beat/2,.48,.031+(step%2===0?.009:0),step%2?-.32:.32);}
  const phrase=melody[Math.floor(bar/2)];
  for(let i=0;i<2;i++)note(phrase[(bar%2)*2+i],start+(i*2+.5)*beat,.8,.05,Math.sin(bar)*.2,'bell');
  // Rounded pulse replaces bright cymbals, leaving space for spell transients.
  for(let i=0;i<2;i++)note(38,start+i*2*beat,.14,.025,0,'bass');
 }
 let peak=0;for(let i=0;i<length;i++)peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));
 const scale=.2/Math.max(.2,peak);for(let i=0;i<length;i++){left[i]*=scale;right[i]*=scale;}
 return {left,right,duration,sampleRate};
}
export function createMusic(context){
 let buffer=null,source=null;
 const gain=context.createGain();gain.gain.value=0;
 const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=2400;gain.connect(filter);filter.connect(context.destination);
 return {
  setActive(active,muted=false){
   if(active&&!source){
    if(!buffer){const score=composeMusic();buffer=context.createBuffer(2,score.left.length,score.sampleRate);buffer.getChannelData(0).set(score.left);buffer.getChannelData(1).set(score.right);}
    source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(gain);source.start();
   }
   const now=context.currentTime;gain.gain.cancelScheduledValues(now);gain.gain.setTargetAtTime(active&&!muted?.2:0,now,.15);
   if(!active&&source){const old=source;source=null;old.stop(now+.5);old.onended=()=>old.disconnect();}
  }
 };
}
