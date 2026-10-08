import {drawBattleArena,drawArenaCover} from './art/battle-royale.js';
import {drawLobby,drawLobbyPortal} from './art/lobby.js';
import {safeRadius,cameraPlayer} from './battle-royale.js';
import {drawElementProjectile,drawElementEffect} from './elements.js';
import {drawFeedback} from './feedback.js';
import {drawPuzzle} from './puzzles.js';
import {drawWizard} from './art/characters.js';
import {drawBiome,BIOME_THEMES} from './art/biomes.js';
import {drawEnemy} from './art/enemies.js';
import {rarityColor} from './items.js';
import {CONFIG,ENEMY_BALANCE,ENCOUNTER_BALANCE,COMBAT_BALANCE,WAND_MIN_RARITY,RARITIES} from './balance.js';
import {WANDS,lightningPoint} from './wands.js';
import {getPlayer} from './simulation.js';
// All artwork stays separate from simulation and can be replaced later.
function circle(ctx,x,y,radius){ctx.beginPath();ctx.arc(x,y,Math.max(0,radius),0,Math.PI*2);}
function wand(ctx,x,y,angle,type='fire'){
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.strokeStyle='#d8b97e';ctx.lineWidth=6;
 ctx.beginPath();ctx.moveTo(-12,0);ctx.lineTo(16,0);ctx.stroke();
 ctx.fillStyle=WANDS[type].color;circle(ctx,16,0,5);ctx.fill();ctx.restore();
}
export function drawCharacter(ctx,p){drawWizard(ctx,p,WANDS[p.wand?.type??'test'].color);}
export function renderPreview(ctx,color){
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,160,110);ctx.save();ctx.strokeStyle='#73908470';ctx.lineWidth=2;circle(ctx,80,60,44);ctx.stroke();circle(ctx,80,60,38);ctx.stroke();ctx.translate(80,60);ctx.scale(1.3,1.3);
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
 }else if(['bloodBolt','bloodNeedle','voidOrb','mirrorShard','orbitBolt','comet','meteorDebris','hook'].includes(b.kind)){
  const colors={bloodBolt:'#f45f85',bloodNeedle:'#f45f85',voidOrb:'#ae73de',mirrorShard:'#c3f4ff',orbitBolt:'#f5d292',comet:'#ffd07c',meteorDebris:'#ffd07c',hook:'#b9c4cc'};ctx.fillStyle=colors[b.kind];circle(ctx,b.x,b.y,b.radius);ctx.fill();ctx.strokeStyle=colors[b.kind];ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(b.x-Math.cos(b.angle)*25,b.y-Math.sin(b.angle)*25);ctx.lineTo(b.x,b.y);ctx.stroke();
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
 if(['mirror','prism','satellite','stormCloud','voidRift','meteorWarning'].includes(e.kind)){
  const colors={mirror:'#c3f4ff',prism:'#99ffea',satellite:'#f5d292',stormCloud:'#a5c4ff',voidRift:'#ae73de',meteorWarning:'#ff5151'};const color=colors[e.kind];ctx.globalAlpha=Math.min(1,alpha*4);ctx.strokeStyle=color;ctx.fillStyle=e.kind==='meteorWarning'?`rgba(255,81,81,${COMBAT_BALANCE.telegraphFill})`:color+'35';ctx.lineWidth=3;
  if(e.kind==='mirror'){ctx.beginPath();ctx.moveTo(e.x-Math.sin(e.angle)*e.radius,e.y+Math.cos(e.angle)*e.radius);ctx.lineTo(e.x+Math.sin(e.angle)*e.radius,e.y-Math.cos(e.angle)*e.radius);ctx.lineWidth=8;ctx.stroke();ctx.fillStyle=color;ctx.fillText(`${e.reflections} reflections`,e.x,e.y+30);}
  else if(e.kind==='prism'){ctx.beginPath();ctx.moveTo(e.x,e.y-e.radius);ctx.lineTo(e.x+e.radius,e.y+e.radius);ctx.lineTo(e.x-e.radius,e.y+e.radius);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle=color;ctx.fillText(`${e.shots} shots`,e.x,e.y+e.radius+20);}
  else {circle(ctx,e.x,e.y,e.radius);ctx.fill();ctx.stroke();if(e.kind==='voidRift'||e.kind==='meteorWarning'){ctx.strokeStyle='#ff5151';ctx.globalAlpha=COMBAT_BALANCE.telegraphStroke;circle(ctx,e.x,e.y,e.radius);ctx.stroke();ctx.fillStyle='#fff';ctx.font='14px system-ui';ctx.fillText(`${e.kind==='voidRift'?'Collapse':'Meteor'} ${e.life.toFixed(1)}s`,e.x,e.y);}}
 }else if(['vines','gravityWell','crystalTrap'].includes(e.kind)){
  const color={vines:'#75d779',gravityWell:'#a59eff',crystalTrap:'#f5a6ef'}[e.kind];ctx.globalAlpha=Math.min(1,alpha*4);ctx.fillStyle=color+'35';ctx.strokeStyle=color;ctx.lineWidth=3;circle(ctx,e.x,e.y,e.radius);ctx.fill();ctx.stroke();
  if(e.kind==='gravityWell'){for(let r=15;r<e.radius;r+=28){circle(ctx,e.x,e.y,r);ctx.stroke();}}else if(e.kind==='vines'){for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(e.x+i*25,e.y-e.radius*.65);ctx.lineTo(e.x+i*25+15,e.y);ctx.lineTo(e.x+i*25,e.y+e.radius*.65);ctx.stroke();}}else{ctx.translate(e.x,e.y);ctx.rotate(Math.PI/4);ctx.fillStyle=color;ctx.fillRect(-14,-14,28,28);}
 }else if(['lightningLine','stormLine','prismRay'].includes(e.kind)){
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
// The guide shows facing, not a guaranteed hit or the randomized spread of a cast.
function drawAim(ctx,p){
 if(!p?.wand||p.health<=0||p.mode==='Safe'||!(p.charge>0))return;
 const strike=p.wand.type==='lightning'&&p.mode==='Special';
 const distance=300,point=strike?lightningPoint(p):{x:p.x+Math.cos(p.angle)*distance,y:p.y+Math.sin(p.angle)*distance};
 ctx.save();ctx.strokeStyle='#d9fff2';ctx.lineCap='round';ctx.lineWidth=2;
 ctx.globalAlpha=.24+.12*Math.min(1,p.charge);ctx.setLineDash([5,8]);
 ctx.beginPath();ctx.moveTo(p.x+Math.cos(p.angle)*38,p.y+Math.sin(p.angle)*38);ctx.lineTo(point.x,point.y);ctx.stroke();
 ctx.setLineDash([]);ctx.globalAlpha=.38+.14*Math.min(1,p.charge);
 circle(ctx,point.x,point.y,6);ctx.stroke();
 ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.globalAlpha=.42;
 ctx.beginPath();ctx.moveTo(48,-6);ctx.lineTo(57,0);ctx.lineTo(48,6);ctx.stroke();ctx.restore();
}
export function render(ctx,s,width,height,localId,view={}){
 const world=s.world??{width:CONFIG.worldWidth,height:CONFIG.worldHeight},player=cameraPlayer(s,localId,view.spectatedId);
 const scale=height/CONFIG.worldHeight*(view.zoom??CONFIG.cameraZoom),visibleWidth=width/scale,visibleHeight=height/scale;
 // Following cameras leave more room ahead; free-camera views remain centered.
 const screenAnchorY=view.y===undefined&&!s.scene.viewer?2/3:1/2;
 const cameraX=(view.x??player.x)-visibleWidth/2,cameraY=(view.y??player.y)-visibleHeight*screenAnchorY;
 const visible=(x,y,r=300)=>s.battleRoyale||x+r>cameraX&&x-r<cameraX+visibleWidth&&y+r>cameraY&&y-r<cameraY+visibleHeight;
 ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=s.map?BIOME_THEMES[s.map.location].outside:'#101820';ctx.fillRect(0,0,width,height);
 const offset=view.feedback?.offset??{x:0,y:0};
 const cameraAngle=s.battleRoyale?(player.cameraAngle??0):0,c=Math.cos(cameraAngle),sn=Math.sin(cameraAngle);
 if(s.battleRoyale)ctx.setTransform(scale*c,scale*sn,-scale*sn,scale*c,width/2-scale*(c*(view.x??player.x)-sn*(view.y??player.y))+offset.x*(view.dpr??1),height*screenAnchorY-scale*(sn*(view.x??player.x)+c*(view.y??player.y))+offset.y*(view.dpr??1));
 else ctx.setTransform(scale,0,0,scale,-cameraX*scale+offset.x*(view.dpr??1),-cameraY*scale+offset.y*(view.dpr??1));
 if(s.map){
  const theme=BIOME_THEMES[s.map.location];
  drawBiome(ctx,s.map,visible);
  for(const poi of s.map.pois){if(!visible(poi.x,poi.y,poi.radius))continue;
   ctx.font='16px system-ui';ctx.textAlign='center';ctx.fillStyle=theme.edge;if(s.scene.viewer)ctx.fillText(`POI ${poi.id+1} · ${poi.type}${poi.boss?' · Boss':''}`,poi.x,poi.y-poi.radius+38);
   drawPuzzle(ctx,poi,s.time);
   if(poi.puzzle&&!poi.completed){
    ctx.save();ctx.font='18px system-ui';ctx.textAlign='center';ctx.fillStyle=theme.edge;
    const words=poi.puzzle.hint.split(' '),lines=[];let line='';
    for(const word of words){const next=line?`${line} ${word}`:word;if(ctx.measureText(next).width>Math.min(440,poi.radius*1.5)&&line){lines.push(line);line=word;}else line=next;}
    if(line)lines.push(line);
    for(const [i,text] of lines.entries())ctx.fillText(text,poi.x,poi.y+poi.radius-90+i*24);
    ctx.restore();
   }

   ctx.fillStyle=poi.completed?'#e9b65c':'#7e7054';ctx.fillRect(poi.x-24,poi.y-92,48,34);ctx.strokeStyle=theme.edge;ctx.lineWidth=2;ctx.strokeRect(poi.x-24,poi.y-92,48,34);ctx.fillStyle='#c58a45';ctx.fillRect(poi.x-16,poi.y-92,4,34);ctx.fillRect(poi.x+12,poi.y-92,4,34);ctx.fillRect(poi.x-4,poi.y-79,8,9);
   ctx.fillStyle=theme.edge;ctx.fillText(poi.opened?'Opened':poi.completed?'Chest · walk close':'Locked',poi.x,poi.y-104);
  }
 }else if(s.battleRoyale){
  drawBattleArena(ctx,s,safeRadius(s),view.feedback?.reducedMotion?0:s.time);
 }else if(s.scene.id==='lobby'){
  drawLobby(ctx,world,s.time);
 }else{
  ctx.fillStyle='#202a32';ctx.fillRect(0,0,world.width,world.height);ctx.strokeStyle='#31404a';ctx.lineWidth=1;
  for(let x=0;x<=world.width;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,world.height);ctx.stroke();}
  for(let y=0;y<=world.height;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(world.width,y);ctx.stroke();}
  ctx.strokeStyle='#6a8290';ctx.lineWidth=8;ctx.strokeRect(4,4,world.width-8,world.height-8);
 }
 ctx.lineCap='butt';

 for(const e of s.enemies??[]){if(!visible(e.x,e.y,100))continue;const def=ENEMY_BALANCE[e.type];drawEnemy(ctx,e,def,s.time);const reaction=view.feedback?.actors.get('e'+e.id);if(reaction?.flash>0){ctx.save();ctx.globalAlpha=reaction.flash*7;ctx.strokeStyle='#fff5dc';ctx.lineWidth=3;circle(ctx,e.x,e.y,def.radius+3);ctx.stroke();ctx.restore();}ctx.fillStyle='#331f23';ctx.fillRect(e.x-28,e.y-def.radius-14,56,6);ctx.fillStyle='#fa7778';ctx.fillRect(e.x-28,e.y-def.radius-14,56*e.health/e.maxHealth,6);ctx.font='12px system-ui';ctx.fillStyle=s.map?BIOME_THEMES[s.map.location].edge:'#fff';ctx.textAlign='center';if(s.scene.id==='debug'||s.scene.viewer)ctx.fillText(def.name,e.x,e.y+def.radius+18);}
 ctx.font='14px system-ui';ctx.textAlign='center';
 for(const t of s.targets){
  const hit=view.feedback?.actors.get('t'+t.id)?.flash??0;ctx.save();ctx.translate(t.x,t.y);ctx.scale(1+hit*.8,1-hit*.5);ctx.fillStyle=hit>0?'#ffe4a3':'#8e6372';ctx.fillRect(-22,-22,44,44);ctx.restore();ctx.strokeStyle='#e8b4c4';ctx.lineWidth=3;ctx.strokeRect(t.x-12,t.y-12,24,24);
  ctx.fillStyle='#d9e3ec';ctx.fillText(`Hits: ${t.hits} · Damage: ${Math.round(t.damage*100)/100}`,t.x,t.y+44);
 }
 for(const wall of s.walls){if(wall.kind==='arenaCover'){drawArenaCover(ctx,wall);continue;}ctx.save();ctx.translate(wall.x+wall.width/2,wall.y+wall.height/2);ctx.rotate(wall.angle??0);ctx.fillStyle=wall.kind==='arenaCover'?'#496b4a':wall.projectileOnly?'#fff7bd80':wall.permanent?'#526475':'#8c7967';ctx.fillRect(-wall.width/2,-wall.height/2,wall.width,wall.height);ctx.strokeStyle=wall.kind==='arenaCover'?'#182c28':'#decbb1';ctx.lineWidth=3;ctx.strokeRect(-wall.width/2,-wall.height/2,wall.width,wall.height);if(!wall.permanent){ctx.fillStyle='#fff';ctx.fillText(`${Math.ceil(wall.expiresAt-s.time)}s`,0,-wall.height/2-8);}ctx.restore();}
 for(const portal of s.portals){if(s.scene.id==='lobby'){drawLobbyPortal(ctx,portal,s.time);continue;}ctx.strokeStyle=portal.location==='battleRoyale'?'#ef795e':'#a592ef';ctx.lineWidth=5;circle(ctx,portal.x,portal.y,35);ctx.stroke();ctx.fillStyle='#c4b7ff';ctx.fillText(portal.label,portal.x,portal.y+56);ctx.fillText(portal.available?'Enter together':'Not available yet',portal.x,portal.y+73);}
 for(const pedestal of s.pedestals){ctx.fillStyle='#44505f';ctx.fillRect(pedestal.x-26,pedestal.y-24,52,48);ctx.strokeStyle=rarityColor({rarity:RARITIES[Math.max(RARITIES.indexOf(s.debugRarity),WAND_MIN_RARITY[pedestal.type]??0)]});ctx.lineWidth=3;ctx.strokeRect(pedestal.x-26,pedestal.y-24,52,48);wand(ctx,pedestal.x,pedestal.y,-.5,pedestal.type);ctx.fillStyle=WANDS[pedestal.type].color;ctx.fillText(WANDS[pedestal.type].name,pedestal.x,pedestal.y+43);if(WAND_MIN_RARITY[pedestal.type]){ctx.font='11px system-ui';ctx.fillText(`${RARITIES[WAND_MIN_RARITY[pedestal.type]]}+`,pedestal.x,pedestal.y+58);ctx.font='14px system-ui';}}
 if(s.scene.id==='debug'&&s.runeStation){const r=s.runeStation;ctx.fillStyle='#b69cff';ctx.fillRect(r.x-25,r.y-25,50,50);ctx.strokeStyle=rarityColor({rarity:s.debugRarity});ctx.strokeRect(r.x-25,r.y-25,50,50);ctx.fillStyle='#fff';ctx.fillText('Random rune',r.x,r.y+48);}
 for(const i of s.items){
  ctx.save();
  // A neutral medallion separates loot from every biome; rarity stays circular.
  ctx.fillStyle='#182c2880';circle(ctx,i.x,i.y,28);ctx.fill();
  ctx.strokeStyle='#182c28';ctx.lineWidth=7;circle(ctx,i.x,i.y,28);ctx.stroke();
  ctx.strokeStyle=rarityColor(i);ctx.lineWidth=3;circle(ctx,i.x,i.y,28);ctx.stroke();
  if(i.kind==='rune'){
   ctx.fillStyle='#e9ddbb';ctx.strokeStyle='#c58a45';ctx.lineWidth=2;
   ctx.beginPath();ctx.moveTo(i.x,i.y-19);ctx.lineTo(i.x+14,i.y);ctx.lineTo(i.x,i.y+19);ctx.lineTo(i.x-14,i.y);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.strokeStyle='#182c28';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(i.x,i.y+9);ctx.lineTo(i.x,i.y-9);ctx.moveTo(i.x-6,i.y-3);ctx.lineTo(i.x,i.y+2);ctx.lineTo(i.x+6,i.y-3);ctx.stroke();
  }else{
   ctx.save();ctx.translate(i.x,i.y);ctx.scale(1.25,1.25);wand(ctx,0,0,-.5,i.type);ctx.restore();
  }
  ctx.font='600 14px system-ui';ctx.textAlign='center';ctx.lineJoin='round';ctx.lineWidth=4;ctx.strokeStyle='#182c28';
  const label=i.kind==='rune'?'Rune':WANDS[i.type].name;
  ctx.strokeText(label,i.x,i.y+46);ctx.fillStyle='#fff5dc';ctx.fillText(label,i.x,i.y+46);
  ctx.restore();
 }
 for(const p of s.scene.viewer?[]:s.players){
  const motion=view.feedback?.actors.get('p'+p.id),animated=motion&&!view.feedback.reducedMotion&&p.health>0;
  ctx.save();ctx.globalAlpha=p.health<=0?.3:1;
  if(animated){const gait=Math.min(1,motion.speed/180),bob=Math.sin(motion.stride)*gait;ctx.translate(p.x-Math.cos(motion.recoilAngle)*motion.recoil,p.y-Math.sin(motion.recoilAngle)*motion.recoil);ctx.rotate(motion.angle);ctx.scale(1+gait*.035+motion.recoil*.009,1-gait*.025-motion.recoil*.004);ctx.rotate(bob*.045);drawCharacter(ctx,{...p,x:0,y:0,angle:0});}else drawCharacter(ctx,p);
  ctx.restore();
  if(motion?.flash>0){ctx.save();ctx.globalAlpha=motion.flash*7;ctx.strokeStyle='#fff5dc';ctx.lineWidth=3;circle(ctx,p.x,p.y,24);ctx.stroke();ctx.restore();}
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(-cameraAngle);ctx.translate(-p.x,-p.y);
  ctx.globalAlpha=1;ctx.fillStyle=s.map?BIOME_THEMES[s.map.location].edge:'#fff';ctx.fillText(p.name,p.x,p.y+40);ctx.fillStyle='#24344a';ctx.fillRect(p.x-28,p.y-55,56,8);if(motion?.healthTrail>p.health){ctx.fillStyle='#ffd1a3';ctx.fillRect(p.x-28,p.y-55,56*Math.min(1,motion.healthTrail/(p.maxHealth??100)),8);}
  ctx.fillStyle='#65e299';ctx.fillRect(p.x-28,p.y-55,56*Math.min(1,Math.max(0,p.health)/(p.maxHealth??100)),8);
  ctx.fillStyle='#24344a';ctx.fillRect(p.x-28,p.y-44,56,6);ctx.fillStyle='#73bafa';ctx.fillRect(p.x-28,p.y-44,56*Math.min(1,Math.max(0,p.mana)/100),6);
  ctx.restore();
  if(p.charge&&p.wand){
   ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);const glow=3+p.charge*6;ctx.globalAlpha=.35+.45*p.charge;ctx.fillStyle=WANDS[p.wand.type].color;circle(ctx,32,12,glow);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle='#fff5dc';circle(ctx,32,12,2+p.charge*2);ctx.fill();ctx.restore();
   ctx.save();ctx.strokeStyle='#182c28';ctx.lineWidth=9;circle(ctx,p.x,p.y,27);ctx.stroke();ctx.strokeStyle='#24344a';ctx.lineWidth=5;circle(ctx,p.x,p.y,27);ctx.stroke();ctx.strokeStyle='#ffc36b';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.arc(p.x,p.y,27,-Math.PI/2,-Math.PI/2+Math.PI*2*p.charge);ctx.stroke();ctx.restore();

  }
 }
 for(const b of s.projectiles){if(!b.enemy){ctx.save();ctx.globalAlpha=.25;ctx.strokeStyle=WANDS[b.spellType]?.color??'#ffe4a3';ctx.lineWidth=Math.max(1,b.radius*.65);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(b.x-Math.cos(b.angle)*Math.min(32,(b.speed??100)*.035),b.y-Math.sin(b.angle)*Math.min(32,(b.speed??100)*.035));ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore();}drawElementProjectile(ctx,b,view.feedback?.time??s.time);renderProjectile(ctx,b);}for(const e of s.effects){renderEffect(ctx,e);drawElementEffect(ctx,e,view.feedback?.time??s.time);}
 drawFeedback(ctx,view.feedback);
 if(!s.scene.viewer)drawAim(ctx,player);
 for(const t of s.telegraphs??[]){ctx.save();ctx.fillStyle=`rgba(255,48,48,${COMBAT_BALANCE.telegraphFill})`;ctx.strokeStyle=`rgba(255,81,81,${COMBAT_BALANCE.telegraphStroke})`;ctx.lineWidth=4;ctx.beginPath();if(t.kind==='charge'){const nx=-Math.sin(t.angle)*(t.width??55)/2,ny=Math.cos(t.angle)*(t.width??55)/2,x2=t.x+Math.cos(t.angle)*t.radius,y2=t.y+Math.sin(t.angle)*t.radius;ctx.moveTo(t.x+nx,t.y+ny);ctx.lineTo(x2+nx,y2+ny);ctx.lineTo(x2-nx,y2-ny);ctx.lineTo(t.x-nx,t.y-ny);ctx.closePath();}else if(t.kind==='cone'){ctx.moveTo(t.x,t.y);ctx.arc(t.x,t.y,t.radius,t.angle-ENCOUNTER_BALANCE.coneAngle/2,t.angle+ENCOUNTER_BALANCE.coneAngle/2);ctx.closePath();}else circle(ctx,t.x,t.y,t.radius);if(t.kind==='ring'){for(let i=0;i<ENCOUNTER_BALANCE.bulletCount;i++){const a=i/ENCOUNTER_BALANCE.bulletCount*Math.PI*2;ctx.moveTo(t.x,t.y);ctx.lineTo(t.x+Math.cos(a)*t.radius,t.y+Math.sin(a)*t.radius);}ctx.lineWidth=14;ctx.stroke();}else{ctx.fill();ctx.stroke();}ctx.restore();}
 const hurt=view.feedback?.hurt??0;
 if(hurt>.01){
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#df3653';
  for(let i=0;i<6;i++){const border=Math.min(width,height)*(.015+i*.013);ctx.globalAlpha=hurt*(.07-i*.009);ctx.fillRect(0,0,width,border);ctx.fillRect(0,height-border,width,border);ctx.fillRect(0,border,border,height-2*border);ctx.fillRect(width-border,border,border,height-2*border);}
  ctx.restore();
 }

}
