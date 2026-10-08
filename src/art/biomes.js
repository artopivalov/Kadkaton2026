import {drawSurface} from './forest.js';
import {onFloor} from '../generator.js';
import {createRandom} from '../rng.js';
export const BIOME_THEMES={
 forest:{floor:'#788065',edge:'#ddd5b2',outside:'#1c342a'},
 cave:{floor:'#53545a',edge:'#e0d6c9',outside:'#222630'},
 library:{floor:'#99917e',edge:'#eee1bd',outside:'#302a32'}
};
const cache=new WeakMap(),CELL=82;
function disk(ctx,x,y,r){ctx.moveTo(x+r,y);ctx.arc(x,y,r,0,Math.PI*2);}
function line(ctx,points){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
// Clip every detail to the exact circle/capsule floor used by collision.
function floorPath(ctx,map){
 ctx.beginPath();disk(ctx,map.spawn.x,map.spawn.y,map.entrance.radius);
 for(const p of map.pois)disk(ctx,p.x,p.y,p.radius);
 for(const c of [map.entrance,...map.corridors])for(let i=1;i<c.points.length;i++){
  const a=c.points[i-1],b=c.points[i],angle=Math.atan2(b.y-a.y,b.x-a.x),r=c.width;
  ctx.moveTo(a.x+Math.cos(angle-Math.PI/2)*r,a.y+Math.sin(angle-Math.PI/2)*r);
  ctx.arc(b.x,b.y,r,angle-Math.PI/2,angle+Math.PI/2);ctx.arc(a.x,a.y,r,angle+Math.PI/2,angle+Math.PI*1.5);ctx.closePath();
 }
}
function details(map){
 if(cache.has(map))return cache.get(map);
 const random=createRandom(map.seed^0x712a),tiles=[],props=[],background=[],seen=new Set();
 function patch(x,y,r){for(let yy=Math.floor((y-r)/CELL);yy<=Math.ceil((y+r)/CELL);yy++)for(let xx=Math.floor((x-r)/CELL);xx<=Math.ceil((x+r)/CELL);xx++){
  const key=`${xx},${yy}`;if(seen.has(key))continue;seen.add(key);
  const px=xx*CELL,py=yy*CELL;if(onFloor(map,px+CELL/2,py+CELL/2,-CELL))tiles.push({x:px,y:py,v:random(),crack:random(),moss:random()});
 }}
 patch(map.spawn.x,map.spawn.y,map.entrance.radius+CELL);
 for(const p of map.pois)patch(p.x,p.y,p.radius+CELL);
 for(const c of [map.entrance,...map.corridors])for(let j=1;j<c.points.length;j++){
  const a=c.points[j-1],b=c.points[j],n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/CELL);
  for(let i=0;i<=n;i++)patch(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n,c.width+CELL);
 }
 function rim(x,y,r){const n=Math.ceil(Math.PI*2*r/86);for(let i=0;i<n;i++){
  const a=i*Math.PI*2/n,px=x+Math.cos(a)*(r+48),py=y+Math.sin(a)*(r+48);
  if(!onFloor(map,px,py,-38)){props.push({x:px,y:py,a:a+Math.PI/2,size:36+random()*15,v:random(),light:i%7===0});if(map.location==='forest'){const ox=x+Math.cos(a)*(r+125),oy=y+Math.sin(a)*(r+125);if(!onFloor(map,ox,oy,-55))props.push({x:ox,y:oy,a,size:50+random()*20,v:random(),light:false});}}
 }}
 for(const p of map.pois)rim(p.x,p.y,p.radius);rim(map.spawn.x,map.spawn.y,map.entrance.radius);
 // Corridor edges get the same props, with gaps at adjoining arenas and forks.
 for(const c of [map.entrance,...map.corridors])for(let j=1;j<c.points.length;j++){
  const a=c.points[j-1],b=c.points[j],angle=Math.atan2(b.y-a.y,b.x-a.x),n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/110);
  for(let i=0;i<n;i++)for(const side of [-1,1]){const x=a.x+(b.x-a.x)*i/n-Math.sin(angle)*(c.width+65)*side,y=a.y+(b.y-a.y)*i/n+Math.cos(angle)*(c.width+65)*side;
   if(!onFloor(map,x,y,-48))props.push({x,y,a:angle,size:40,v:random(),light:i%7===2});
  }
 }
 // Fill nearby non-playable space with seeded clusters instead of a flat void.
 const backdropRandom=createRandom(map.seed^0x34bca),backgroundCells=new Set(),spacing=190;
 function backdrop(x,y,r){for(let yy=Math.floor((y-r)/spacing);yy<=Math.ceil((y+r)/spacing);yy++)for(let xx=Math.floor((x-r)/spacing);xx<=Math.ceil((x+r)/spacing);xx++){
  const key=`${xx},${yy}`;if(backgroundCells.has(key))continue;backgroundCells.add(key);
  const px=xx*spacing+(backdropRandom()-.5)*100,py=yy*spacing+(backdropRandom()-.5)*100,v=backdropRandom();
  if(v>.12&&!onFloor(map,px,py,-125))background.push({x:px,y:py,a:backdropRandom()*Math.PI*2,size:45+backdropRandom()*35,v,light:false});
 }}
 backdrop(map.spawn.x,map.spawn.y,map.entrance.radius+1000);
 for(const p of map.pois)backdrop(p.x,p.y,p.radius+750);
 for(const c of [map.entrance,...map.corridors])for(let j=1;j<c.points.length;j++){
  const a=c.points[j-1],b=c.points[j],n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/300);
  for(let i=0;i<=n;i++)backdrop(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n,c.width+650);
 }
 const result={tiles,props,background};cache.set(map,result);return result;
}
function glow(ctx,x,y,color,r=125){const gradient=ctx.createRadialGradient(x,y,0,x,y,r);gradient.addColorStop(0,color);gradient.addColorStop(1,color.slice(0,7)+'00');ctx.fillStyle=gradient;ctx.beginPath();disk(ctx,x,y,r);ctx.fill();}
function lamp(ctx,p){glow(ctx,p.x,p.y,'#ffbc5660',145);ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle='#40372d';ctx.strokeStyle='#a18757';ctx.lineWidth=3;ctx.fillRect(-12,-16,24,32);ctx.strokeRect(-12,-16,24,32);ctx.fillStyle='#efb24c';ctx.beginPath();disk(ctx,0,0,8);ctx.fill();ctx.fillStyle='#fff0bd';ctx.beginPath();disk(ctx,0,-2,4);ctx.fill();ctx.restore();}
function prop(ctx,p,location){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.a);ctx.lineWidth=3;
 if(location==='forest'){
  ctx.strokeStyle='#604d32';ctx.lineWidth=10;line(ctx,[[-20,38],[0,6],[18,-20]]);ctx.strokeStyle='#182e23';ctx.lineWidth=3;
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7;ctx.fillStyle=['#35513a','#426044','#53704a'][i%3];ctx.beginPath();disk(ctx,Math.cos(a)*p.size*.55,Math.sin(a)*p.size*.55,p.size*.65);ctx.fill();ctx.stroke();}
  for(let i=0;i<9;i++){ctx.fillStyle=i%2?'#748354':'#617b4b';ctx.beginPath();ctx.ellipse(Math.cos(i*2.3)*p.size*.65,Math.sin(i*2.3)*p.size*.65,5,11,i,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle='#d9bc87';for(let i=0;i<3;i++){ctx.beginPath();disk(ctx,28+i*6,35+i%2*5,2);ctx.fill();}ctx.strokeStyle='#91a463';ctx.lineWidth=2;for(let i=0;i<5;i++)line(ctx,[[22,25],[40+i*4,10+i*7]]);
 }else if(location==='cave'){
  ctx.fillStyle=p.v>.55?'#423f50':'#393c46';ctx.strokeStyle='#171f29';ctx.beginPath();ctx.moveTo(-p.size,-22);ctx.lineTo(-15,-p.size);ctx.lineTo(24,-p.size*.8);ctx.lineTo(p.size,6);ctx.lineTo(14,p.size);ctx.lineTo(-29,27);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle='#666371';line(ctx,[[-15,-p.size],[2,-3],[p.size,6]]);
  if(p.v>.48){for(let i=0;i<3;i++){const x=(i-1)*18,y=i%2*12;ctx.fillStyle=i%2?'#5d93a5':'#8764b6';ctx.strokeStyle='#b9b4e4';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x,y-43);ctx.lineTo(x+12,y-18);ctx.lineTo(x+9,y+13);ctx.lineTo(x-9,y+7);ctx.lineTo(x-12,y-20);ctx.closePath();ctx.fill();ctx.stroke();line(ctx,[[x,y-43],[x+2,y+8]]);}}
 }else{
  ctx.fillStyle='#654b36';ctx.strokeStyle='#251f23';ctx.lineWidth=4;ctx.fillRect(-43,-25,86,50);ctx.strokeRect(-43,-25,86,50);ctx.fillStyle='#252729';ctx.fillRect(-36,-18,72,36);
  for(let i=0;i<8;i++){ctx.fillStyle=['#81754c','#675370','#a48051','#497379'][i%4];ctx.fillRect(-32+i*8,-14,6,28-(i%3)*3);ctx.fillStyle='#ccb486';ctx.fillRect(-32+i*8,-8,6,2);}
  ctx.strokeStyle='#ac8955';ctx.lineWidth=2;line(ctx,[[-41,-24],[41,-24]]);if(p.v>.78){ctx.fillStyle='#a69b81';ctx.beginPath();disk(ctx,43,0,19);ctx.fill();ctx.stroke();ctx.fillStyle='#756451';ctx.beginPath();disk(ctx,43,0,12);ctx.fill();ctx.strokeStyle='#d2bb87';ctx.beginPath();disk(ctx,43,0,8);ctx.stroke();}
 }
 ctx.restore();}
