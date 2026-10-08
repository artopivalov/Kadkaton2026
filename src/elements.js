// Visual and sonic materials shared by cast, impact, charge, and projectile feedback.
const style=(shape,palette,tone,body,noise,spin=0,drag=4)=>({shape,palette,tone,body,noise,spin,drag});
export const ELEMENT_STYLES=Object.freeze({
 fire:style('ember',['#ff7638','#ffc458','#fff0bb'],210,75,[1600,350,'lowpass'],1,3),
 ice:style('shard',['#89e7ff','#d5f8ff','#68b6f4'],720,190,[3400,1700,'bandpass'],3,5),
 lightning:style('bolt',['#fff4a1','#fffbe4','#dbb65b'],430,110,[2800,650,'bandpass'],0,7),
 air:style('wisp',['#a4ffc9','#e3fff3','#71c7c7'],160,65,[1400,350,'bandpass'],2,2),
 earth:style('stone',['#c7a681','#f2d3a4','#897a68'],125,55,[800,180,'lowpass'],4,6),
 nature:style('leaf',['#75d779','#d1f2a2','#4a9f65'],290,100,[1800,700,'bandpass'],3,3),
 gravity:style('star',['#a59eff','#e2ddff','#6b61b8'],145,60,[650,240,'bandpass'],-4,2),
 light:style('star',['#fff7bd','#fffbea','#f4d878'],520,180,[1700,650,'bandpass'],1,4),
 crystal:style('shard',['#f5a6ef','#fff0ff','#bd77d6'],660,220,[3200,1300,'bandpass'],4,5),
 blood:style('drop',['#f45f85','#ffb0bd','#af3e64'],185,70,[1000,250,'lowpass'],0,3),
 storm:style('bolt',['#a5c4ff','#e9f2ff','#7892df'],350,90,[2400,500,'bandpass'],1,6),
 void:style('mote',['#ae73de','#dab5ff','#593b86'],105,48,[450,140,'bandpass'],-3,2),
 mirror:style('diamond',['#c3f4ff','#ffffff','#8bbaca'],580,210,[2800,1100,'bandpass'],5,4),
 orbit:style('star',['#f5d292','#fff2c9','#df9b55'],340,130,[1800,800,'bandpass'],5,3),
 comet:style('ember',['#ffd07c','#fff1c1','#f28c49'],145,55,[1800,300,'lowpass'],2,2),
 prism:style('diamond',['#99ffea','#ffa6df','#a5beff','#ffefab'],610,190,[2300,1000,'bandpass'],3,4),
 test:style('star',['#ecb9ff','#fff0aa','#aaffde','#ffa8cb'],450,160,[1800,650,'bandpass'],4,3)
});
const TYPES={fire:'fire',icicle:'ice',coldWave:'ice',whirlwind:'air',boulder:'earth',thorn:'nature',gravityOrb:'gravity',lightDisc:'light',crystalShard:'crystal',bloodBolt:'blood',bloodNeedle:'blood',voidOrb:'void',mirrorShard:'mirror',orbitBolt:'orbit',comet:'comet',meteorDebris:'comet',spark:'test',fireWave:'fire',airSphere:'air',testSphere:'test',iceImpact:'ice',airImpact:'air',sparkImpact:'test',skyStrike:'lightning',lightningLine:'lightning',stormLine:'storm',prismRay:'prism',mirror:'mirror',prism:'prism',satellite:'orbit',stormCloud:'storm',voidRift:'void',voidImpact:'void',meteorWarning:'comet',cometImpact:'comet',vines:'nature',gravityWell:'gravity',crystalTrap:'crystal',crystalImpact:'crystal'};
export const elementType=object=>object.spellType??TYPES[object.kind]??'fire';
export const elementStyle=type=>ELEMENT_STYLES[type]??ELEMENT_STYLES.test;

export function drawMote(ctx,shape,size){
 ctx.beginPath();
 if(shape==='shard'||shape==='diamond'){ctx.moveTo(size*1.8,0);ctx.lineTo(0,size*.6);ctx.lineTo(-size,0);ctx.lineTo(0,-size*.6);ctx.closePath();ctx.fill();}
 else if(shape==='leaf'){ctx.moveTo(-size,0);ctx.quadraticCurveTo(0,-size*1.5,size,0);ctx.quadraticCurveTo(0,size*1.5,-size,0);ctx.fill();}
 else if(shape==='bolt'){ctx.moveTo(-size*1.4,-size*.5);ctx.lineTo(0,0);ctx.lineTo(-size*.3,size*.4);ctx.lineTo(size*1.7,size*.2);ctx.lineWidth=Math.max(.8,size*.45);ctx.stroke();}
 else if(shape==='wisp'){ctx.arc(0,0,size,-1.4,1.4);ctx.lineWidth=Math.max(.7,size*.4);ctx.stroke();}
 else if(shape==='stone'){ctx.rect(-size,-size*.65,size*1.7,size*1.3);ctx.fill();}
 else if(shape==='star'){for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?size*.3:size;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();}
 else if(shape==='drop'){ctx.moveTo(size*1.7,0);ctx.quadraticCurveTo(-size,-size,-size,0);ctx.quadraticCurveTo(-size,size,size*1.7,0);ctx.fill();}
 else{ctx.arc(0,0,size,0,Math.PI*2);ctx.fill();}
}

