import {createRandom} from './rng.js';
import {LOCATION_BALANCE} from './balance.js';
// A map is a serializable graph of circular arenas and capsule corridors.
export function generateLocation(location,seed,partySize=1){
 const config=LOCATION_BALANCE[location];if(!config)throw new Error(`Unknown location: ${location}`);
 const random=createRandom(seed),pois=[],corridors=[],radius=230,spacing=720;
 const mainCount=location==='forest'?config.poiCount:Math.ceil(config.poiCount*.65);
 const height=(mainCount+2)*spacing+1000,width=5200;
 function add(x,y,parent,depth){
  const poi={id:pois.length,x,y,radius,type:random()<.5?'combat':'puzzle',progress:pois.length/config.poiCount,parent,depth,completed:false,opened:false,plates:[]};
  pois.push(poi);
  if(parent!==null){const from=pois[parent];const bend={x:(from.x+x)/2+(random()-.5)*100,y:(from.y+y)/2};corridors.push({id:corridors.length,from:parent,to:poi.id,width:110,points:[{x:from.x,y:from.y},bend,{x,y}]});}
  return poi;
 }
 for(let i=0;i<mainCount;i++)add(width/2+(random()-.5)*180,height-1700-i*spacing,i?i-1:null,0);
 let branchIndex=0,chainParent=null;
 while(pois.length<config.poiCount){
  const depth=location==='library'?branchIndex%3:0;
  const root=1+(location==='library'?Math.floor(branchIndex/3)*2:branchIndex)%(mainCount-2);
  const parent=depth?chainParent:root,from=pois[parent],side=root%2?1:-1;
  const poi=add(from.x+side*600,from.y-80,parent,depth+1);chainParent=poi.id;branchIndex++;
 }
 const end=pois[mainCount-1];end.boss=true;
 const map={location,seed:seed>>>0,partySize,world:{width,height},pois,corridors,spawn:{x:pois[0].x,y:pois[0].y+1000},bossPoi:end.id};
 map.entrance={width:110,radius:150,points:[{...map.spawn},{x:pois[0].x,y:pois[0].y}]};
 // Loot rolls belong to the seed, never to the camera or the player opening a chest.
 for(const poi of pois){poi.loot=Array.from({length:2},()=>random()<.5?{kind:'wand',type:['fire','ice','lightning','air','earth'][Math.floor(random()*5)]}:{kind:'rune',type:['damage','range','size'][Math.floor(random()*3)],factor:random()<.5?.8:1.25});if(poi.type==='puzzle')poi.plates=[-1,0,1].map((n,i)=>({x:poi.x+n*100,y:poi.y,order:i,active:false}));}
 return map;
}
function segmentDistance(x,y,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a.x-t*dx,y-a.y-t*dy);}
export function onFloor(map,x,y,radius=0){
 if(map.entrance&&(Math.hypot(x-map.spawn.x,y-map.spawn.y)<=map.entrance.radius-radius||segmentDistance(x,y,...map.entrance.points)<=map.entrance.width-radius))return true;
 if(map.pois.some(p=>Math.hypot(x-p.x,y-p.y)<=p.radius-radius))return true;
 return map.corridors.some(c=>c.points.slice(1).some((b,i)=>segmentDistance(x,y,c.points[i],b)<=c.width-radius));
}
export function floorTrace(map,x,y,dx,dy,radius){
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/8));
 for(let i=1;i<=steps;i++)if(!onFloor(map,x+dx*i/steps,y+dy*i/steps,radius)){
  let lo=(i-1)/steps,hi=i/steps;for(let j=0;j<12;j++){const mid=(lo+hi)/2;if(onFloor(map,x+dx*mid,y+dy*mid,radius))lo=mid;else hi=mid;}
  const hx=x+dx*lo,hy=y+dy*lo,e=.5;
  const gx=Number(onFloor(map,hx+e,hy,radius))-Number(onFloor(map,hx-e,hy,radius)),gy=Number(onFloor(map,hx,hy+e,radius))-Number(onFloor(map,hx,hy-e,radius)),length=Math.hypot(gx,gy)||1;
  const fallback=Math.hypot(dx,dy)||1;return {t:lo,nx:gx||gy?gx/length:-dx/fallback,ny:gx||gy?gy/length:-dy/fallback};
 }
 return null;
}

// Route around closed floor space through the same graph used by generation.
export function routeTo(map,actor,target){
 const nearest=point=>map.pois.reduce((best,p)=>Math.hypot(p.x-point.x,p.y-point.y)<Math.hypot(best.x-point.x,best.y-point.y)?p:best,map.pois[0]);
 const start=nearest(actor),end=nearest(target),queue=[start.id],previous=new Map([[start.id,null]]);
 for(let i=0;i<queue.length&&!previous.has(end.id);i++)for(const c of map.corridors){const next=c.from===queue[i]?c.to:c.to===queue[i]?c.from:null;if(next!==null&&!previous.has(next)){previous.set(next,queue[i]);queue.push(next);}}
 const ids=[];for(let id=end.id;id!==null;id=previous.get(id))ids.unshift(id);
 const points=[{x:start.x,y:start.y}];for(let i=1;i<ids.length;i++){const c=map.corridors.find(c=>c.from===ids[i-1]&&c.to===ids[i]||c.to===ids[i-1]&&c.from===ids[i]);points.push(...(c.from===ids[i-1]?c.points.slice(1):[...c.points].reverse().slice(1)));}points.push({x:target.x,y:target.y});return points;
}