function backgroundProp(ctx,p,location){
 ctx.save();ctx.globalAlpha=.65;
 if(p.v>.65){prop(ctx,p,location);ctx.restore();return;}
 ctx.translate(p.x,p.y);ctx.rotate(p.a);ctx.lineWidth=2;
 if(location==='forest'){
  ctx.fillStyle='#3e4d36';ctx.strokeStyle='#25352a';ctx.beginPath();ctx.ellipse(0,0,46,27,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.strokeStyle='#65553d';ctx.lineWidth=17;line(ctx,[[-38,-10],[33,15]]);ctx.strokeStyle='#8b7951';ctx.lineWidth=3;line(ctx,[[-34,-13],[29,11]]);
  for(let i=0;i<4;i++){ctx.fillStyle=i%2?'#80684d':'#67824b';ctx.beginPath();ctx.ellipse(24+i*8,-22+i%2*9,7,5,0,0,Math.PI*2);ctx.fill();}
 }else if(location==='cave'){
  for(let i=0;i<5;i++){ctx.fillStyle=i%2?'#333742':'#3b3b49';ctx.strokeStyle='#1b222b';ctx.beginPath();ctx.moveTo(-44+i*19,-15);ctx.lineTo(-35+i*19,-33-i%2*13);ctx.lineTo(-22+i*19,-9);ctx.lineTo(-26+i*19,17);ctx.lineTo(-43+i*19,8);ctx.closePath();ctx.fill();ctx.stroke();}
 }else{
  ctx.fillStyle='#463a36';ctx.strokeStyle='#211f25';ctx.beginPath();ctx.roundRect(-48,-31,96,62,7);ctx.fill();ctx.stroke();
  ctx.fillStyle='#746047';ctx.fillRect(-41,-24,82,48);ctx.fillStyle='#4b4054';ctx.fillRect(-24,-16,28,33);ctx.strokeStyle='#a58c60';ctx.strokeRect(-24,-16,28,33);
  ctx.fillStyle='#9d9279';ctx.fillRect(12,-13,20,23);ctx.strokeStyle='#655a49';line(ctx,[[15,-5],[27,-5]]);line(ctx,[[15,1],[25,1]]);
 }
 ctx.restore();
}
export function drawBiome(ctx,map,visible){
 const theme=BIOME_THEMES[map.location],{tiles,props,background}=details(map);ctx.save();
 for(const p of background)if(visible(p.x,p.y,140))backgroundProp(ctx,p,map.location);ctx.fillStyle='#182522';ctx.strokeStyle='#182522';drawSurface(ctx,map,12);ctx.fillStyle=theme.floor;ctx.strokeStyle=theme.floor;drawSurface(ctx,map,0);
 ctx.save();floorPath(ctx,map);ctx.clip();
 const palettes={forest:['#798167','#81876c','#6e795e','#8c8c71'],cave:['#50515a','#575862','#484c56','#605d66'],library:['#948c79','#a19a87','#aca28d','#898774']};
 ctx.save();ctx.globalAlpha=.22;
 for(const t of tiles){if(!visible(t.x,t.y,CELL*2))continue;ctx.fillStyle=palettes[map.location][Math.floor(t.v*4)];ctx.strokeStyle=map.location==='library'?'#625e52':'#3b4239';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(t.x+9+(map.location==='cave'?t.v*18:0),t.y+3);ctx.lineTo(t.x+71,t.y+4);ctx.lineTo(t.x+79,t.y+13+(map.location==='cave'?t.crack*24:0));ctx.lineTo(t.x+77,t.y+69);ctx.lineTo(t.x+68,t.y+79);ctx.lineTo(t.x+10+(map.location==='cave'?t.crack*21:0),t.y+76);ctx.lineTo(t.x+3,t.y+65);ctx.lineTo(t.x+4,t.y+12);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle=map.location==='cave'?'#76717d':'#b0ab8a';ctx.globalAlpha=.08;line(ctx,[[t.x+12,t.y+6],[t.x+68,t.y+7]]);ctx.globalAlpha=.22;
  if(map.location==='cave'){ctx.fillStyle='#8e839140';ctx.beginPath();disk(ctx,t.x+48,t.y+55,2+t.v*3);ctx.fill();}
  if(t.crack>.9){ctx.strokeStyle=map.location==='library'?'#777160':'#3b453d';line(ctx,[[t.x+12,t.y+5],[t.x+24,t.y+23],[t.x+19,t.y+39],[t.x+36,t.y+52]]);}
  if(map.location==='forest'&&t.moss>.86){ctx.fillStyle='#5b7047';for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse(t.x+5+i*6,t.y+65+(i%2)*5,8,4,i,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#bac19a';ctx.fillRect(t.x+63,t.y+48,2,2);}
 }
 ctx.restore();
 if(map.location==='library')for(const p of map.pois){if(!visible(p.x,p.y,p.radius))continue;ctx.strokeStyle='#c3a86c70';ctx.lineWidth=2;for(const ratio of [.26,.8,.85]){ctx.beginPath();disk(ctx,p.x,p.y,p.radius*ratio);ctx.stroke();}for(let i=0;i<12;i++){const a=i*Math.PI/6,r=p.radius*.82,x=p.x+Math.cos(a)*r,y=p.y+Math.sin(a)*r;ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.strokeRect(-12,-12,24,24);ctx.restore();}}
 ctx.restore();
 for(const p of props){if(!visible(p.x,p.y,190))continue;if(map.location==='cave'&&p.v>.65)glow(ctx,p.x,p.y,p.v>.8?'#7d65bb40':'#4b9ba640',110);prop(ctx,p,map.location);if(p.light)lamp(ctx,p);if(map.location==='forest'&&p.v>.85){glow(ctx,p.x-22,p.y+15,'#dce99835',42);ctx.fillStyle='#e2ebaf';ctx.beginPath();disk(ctx,p.x-22,p.y+15,2);ctx.fill();}}
 ctx.restore();
}
