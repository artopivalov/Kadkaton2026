import {CONFIG} from './balance.js';
import {WANDS,lightningPoint} from './wands.js';
// All artwork stays separate from simulation and can be replaced later.
function circle(ctx,x,y,radius){ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);}
function wand(ctx,x,y,angle,type='fire'){
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.strokeStyle='#d8b97e';ctx.lineWidth=6;
 ctx.beginPath();ctx.moveTo(-12,0);ctx.lineTo(16,0);ctx.stroke();
 ctx.fillStyle=WANDS[type].color;circle(ctx,16,0,5);ctx.fill();ctx.restore();
}
export function drawCharacter(ctx,p){
 ctx.fillStyle=p.color;circle(ctx,p.x,p.y,18);ctx.fill();ctx.fillStyle='#e5ebf6';ctx.beginPath();
 ctx.moveTo(p.x+Math.cos(p.angle)*24,p.y+Math.sin(p.angle)*24);
 ctx.lineTo(p.x+Math.cos(p.angle+2)*12,p.y+Math.sin(p.angle+2)*12);
 ctx.lineTo(p.x+Math.cos(p.angle-2)*12,p.y+Math.sin(p.angle-2)*12);ctx.fill();
 if(p.wand)wand(ctx,p.x+Math.cos(p.angle+.8)*23,p.y+Math.sin(p.angle+.8)*23,p.angle,p.wand.type||'fire');
}
export function renderPreview(ctx,color){
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,160,110);ctx.save();ctx.translate(80,60);ctx.scale(1.3,1.3);
 drawCharacter(ctx,{x:0,y:0,angle:-Math.PI/2,color,wand:{type:'fire'}});ctx.restore();
}
function renderProjectile(ctx,b){
 if(b.kind==='fire'){
  ctx.fillStyle='#ff7638';circle(ctx,b.x,b.y,b.radius);ctx.fill();ctx.fillStyle='#ffe8a4';circle(ctx,b.x,b.y,b.radius*.5);ctx.fill();
 }else if(b.kind==='spark'){
  ctx.fillStyle='#ecb9ff';circle(ctx,b.x,b.y,b.radius);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(b.x-9,b.y);ctx.lineTo(b.x+9,b.y);ctx.moveTo(b.x,b.y-9);ctx.lineTo(b.x,b.y+9);ctx.stroke();
 }else if(b.kind==='whirlwind'){
  ctx.strokeStyle='#a4ffc9';ctx.lineWidth=3;for(let r=5;r<=b.radius;r+=6){circle(ctx,b.x,b.y,r);ctx.stroke();}
 }else if(b.kind==='boulder'){
  ctx.fillStyle='#9c8874';circle(ctx,b.x,b.y,b.radius);ctx.fill();ctx.strokeStyle='#e4c8a6';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(b.x-b.radius*.5,b.y);ctx.lineTo(b.x+b.radius*.3,b.y-b.radius*.5);ctx.stroke();
 }else if(b.kind==='icicle'){
  ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.angle);ctx.fillStyle='#bceeff';ctx.beginPath();ctx.moveTo(b.radius*2,0);ctx.lineTo(-b.radius*2,-b.radius);ctx.lineTo(-b.radius*2,b.radius);ctx.fill();ctx.restore();
 }else if(b.kind==='coldWave'){
  ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.angle);ctx.fillStyle='#8fe4ff40';ctx.strokeStyle='#b8f1ff';ctx.lineWidth=5;
  ctx.beginPath();ctx.ellipse(0,0,b.radius*.28,b.radius,0,-Math.PI/2,Math.PI/2);ctx.fill();ctx.stroke();ctx.restore();
 }
}
function renderEffect(ctx,e){
 const alpha=e.life/e.duration;ctx.save();ctx.globalAlpha=alpha;
 if(e.kind==='lightningLine'){
  ctx.strokeStyle='#fffda2';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x2,e.y2);ctx.stroke();
 }else if(e.kind==='skyStrike'){
  ctx.fillStyle='#fff27940';circle(ctx,e.x,e.y,e.radius);ctx.fill();ctx.strokeStyle='#fffda2';ctx.lineWidth=7;
  ctx.beginPath();ctx.moveTo(e.x+12,e.y-140);ctx.lineTo(e.x-10,e.y-80);ctx.lineTo(e.x+12,e.y-85);ctx.lineTo(e.x,e.y);ctx.stroke();circle(ctx,e.x,e.y,e.radius);ctx.lineWidth=3;ctx.stroke();
 }else{
  const radius=e.kind==='fireWave'?e.radius*(1-alpha*.65):e.radius*(1-alpha*.5);
  if(['fireWave','airSphere','testSphere'].includes(e.kind)){ctx.fillStyle=e.kind==='airSphere'?'#a4ffc940':e.kind==='testSphere'?'#ecb9ff40':'#ff641e50';circle(ctx,e.x,e.y,radius);ctx.fill();}
  ctx.strokeStyle=e.kind==='iceImpact'?'#89e7ff':e.kind==='airSphere'||e.kind==='airImpact'?'#a4ffc9':e.kind==='testSphere'||e.kind==='sparkImpact'?'#ecb9ff':'#ffa947';ctx.lineWidth=e.kind==='fireWave'?8:3;circle(ctx,e.x,e.y,radius);ctx.stroke();
 }
 ctx.restore();
}
export function render(ctx,s,width,height){
 const scale=height/CONFIG.worldHeight*CONFIG.cameraZoom,visibleWidth=width/scale,visibleHeight=height/scale;
 const cameraX=visibleWidth>=CONFIG.worldWidth?(CONFIG.worldWidth-visibleWidth)/2:Math.max(0,Math.min(CONFIG.worldWidth-visibleWidth,s.player.x-visibleWidth/2));
 const cameraY=(CONFIG.worldHeight-visibleHeight)/2;
 ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#161e27';ctx.fillRect(0,0,width,height);
 ctx.setTransform(scale,0,0,scale,-cameraX*scale,-cameraY*scale);ctx.fillStyle='#202a32';ctx.fillRect(0,0,CONFIG.worldWidth,CONFIG.worldHeight);
 ctx.strokeStyle='#31404a';ctx.lineWidth=1;
 for(let x=0;x<=CONFIG.worldWidth;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,CONFIG.worldHeight);ctx.stroke();}
 for(let y=0;y<=CONFIG.worldHeight;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(CONFIG.worldWidth,y);ctx.stroke();}
 ctx.strokeStyle='#6a8290';ctx.lineWidth=8;ctx.strokeRect(4,4,CONFIG.worldWidth-8,CONFIG.worldHeight-8);
 ctx.font='14px system-ui';ctx.textAlign='center';
 for(const t of s.targets){
  ctx.fillStyle='#8e6372';ctx.fillRect(t.x-22,t.y-22,44,44);ctx.strokeStyle='#e8b4c4';ctx.lineWidth=3;ctx.strokeRect(t.x-12,t.y-12,24,24);
  ctx.fillStyle='#d9e3ec';ctx.fillText(`Hits: ${t.hits} · Damage: ${Math.round(t.damage*100)/100}`,t.x,t.y+44);
 }
 for(const wall of s.walls){ctx.fillStyle=wall.permanent?'#526475':'#8c7967';ctx.fillRect(wall.x,wall.y,wall.width,wall.height);ctx.strokeStyle='#decbb1';ctx.lineWidth=2;ctx.strokeRect(wall.x,wall.y,wall.width,wall.height);if(!wall.permanent){ctx.fillStyle='#fff';ctx.fillText(`${Math.ceil(wall.expiresAt-s.time)}s`,wall.x+wall.width/2,wall.y-8);}}
 for(const portal of s.portals){ctx.strokeStyle='#a592ef';ctx.lineWidth=5;circle(ctx,portal.x,portal.y,35);ctx.stroke();ctx.fillStyle='#c4b7ff';ctx.fillText(portal.label,portal.x,portal.y+56);ctx.fillText('Not available yet',portal.x,portal.y+73);}
 for(const pedestal of s.pedestals){ctx.fillStyle='#44505f';ctx.fillRect(pedestal.x-26,pedestal.y-24,52,48);ctx.strokeStyle=WANDS[pedestal.type].color;ctx.lineWidth=3;ctx.strokeRect(pedestal.x-26,pedestal.y-24,52,48);wand(ctx,pedestal.x,pedestal.y,-.5,pedestal.type);ctx.fillStyle=WANDS[pedestal.type].color;ctx.fillText(WANDS[pedestal.type].name,pedestal.x,pedestal.y+43);}
 for(const i of s.items){ctx.strokeStyle=WANDS[i.type].color;ctx.lineWidth=2;circle(ctx,i.x,i.y,26);ctx.stroke();wand(ctx,i.x,i.y,-.5,i.type);ctx.fillStyle=WANDS[i.type].color;ctx.fillText(WANDS[i.type].name,i.x,i.y+43);}
 const p=s.player;drawCharacter(ctx,p);ctx.fillStyle='#fff';ctx.fillText(p.name,p.x,p.y+40);
 if(p.charge){
  ctx.strokeStyle=WANDS[p.wand.type].color;ctx.lineWidth=4;ctx.beginPath();ctx.arc(p.x,p.y,27,-Math.PI/2,-Math.PI/2+Math.PI*2*p.charge);ctx.stroke();
  if(p.wand.type==='lightning'&&p.mode==='Special'){
   const point=lightningPoint(p);ctx.setLineDash([6,8]);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(point.x,point.y);ctx.stroke();ctx.setLineDash([]);
   circle(ctx,point.x,point.y,20);ctx.stroke();ctx.beginPath();ctx.moveTo(point.x-28,point.y);ctx.lineTo(point.x+28,point.y);ctx.moveTo(point.x,point.y-28);ctx.lineTo(point.x,point.y+28);ctx.stroke();
  }
 }
 for(const b of s.projectiles)renderProjectile(ctx,b);for(const e of s.effects)renderEffect(ctx,e);
}
