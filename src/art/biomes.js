import {drawForest,FOREST,drawSurface} from './forest.js';
import {onFloor} from '../generator.js';
import {createRandom} from '../rng.js';
export const BIOME_THEMES={forest:FOREST,cave:{floor:'#b7ada0',edge:'#393f36',outside:'#625f57'},library:{floor:'#d1bc95',edge:'#483e32',outside:'#69513c'}};
const cache=new WeakMap();
function props(map){
 if(cache.has(map))return cache.get(map);const random=createRandom(map.seed^0x712a),result=[];
 for(const poi of map.pois)for(let i=0;i<18;i++){const a=random()*Math.PI*2,r=poi.radius+105+random()*120,x=poi.x+Math.cos(a)*r,y=poi.y+Math.sin(a)*r;if(!onFloor(map,x,y,-90))result.push({x,y,angle:a,size:35+random()*22,crystal:i%4===0});}
 cache.set(map,result);return result;
}
export function drawBiome(ctx,map,visible){
 if(map.location==='forest'){drawForest(ctx,map,visible);return;}
 const theme=BIOME_THEMES[map.location];ctx.save();ctx.fillStyle=theme.edge;ctx.strokeStyle=theme.edge;drawSurface(ctx,map,7);ctx.fillStyle=theme.floor;ctx.strokeStyle=theme.floor;drawSurface(ctx,map,0);
 for(const p of props(map)){if(!visible(p.x,p.y,100))continue;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.strokeStyle=theme.edge;ctx.lineWidth=3;
 if(map.location==='cave'){
  ctx.fillStyle=p.crystal?'#92aaa0':'#828076';ctx.beginPath();const n=p.crystal?4:6;for(let i=0;i<n;i++){const a=i*Math.PI*2/n,r=p.size*(i%2?.8:1);i?ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r):ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(-p.size*.4,0);ctx.lineTo(0,-p.size*.5);ctx.lineTo(p.size*.4,0);ctx.stroke();
 }else{
  ctx.fillStyle='#97734e';ctx.fillRect(-60,-25,120,50);ctx.strokeRect(-60,-25,120,50);ctx.fillStyle='#483e32';ctx.fillRect(-51,-17,102,34);for(let i=0;i<7;i++){ctx.fillStyle=['#b8c88d','#c58a45','#e9ddbb','#ba7963'][i%4];ctx.fillRect(-46+i*14,-12,9,24);}
 }ctx.restore();}
 // Sparse surface details are purely decorative and never create obstacles.
 for(const poi of map.pois){if(!visible(poi.x,poi.y,poi.radius))continue;ctx.strokeStyle=map.location==='cave'?'#9b9285':'#b79c73';ctx.lineWidth=2;
 if(map.location==='library'&&poi.boss){ctx.beginPath();ctx.arc(poi.x,poi.y,poi.radius-45,0,Math.PI*2);ctx.stroke();}
 for(let i=0;i<6;i++){const a=i*Math.PI/3,x=poi.x+Math.cos(a)*poi.radius*.82,y=poi.y+Math.sin(a)*poi.radius*.82;ctx.beginPath();ctx.moveTo(x-8,y);ctx.lineTo(x,y+5);ctx.lineTo(x+6,y-4);ctx.stroke();}}
 ctx.restore();
}