export function drawElementProjectile(ctx,b,time){
 if(b.enemy||b.kind==='arrow'||b.kind==='hook')return;
 const type=elementType(b),style=elementStyle(type),r=Math.max(2,Math.min(28,b.radius??6)),phase=time*5+(b.id??0);
 ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.angle??0);
 ctx.fillStyle=style.palette[0];ctx.strokeStyle=style.palette[1];
 ctx.globalAlpha=.1;ctx.beginPath();ctx.arc(0,0,r*1.8,0,Math.PI*2);ctx.fill();
 if(['gravity','void','light','orbit'].includes(type)){
  ctx.globalAlpha=.7;ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,0,r*1.65,r*.65,phase,0,Math.PI*2);ctx.stroke();
 }else if(['lightning','storm'].includes(type)){
  ctx.globalAlpha=.8;ctx.beginPath();ctx.moveTo(-r*3,0);ctx.lineTo(-r*1.6,-r*.7*Math.sin(phase*4));ctx.lineTo(-r, r*.6);ctx.lineTo(r,0);ctx.lineWidth=2;ctx.stroke();
 }
 for(let i=0;i<4;i++){ctx.save();ctx.translate(-r*(1+i*.8),Math.sin(phase+i*2)*r*.55);ctx.rotate(phase*style.spin*.3+i);ctx.globalAlpha=.55-i*.13;ctx.fillStyle=style.palette[i%style.palette.length];ctx.strokeStyle=ctx.fillStyle;drawMote(ctx,style.shape,Math.max(1,r*.32));ctx.restore();}
 ctx.globalAlpha=.8;ctx.fillStyle=style.palette[1];ctx.beginPath();ctx.arc(r*.2,0,Math.max(1,r*.26),0,Math.PI*2);ctx.fill();
 ctx.restore();
}

export function drawElementEffect(ctx,e,time){
 if(e.kind==='dangerImpact')return;
 const type=elementType(e),style=elementStyle(type),age=Math.max(0,e.duration-e.life),r=Math.max(4,Math.min(220,e.radius??20));
 ctx.save();ctx.translate(e.x,e.y);ctx.strokeStyle=style.palette[0];ctx.fillStyle=style.palette[1];ctx.lineWidth=2;
 ctx.globalAlpha=Math.min(.65,e.life/Math.max(.01,e.duration));
 if(['lightningLine','stormLine','prismRay'].includes(e.kind)){
  const dx=e.x2-e.x,dy=e.y2-e.y,d=Math.hypot(dx,dy);ctx.rotate(Math.atan2(dy,dx));
  for(let layer=0;layer<2;layer++){ctx.strokeStyle=style.palette[layer];ctx.lineWidth=layer?2:8;ctx.globalAlpha=layer?.9:.18;ctx.beginPath();ctx.moveTo(0,0);for(let i=1;i<9;i++)ctx.lineTo(d*i/9,Math.sin(i*2.3+age*35)*8*(layer+1));ctx.lineTo(d,0);ctx.stroke();}
 }else if(['gravityWell','voidRift','voidImpact','airSphere','airImpact','fireWave','testSphere'].includes(e.kind)){
  for(let i=0;i<3;i++){const phase=time*(type==='air'?3:-2)+i*2;ctx.strokeStyle=style.palette[i%style.palette.length];ctx.beginPath();ctx.arc(0,0,r*(.35+i*.22),phase,phase+Math.PI*1.2);ctx.stroke();}
 }else if(e.kind==='stormCloud'){
  for(let i=0;i<3;i++){ctx.save();ctx.translate(Math.cos(time+i*2)*r*.5,Math.sin(time+i*2)*r*.35);ctx.strokeStyle=style.palette[i];drawMote(ctx,'bolt',9);ctx.restore();}
 }else if(e.kind==='vines'){
  for(let i=0;i<7;i++){const a=i*2.4;ctx.save();ctx.translate(Math.cos(a)*r*.7,Math.sin(a)*r*.7);ctx.rotate(a+Math.sin(time*2+i)*.15);drawMote(ctx,'leaf',7);ctx.restore();}
 }else if(['mirror','prism','crystalTrap','satellite'].includes(e.kind)){
  for(let i=0;i<4;i++){const a=time*1.5+i*Math.PI/2;ctx.save();ctx.translate(Math.cos(a)*r*.9,Math.sin(a)*r*.9);ctx.rotate(a);ctx.fillStyle=style.palette[i%style.palette.length];drawMote(ctx,style.shape,4);ctx.restore();}
 }else if(!['meteorWarning'].includes(e.kind)){
  for(let i=0;i<8;i++){const a=i*Math.PI/4+age*style.spin;ctx.save();ctx.translate(Math.cos(a)*r*(.4+age),Math.sin(a)*r*(.4+age));ctx.rotate(a);ctx.fillStyle=style.palette[i%style.palette.length];ctx.strokeStyle=ctx.fillStyle;drawMote(ctx,style.shape,3+3*Math.min(1,e.life));ctx.restore();}
 }
 ctx.restore();
}
