import {onFloor} from '../generator.js';
import {createRandom} from '../rng.js';
export const FOREST={floor:'#b8c88d',edge:'#182c28',outside:'#496b4a',grass:'#869d67'};
const cache=new WeakMap();
function disk(ctx,x,y,r){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
function surface(ctx,map,expand){
 ctx.lineCap='round';ctx.lineJoin='round';
 disk(ctx,map.spawn.x,map.spawn.y,map.entrance.radius+expand);
 for(const c of [map.entrance,...map.corridors]){ctx.lineWidth=(c.width+expand)*2;ctx.beginPath();c.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();}
 for(const p of map.pois)disk(ctx,p.x,p.y,p.radius+expand);
}
function decoration(map){
 if(cache.has(map))return cache.get(map);
 const random=createRandom(map.seed^0x5a17),trees=[],grass=[];
 for(const p of map.pois){
  for(let i=0;i<12;i++){const a=random()*Math.PI*2,r=p.radius+100+random()*130,x=p.x+Math.cos(a)*r,y=p.y+Math.sin(a)*r,size=45+random()*35;if(!onFloor(map,x,y,-size-12))trees.push({x,y,size,angle:a});}
  for(let i=0;i<16;i++){const a=random()*Math.PI*2,r=p.radius*(.55+random()*.36);grass.push({x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r});}
 }
 const result={trees,grass};cache.set(map,result);return result;
}
export function drawForest(ctx,map,visible){
 ctx.save();ctx.fillStyle=FOREST.edge;ctx.strokeStyle=FOREST.edge;surface(ctx,map,7);
 ctx.fillStyle=FOREST.floor;ctx.strokeStyle=FOREST.floor;surface(ctx,map,0);
 const {trees,grass}=decoration(map);
 ctx.strokeStyle=FOREST.grass;ctx.lineWidth=2;ctx.lineCap='round';
 for(const g of grass){if(!visible(g.x,g.y,12))continue;ctx.beginPath();ctx.moveTo(g.x,g.y);ctx.lineTo(g.x-4,g.y-7);ctx.moveTo(g.x+3,g.y);ctx.lineTo(g.x+6,g.y-5);ctx.stroke();}
 for(const t of trees){if(!visible(t.x,t.y,t.size*1.4))continue;ctx.fillStyle='#35583e';disk(ctx,t.x,t.y,t.size);ctx.fillStyle='#638252';for(let i=0;i<6;i++){const a=t.angle+i*Math.PI/3;disk(ctx,t.x+Math.cos(a)*t.size*.45,t.y+Math.sin(a)*t.size*.45,t.size*.57);}ctx.fillStyle='#6c8957';disk(ctx,t.x,t.y,t.size*.62);}
 ctx.restore();
}
