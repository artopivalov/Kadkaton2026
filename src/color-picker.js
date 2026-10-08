export function hsvToHex(h,s,v){
 const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;
 const rgb=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
 return '#'+rgb.map(n=>Math.round((n+m)*255).toString(16).padStart(2,'0')).join('');
}
export function hexToHsv(hex){
 const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
 let h=d===0?0:max===r?60*((g-b)/d%6):max===g?60*((b-r)/d+2):60*((r-g)/d+4);
 return {h:(h+360)%360,s:max===0?0:d/max,v:max};
}
export function createColorPicker(canvas,hue,input,onChange){
 let color=hexToHsv(input.value),pointer=null;const ctx=canvas.getContext('2d');
 function draw(){
  const {width:w,height:h}=canvas;ctx.fillStyle=hsvToHex(color.h,1,1);ctx.fillRect(0,0,w,h);
  const white=ctx.createLinearGradient(0,0,w,0);white.addColorStop(0,'#fff');white.addColorStop(1,'#ffffff00');ctx.fillStyle=white;ctx.fillRect(0,0,w,h);
  const black=ctx.createLinearGradient(0,0,0,h);black.addColorStop(0,'#00000000');black.addColorStop(1,'#000');ctx.fillStyle=black;ctx.fillRect(0,0,w,h);
  const x=color.s*w,y=(1-color.v)*h;ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.strokeStyle='#18252d';ctx.lineWidth=4;ctx.stroke();ctx.strokeStyle='#fff5da';ctx.lineWidth=2;ctx.stroke();
  canvas.setAttribute('aria-label',`Free color palette, selected ${input.value}. Arrow keys change saturation and brightness.`);
 }
 function commit(){input.value=hsvToHex(color.h,color.s,color.v);draw();onChange();}
 function choose(event){const r=canvas.getBoundingClientRect();color.s=Math.max(0,Math.min(1,(event.clientX-r.left)/r.width));color.v=1-Math.max(0,Math.min(1,(event.clientY-r.top)/r.height));commit();}
 canvas.addEventListener('pointerdown',e=>{if(pointer!==null)return;e.preventDefault();canvas.focus();pointer=e.pointerId;canvas.setPointerCapture(pointer);choose(e);});
 canvas.addEventListener('pointermove',e=>{if(e.pointerId===pointer)choose(e);});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{if(e.pointerId===pointer)pointer=null;});
 canvas.addEventListener('keydown',e=>{const step=e.shiftKey?.1:.01;if(e.key==='ArrowLeft')color.s=Math.max(0,color.s-step);else if(e.key==='ArrowRight')color.s=Math.min(1,color.s+step);else if(e.key==='ArrowUp')color.v=Math.min(1,color.v+step);else if(e.key==='ArrowDown')color.v=Math.max(0,color.v-step);else return;e.preventDefault();e.stopPropagation();commit();});
 hue.value=color.h;hue.addEventListener('input',()=>{color.h=Number(hue.value);commit();});draw();
}
