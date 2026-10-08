import {rarityColor} from './items.js';
import {CONFIG,LOCATION_BALANCE,ENEMY_BALANCE,ENCOUNTER_BALANCE} from './balance.js';
import {WANDS,lightningPoint} from './wands.js';
import {getPlayer} from './simulation.js';
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
 if(b.kind==='arrow'){ctx.strokeStyle='#ff7878';ctx.lineWidth=b.radius;ctx.beginPath();ctx.moveTo(b.x-Math.cos(b.angle)*18,b.y-Math.sin(b.angle)*18);ctx.lineTo(b.x,b.y);ctx.stroke();
 }else if(b.kind==='fire'){
  ctx.fillStyle='#ff7638';circle(ctx,b.x,b.y,b.radius);ctx.fill();ctx.fillStyle='#ffe8a4';circle(ctx,b.x,b.y,b.radius*.5);ctx.fill();
 }else if(b.kind==='spark'){
  ctx.fillStyle='#ecb9ff';circle(ctx,b.x,b.y,b.radius);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(b.x-9,b.y);ctx.lineTo(b.x+9,b.y);ctx.moveTo(b.x,b.y-9);ctx.lineTo(b.x,b.y+9);ctx.stroke();
 }else if(b.kind==='whirlwind'){
  ctx.strokeStyle='#a4ffc9';ctx.lineWidth=3;for(let r=5;r<=b.radius;r+=6){circle(ctx,b.x,b.y,r);ctx.stroke();}
 }else if(b.kind==='boulder'){
  ctx.fillStyle='#9c8874';circle(ctx,b.x,b.y,b.radius);ctx.fill();ctx.strokeStyle='#e4c8a6';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(b.x-b.radius*.5,b.y);ctx.lineTo(b.x+b.radius*.3,b.y-b.radius*.5);ctx.stroke();
 }else if(['thorn','gravityOrb','lightDisc','crystalShard'].includes(b.kind)){
  ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.angle);const colors={thorn:'#75d779',gravityOrb:'#a59eff',lightDisc:'#fff7bd',crystalShard:'#f5a6ef'};ctx.fillStyle=colors[b.kind];ctx.strokeStyle=colors[b.kind];ctx.lineWidth=3;
  if(b.kind==='lightDisc'||b.kind==='gravityOrb'){circle(ctx,0,0,b.radius);ctx.stroke();circle(ctx,0,0,b.radius*.5);ctx.fill();}else{ctx.beginPath();ctx.moveTo(b.radius*2,0);ctx.lineTo(-b.radius,-b.radius);ctx.lineTo(-b.radius,b.radius);ctx.closePath();ctx.fill();}ctx.restore();
 }else if(b.kind==='icicle'){
  ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.angle);ctx.fillStyle='#bceeff';ctx.beginPath();ctx.moveTo(b.radius*2,0);ctx.lineTo(-b.radius*2,-b.radius);ctx.lineTo(-b.radius*2,b.radius);ctx.fill();ctx.restore();
 }else if(b.kind==='coldWave'){
  ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.angle);ctx.fillStyle='#8fe4ff40';ctx.strokeStyle='#b8f1ff';ctx.lineWidth=5;
  ctx.beginPath();ctx.ellipse(0,0,b.radius*.28,b.radius,0,-Math.PI/2,Math.PI/2);ctx.fill();ctx.stroke();ctx.restore();
 }
}
function renderEffect(ctx,e){
 const alpha=e.life/e.duration;ctx.save();ctx.globalAlpha=alpha;
 if(['vines','gravityWell','crystalTrap'].includes(e.kind)){
  const color={vines:'#75d779',gravityWell:'#a59eff',crystalTrap:'#f5a6ef'}[e.kind];ctx.globalAlpha=Math.min(1,alpha*4);ctx.fillStyle=color+'35';ctx.strokeStyle=color;ctx.lineWidth=3;circle(ctx,e.x,e.y,e.radius);ctx.fill();ctx.stroke();
  if(e.kind==='gravityWell'){for(let r=15;r<e.radius;r+=28){circle(ctx,e.x,e.y,r);ctx.stroke();}}else if(e.kind==='vines'){for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(e.x+i*25,e.y-e.radius*.65);ctx.lineTo(e.x+i*25+15,e.y);ctx.lineTo(e.x+i*25,e.y+e.radius*.65);ctx.stroke();}}else{ctx.translate(e.x,e.y);ctx.rotate(Math.PI/4);ctx.fillStyle=color;ctx.fillRect(-14,-14,28,28);}
 }else if(e.kind==='lightningLine'){
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
export function render(ctx,s,width,height,localId,view={}){
 const world=s.world??{width:CONFIG.worldWidth,height:CONFIG.worldHeight},player=getPlayer(s,localId);
 const scale=height/CONFIG.worldHeight*(view.zoom??CONFIG.cameraZoom),visibleWidth=width/scale,visibleHeight=height/scale;
 const cameraX=(view.x??(s.scene.id==='lobby'?world.width/2:player.x))-visibleWidth/2,cameraY=(view.y??(s.map?player.y:world.height/2))-visibleHeight/2;
 const visible=(x,y,r=300)=>x+r>cameraX&&x-r<cameraX+visibleWidth&&y+r>cameraY&&y-r<cameraY+visibleHeight;
 ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#101820';ctx.fillRect(0,0,width,height);
 ctx.setTransform(scale,0,0,scale,-cameraX*scale,-cameraY*scale);
 if(s.map){
  ctx.fillStyle=LOCATION_BALANCE[s.map.location].color;ctx.strokeStyle=ctx.fillStyle;ctx.lineCap='round';ctx.lineJoin='round';
  circle(ctx,s.spawn.x,s.spawn.y,s.map.entrance.radius);ctx.fill();
  for(const c of [s.map.entrance,...s.map.corridors]){ctx.lineWidth=c.width*2;ctx.beginPath();c.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();}
  for(const poi of s.map.pois){if(!visible(poi.x,poi.y))continue;circle(ctx,poi.x,poi.y,poi.radius);ctx.fill();ctx.strokeStyle=poi.completed?'#70c993':'#809384';ctx.lineWidth=3;circle(ctx,poi.x,poi.y,poi.radius-5);ctx.stroke();ctx.strokeStyle=LOCATION_BALANCE[s.map.location].color;
   ctx.font='16px system-ui';ctx.textAlign='center';ctx.fillStyle='#c4d2cf';ctx.fillText(`POI ${poi.id+1} · ${poi.type}${poi.boss?' · Boss':''}`,poi.x,poi.y-poi.radius+38);
   for(const plate of poi.plates){ctx.fillStyle=plate.active?'#6bd4a2':'#9a83d4';circle(ctx,plate.x,plate.y,30);ctx.fill();ctx.fillStyle='#fff';ctx.fillText(String(plate.order+1),plate.x,plate.y+5);}
   ctx.fillStyle=poi.completed?'#e9b65c':'#7e7054';ctx.fillRect(poi.x-24,poi.y-92,48,34);ctx.fillStyle='#fff';ctx.fillText(poi.opened?'Opened':poi.completed?'Chest · walk close':'Locked',poi.x,poi.y-104);
   ctx.fillStyle=LOCATION_BALANCE[s.map.location].color;
  }
 }else{
  ctx.fillStyle='#202a32';ctx.fillRect(0,0,world.width,world.height);ctx.strokeStyle='#31404a';ctx.lineWidth=1;
  for(let x=0;x<=world.width;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,world.height);ctx.stroke();}
  for(let y=0;y<=world.height;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(world.width,y);ctx.stroke();}
  ctx.strokeStyle='#6a8290';ctx.lineWidth=8;ctx.strokeRect(4,4,world.width-8,world.height-8);
 }
 ctx.lineCap='butt';
 for(const t of s.telegraphs??[]){ctx.save();ctx.fillStyle='#ff303060';ctx.strokeStyle='#ff5151';ctx.lineWidth=4;ctx.beginPath();if(t.kind==='cone'){ctx.moveTo(t.x,t.y);ctx.arc(t.x,t.y,t.radius,t.angle-ENCOUNTER_BALANCE.coneAngle/2,t.angle+ENCOUNTER_BALANCE.coneAngle/2);ctx.closePath();}else circle(ctx,t.x,t.y,t.radius);if(t.kind==='ring'){for(let i=0;i<ENCOUNTER_BALANCE.bulletCount;i++){const a=i/ENCOUNTER_BALANCE.bulletCount*Math.PI*2;ctx.moveTo(t.x,t.y);ctx.lineTo(t.x+Math.cos(a)*t.radius,t.y+Math.sin(a)*t.radius);}ctx.lineWidth=14;ctx.stroke();}else{ctx.fill();ctx.stroke();}ctx.restore();}
 for(const e of s.enemies??[]){if(!visible(e.x,e.y,100))continue;const def=ENEMY_BALANCE[e.type];ctx.fillStyle=def.boss?'#d36569':s.map.location==='forest'?'#d3d4c2':s.map.location==='cave'?'#85b16a':'#bb9878';circle(ctx,e.x,e.y,def.radius);ctx.fill();ctx.strokeStyle='#111';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x+Math.cos(e.angle)*def.radius,e.y+Math.sin(e.angle)*def.radius);ctx.stroke();ctx.fillStyle='#331f23';ctx.fillRect(e.x-28,e.y-def.radius-14,56,6);ctx.fillStyle='#fa7778';ctx.fillRect(e.x-28,e.y-def.radius-14,56*e.health/e.maxHealth,6);ctx.font='12px system-ui';ctx.fillStyle='#fff';ctx.textAlign='center';ctx.fillText(def.name,e.x,e.y+def.radius+18);}
 ctx.font='14px system-ui';ctx.textAlign='center';
 for(const t of s.targets){
  ctx.fillStyle='#8e6372';ctx.fillRect(t.x-22,t.y-22,44,44);ctx.strokeStyle='#e8b4c4';ctx.lineWidth=3;ctx.strokeRect(t.x-12,t.y-12,24,24);
  ctx.fillStyle='#d9e3ec';ctx.fillText(`Hits: ${t.hits} · Damage: ${Math.round(t.damage*100)/100}`,t.x,t.y+44);
 }
 for(const wall of s.walls){ctx.fillStyle=wall.projectileOnly?'#fff7bd80':wall.permanent?'#526475':'#8c7967';ctx.fillRect(wall.x,wall.y,wall.width,wall.height);ctx.strokeStyle='#decbb1';ctx.lineWidth=2;ctx.strokeRect(wall.x,wall.y,wall.width,wall.height);if(!wall.permanent){ctx.fillStyle='#fff';ctx.fillText(`${Math.ceil(wall.expiresAt-s.time)}s`,wall.x+wall.width/2,wall.y-8);}}
 for(const portal of s.portals){ctx.strokeStyle='#a592ef';ctx.lineWidth=5;circle(ctx,portal.x,portal.y,35);ctx.stroke();ctx.fillStyle='#c4b7ff';ctx.fillText(portal.label,portal.x,portal.y+56);ctx.fillText(portal.available?'Enter together':'Not available yet',portal.x,portal.y+73);}
 for(const pedestal of s.pedestals){ctx.fillStyle='#44505f';ctx.fillRect(pedestal.x-26,pedestal.y-24,52,48);ctx.strokeStyle=rarityColor({rarity:s.debugRarity});ctx.lineWidth=3;ctx.strokeRect(pedestal.x-26,pedestal.y-24,52,48);wand(ctx,pedestal.x,pedestal.y,-.5,pedestal.type);ctx.fillStyle=WANDS[pedestal.type].color;ctx.fillText(WANDS[pedestal.type].name,pedestal.x,pedestal.y+43);}
 if(s.scene.id==='debug'&&s.runeStation){const r=s.runeStation;ctx.fillStyle='#b69cff';ctx.fillRect(r.x-25,r.y-25,50,50);ctx.strokeStyle=rarityColor({rarity:s.debugRarity});ctx.strokeRect(r.x-25,r.y-25,50,50);ctx.fillStyle='#fff';ctx.fillText('Random rune',r.x,r.y+48);}
 for(const i of s.items){if(i.kind==='rune'){ctx.fillStyle='#b69cff';ctx.fillRect(i.x-12,i.y-12,24,24);ctx.strokeStyle=rarityColor(i);ctx.strokeRect(i.x-12,i.y-12,24,24);ctx.fillText(`${i.rarity??'Common'} rune`,i.x,i.y+32);continue;}ctx.strokeStyle=rarityColor(i);ctx.lineWidth=2;circle(ctx,i.x,i.y,26);ctx.stroke();wand(ctx,i.x,i.y,-.5,i.type);ctx.fillStyle=WANDS[i.type].color;ctx.fillText(WANDS[i.type].name,i.x,i.y+43);}
 for(const p of s.scene.viewer?[]:s.players){
  ctx.globalAlpha=p.health<=0?.3:1;drawCharacter(ctx,p);ctx.globalAlpha=1;ctx.fillStyle='#fff';ctx.fillText(p.name,p.x,p.y+40);ctx.fillStyle='#36272c';ctx.fillRect(p.x-28,p.y-43,56,8);ctx.fillStyle='#65e299';ctx.fillRect(p.x-28,p.y-43,56*Math.max(0,p.health)/100,8);
  if(p.charge){
   ctx.strokeStyle=WANDS[p.wand.type].color;ctx.lineWidth=4;ctx.beginPath();ctx.arc(p.x,p.y,27,-Math.PI/2,-Math.PI/2+Math.PI*2*p.charge);ctx.stroke();
   if(p.wand.type==='lightning'&&p.mode==='Special'){
    const point=lightningPoint(p);ctx.setLineDash([6,8]);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(point.x,point.y);ctx.stroke();ctx.setLineDash([]);
    circle(ctx,point.x,point.y,20);ctx.stroke();ctx.beginPath();ctx.moveTo(point.x-28,point.y);ctx.lineTo(point.x+28,point.y);ctx.moveTo(point.x,point.y-28);ctx.lineTo(point.x,point.y+28);ctx.stroke();
   }
  }
 }
 for(const b of s.projectiles)renderProjectile(ctx,b);for(const e of s.effects)renderEffect(ctx,e);
}
