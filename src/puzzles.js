import {PUZZLE_BALANCE as B,PUZZLE_POOLS,CONFIG} from './balance.js';
import {createWand} from './items.js';
const TAU=Math.PI*2;
export const PUZZLES={
 wisps:{name:'Lost wisps',hint:'Lead each numbered wisp around the stones to its matching altar.',wands:[]},
 billiards:{name:'Stone billiards',hint:'Earth Normal: bank the boulder off the marked wall into the crystal.',wands:['earth']},
 roots:{name:'Root garden',hint:'Nature: root each moving sprout inside its matching flower bed.',wands:['nature']},
 constellation:{name:'Constellation',hint:'Gravity pulls numbered balls into matching sockets; Air corrects their position.',wands:['gravity','air']},
 lightCorridor:{name:'Light corridor',hint:'Light Special blocks safe beams. Reach both switches; a beam returns you to the entrance.',wands:['light']},
 returnKey:{name:'Returning key',hint:'Light Normal: hit A going out, then move so the same returning disc hits B.',wands:['light']},
 crystalFork:{name:'Crystal fork',hint:'Crystal Normal: hit the diamond, then both child shards must hit its side seals.',wands:['crystal']},
 books:{name:'Living library',hint:'Read the books and step on symbols in the inferred order. An error resets the sequence.',wands:[]},
 clock:{name:'Shadows on the dial',hint:'Watch the pointer, then repeat its sequence by stepping on symbols. An error replays it.',wands:[]},
 scales:{name:'Guardian scales',hint:'Push all four stones onto the pans: balance their total weight. Body or any wand works.',wands:[]},
 plates:{name:'Ordered plates',hint:'Step on every numbered plate in order. A wrong step resets all progress.',wands:[]}
};
const at=(poi,x,y)=>({x:poi.x+x,y:poi.y+y});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function createPuzzle(poi,location,random,partySize=1,kind=null){
 const pool=PUZZLE_POOLS[location];kind??=pool[Math.floor(random()*pool.length)];
 const q={kind,name:PUZZLES[kind].name,hint:PUZZLES[kind].hint,objects:[],docks:[],walls:[],marks:[],progress:0,contacts:[],resetTouch:false,reset:at(poi,350,230),entry:at(poi,0,350)};
 const obj=(role,x,y,extra={})=>{const o={id:`q${poi.id}:${q.objects.length}`,puzzle:true,poi:poi.id,role,...at(poi,x,y),radius:B.objectRadius,active:false,...extra};o.home={x:o.x,y:o.y};q.objects.push(o);return o;};
 const dock=(x,y,symbol)=>{const d={...at(poi,x,y),symbol,radius:B.dockRadius};q.docks.push(d);return d;};
 const wall=(x,y,width,height)=>q.walls.push({...at(poi,x,y),width,height});
 const mark=(x,y,label)=>q.marks.push({...at(poi,x,y),label});
 poi.plates=[];
 if(['plates','books','clock'].includes(kind)){
  const count=kind==='plates'?B.plateMin+Math.floor(random()*(B.plateMax-B.plateMin+1)):kind==='books'?4:5;
  const rotation=random()*TAU,positions=Array.from({length:count},(_,i)=>at(poi,Math.cos(rotation+i/count*TAU)*B.plateRing,Math.sin(rotation+i/count*TAU)*B.plateRing));
  // Shuffle positions without hiding the ordered labels. Ring sectors guarantee spacing and accessibility.
  for(let i=count-1;i>0;i--){const n=Math.floor(random()*(i+1));[positions[i],positions[n]]=[positions[n],positions[i]];}
  poi.plates=positions.map((point,i)=>({...point,order:i,active:false,label:kind==='plates'?String(i+1):['Moon','Tree','Star','Flame','Sun'][i]}));
  if(kind==='books')q.books=[{...at(poi,-190,100),text:'Moon before Tree'}, {...at(poi,190,100),text:'Tree before Star'}, {...at(poi,0,-230),text:'Flame comes last'}];
  if(kind==='clock'){q.sequence=Array.from({length:partySize>1?B.clockCoop:B.clockSolo},(_,i)=>{let n=Math.floor(random()*count);if(i&&n===q.sequence?.[i-1])n=(n+1)%count;return n;});for(let i=1;i<q.sequence.length;i++)if(q.sequence[i]===q.sequence[i-1])q.sequence[i]=(q.sequence[i]+1)%count;q.phase='show';q.elapsed=0;}
 }else if(kind==='wisps'||kind==='roots'){
  const count=partySize>1?3:2;
  for(let i=0;i<count;i++){const x=(i-(count-1)/2)*200;dock(x,-180,i+1);const o=obj(kind==='wisps'?'wisp':'sprout',x,160,{symbol:i+1,phase:random()*TAU,hold:0});if(kind==='roots'){o.x=o.home.x+Math.sin(o.phase)*B.plantOrbitX;o.y=poi.y+Math.cos(o.phase)*B.plantOrbitY;}}
  if(kind==='wisps'){wall(-90,-40,60,130);wall(30,-40,60,130);}
 }else if(kind==='billiards'){
  const count=partySize>1?2:1;wall(-100,-220,200,20);wall(-30,60,60,190);
  obj('bankCrystal',220,180,{symbol:1});mark(-220,180,'Shoot ↗');mark(0,-200,'Bounce');
  if(count>1){obj('bankCrystal',-220,180,{symbol:2});mark(220,180,'Shoot ↖');}
 }else if(kind==='constellation'){
  for(let i=0;i<3;i++){const x=(i-1)*210;dock(x,-170,i+1);obj('ball',x,160,{symbol:i+1,movable:true});}
  mark(0,-260,'1   ·   2   ·   3');
 }else if(kind==='lightCorridor'){
  obj('switch',-100,-190);obj('switch',100,-190);q.beams=[];q.blocked=[false,false];q.beamTimer=0;q.sources=[at(poi,-500,40),at(poi,-500,-70)];mark(0,220,'Start here');
 }else if(kind==='returnKey'){
  const count=partySize>1?2:1;
  for(let i=0;i<count;i++){const dx=i?200:-100;obj('outSeal',dx-60,-130,{pair:i,label:`${i+1}A`});obj('backSeal',dx+80,20,{pair:i,label:`${i+1}B`});mark(dx-150,180,'Throw ↗ then move →');}
  q.casts={};
 }else if(kind==='crystalFork'){
  const count=partySize>1?2:1;
  for(let i=0;i<count;i++){const x=count===1?0:(i?180:-180);obj('fork',x,-40,{pair:i,label:'◆'});for(const side of [-1,1])obj('forkSeal',x+side*56,-210,{pair:i,label:side<0?'L':'R'});mark(x,220,'Shoot ↑');}q.casts={};
 }else if(kind==='scales'){
  dock(-180,-140,'Left');dock(180,-140,'Right');q.docks.forEach(d=>d.radius=B.scalePanRadius);
  B.scaleWeights.forEach((weight,i)=>obj('stone',(i-1.5)*90,160,{weight,movable:true}));q.sums=[0,0];
 }
 poi.puzzle=q;q.initial=structuredClone({...q,initial:undefined});delete q.initial.initial;return q;
}
export function puzzleAt(s,point){return s.map?.pois.find(p=>p.type==='puzzle'&&p.puzzle&&distance(p,point)<=p.radius)??null;}
export function puzzleActors(s){return s.map?.pois.flatMap(p=>!p.completed?p.puzzle?.objects.filter(o=>!o.active)??[]:[])??[];}
export function installPuzzles(s){
 for(const poi of s.map.pois){const q=poi.puzzle;if(!q)continue;
  for(const w of q.walls)s.walls.push({...w,id:s.nextId++,permanent:true,puzzlePoi:poi.id,kind:'puzzleWall'});
  PUZZLES[q.kind].wands.forEach((type,i)=>s.items.push({id:s.nextId++,...createWand(type,'Common',()=>.4),...at(poi,(i-(PUZZLES[q.kind].wands.length-1)/2)*B.wandOffset,350),availableAt:s.time,puzzleWand:poi.id}));
 }
}
export function resetPuzzle(s,player){
 const poi=puzzleAt(s,player);if(!poi||poi.completed)return false;
 const initial=poi.puzzle.initial;poi.puzzle={...structuredClone(initial),initial};poi.plates.forEach(p=>p.active=false);
 s.projectiles=s.projectiles.filter(b=>b.puzzlePoi!==poi.id);s.effects=s.effects.filter(e=>e.puzzlePoi!==poi.id);s.walls=s.walls.filter(w=>w.puzzlePoi!==poi.id||w.permanent);
 return true;
}
function finish(s,poi){
 poi.completed=true;poi.plates.forEach(p=>p.active=true);const q=poi.puzzle;q.objects.forEach(o=>o.active=true);if(q.beams)q.beams=[];
 s.walls=s.walls.filter(w=>w.puzzlePoi!==poi.id);s.projectiles=s.projectiles.filter(b=>b.puzzlePoi!==poi.id);s.effects=s.effects.filter(e=>e.puzzlePoi!==poi.id);
}
export function puzzleHit(s,o,attack,origin,{move}){
 const poi=s.map?.pois[o.poi];if(!poi?.puzzle||poi.completed)return;const q=poi.puzzle,type=attack.spellType,id=String(attack.rootId??attack.id);
 if(o.movable&&(o.role==='stone'||type==='air')){const dx=o.x-(origin.x??o.x-Math.cos(attack.angle??0)),dy=o.y-(origin.y??o.y-Math.sin(attack.angle??0)),d=Math.hypot(dx,dy)||1;move(s,o,dx/d*B.shotPush,dy/d*B.shotPush,o.radius);}
 if(o.role==='ball'&&type==='gravity'&&attack.kind==='gravityOrb'){const p=s.players.find(p=>p.id===attack.owner);if(p){const d=distance(o,p)||1;move(s,o,(p.x-o.x)/d*B.shotPush,(p.y-o.y)/d*B.shotPush,o.radius);}}
 if(o.role==='sprout'&&type==='nature')o.rootUntil=s.time+(attack.rootDuration??1.3);
 if(o.role==='bankCrystal'&&attack.kind==='boulder'&&attack.ricochets>0)o.active=true;
 if(q.kind==='returnKey'&&attack.kind==='lightDisc'){
  if(o.role==='outSeal'&&!attack.returning)q.casts[id]={pair:o.pair};
  if(o.role==='backSeal'&&attack.returning&&q.casts[id]?.pair===o.pair)q.objects.filter(x=>x.pair===o.pair).forEach(x=>x.active=true);
 }
 if(q.kind==='crystalFork'&&attack.kind==='crystalShard'){
  if(o.role==='fork'&&!attack.child)q.casts[id]={pair:o.pair,seals:[]};
  if(o.role==='forkSeal'&&attack.child&&q.casts[id]?.pair===o.pair){const cast=q.casts[id];if(!cast.seals.includes(o.id))cast.seals.push(o.id);if(cast.seals.length===2)q.objects.filter(x=>x.pair===o.pair).forEach(x=>x.active=true);}
 }
}
// Safe mechanisms are independent of combat projectiles and never call damage().
export function tickPuzzles(s,dt,{move,trace}){
 if(!s.map||s.scene.viewer)return;
 const players=s.players.filter(p=>p.health>0);
 for(const poi of s.map.pois){let q=poi.puzzle;if(!q||poi.completed)continue;
  if(q.casts){const live=new Set(s.projectiles.map(b=>String(b.rootId??b.id)));for(const id of Object.keys(q.casts))if(!live.has(id))delete q.casts[id];}
  const here=players.filter(p=>distance(p,poi)<=poi.radius);
  if(!here.length){q.contacts=[];q.resetTouch=false;continue;}
  const resetter=here.find(p=>distance(p,q.reset)<=B.resetRadius);if(resetter&&!q.resetTouch){resetPuzzle(s,resetter);q=poi.puzzle;}q.resetTouch=Boolean(resetter);
  if(q.kind==='clock'&&q.phase==='show'){
   q.elapsed+=dt;const beat=Math.floor(q.elapsed/B.clockBeat);q.pointer=beat<q.sequence.length&&q.elapsed%B.clockBeat<B.clockBeat-B.clockGap?q.sequence[beat]:null;
   if(beat>=q.sequence.length){q.phase='input';q.pointer=null;q.progress=0;}q.contacts=contacts(poi,here);continue;
  }
  if(['plates','books','clock'].includes(q.kind)){
   const touching=contacts(poi,here),entered=touching.filter(n=>!q.contacts.includes(n));q.contacts=touching;
   // Simultaneous different plates are ambiguous and reset; one plate with multiple players activates once.
   if(entered.length){const expected=q.kind==='clock'?q.sequence[q.progress]:q.progress;
    if(entered.length!==1||entered[0]!==expected){q.progress=0;poi.plates.forEach(p=>p.active=false);if(q.kind==='clock'){q.phase='show';q.elapsed=0;}}
    else{poi.plates[expected].active=true;q.progress++;if(q.progress===(q.sequence?.length??poi.plates.length))finish(s,poi);}
   }continue;
  }
  for(const o of q.objects){if(o.active)continue;
   if(o.role==='wisp'){
    const nearest=here.reduce((a,p)=>!a||distance(o,p)<distance(o,a)?p:a,null),d=distance(o,nearest);if(d>B.followDistance){const amount=Math.min(B.followSpeed*dt,d-B.followDistance);move(s,o,(nearest.x-o.x)/d*amount,(nearest.y-o.y)/d*amount,o.radius);}
   }else if(o.role==='sprout'&&(o.rootUntil??0)<=s.time){o.phase+=dt*B.plantSpeed/B.plantOrbitY;const x=o.home.x+Math.sin(o.phase)*B.plantOrbitX,y=poi.y+Math.cos(o.phase)*B.plantOrbitY;move(s,o,x-o.x,y-o.y,o.radius);}
   if(o.role==='stone')for(const p of here){const d=distance(o,p);if(d<CONFIG.playerRadius+o.radius){const angle=d>.001?Math.atan2(o.y-p.y,o.x-p.x):p.angle;move(s,o,Math.cos(angle)*Math.max(B.bodyPush*dt,CONFIG.playerRadius+o.radius-d+.01),Math.sin(angle)*Math.max(B.bodyPush*dt,CONFIG.playerRadius+o.radius-d+.01),o.radius);}}
   if(['wisp','sprout','ball'].includes(o.role)){
    const d=q.docks.find(d=>d.symbol===o.symbol&&distance(d,o)<=d.radius-o.radius/2);
    if(o.role==='sprout'){o.hold=d&&(o.rootUntil??0)>s.time?o.hold+dt:0;if(o.hold>=B.rootHold){o.active=true;o.x=d.x;o.y=d.y;}}
    else if(d){o.active=true;o.x=d.x;o.y=d.y;}
   }
   if(o.role==='switch'&&q.blocked.every(Boolean)&&here.some(p=>distance(p,o)<B.plateRadius))o.active=true;
  }
  if(q.kind==='lightCorridor'){
   q.beamTimer-=dt;while(q.beamTimer<=0){for(const [sourceIndex,source] of q.sources.entries())q.beams.push({...source,source:sourceIndex,distance:0});q.beamTimer+=B.beamInterval;}
   q.beams=q.beams.filter(b=>{const dx=B.beamSpeed*dt,hit=trace(s,b.x,b.y,dx,0,B.beamRadius);const end=b.x+dx*(hit?.t??1);if(hit?.wall?.kind==='lightWall')q.blocked[b.source??0]=true;
    for(const p of here)if(segmentDistance(p.x,p.y,b.x,b.y,end,b.y)<CONFIG.playerRadius+B.beamRadius){p.x=q.entry.x;p.y=q.entry.y;p.charge=0;}b.x=end;b.distance+=dx;return !hit&&b.distance<B.beamRange;
   });
  }
  if(q.kind==='scales'){
   q.sums=q.docks.map(d=>q.objects.filter(o=>distance(o,d)<=d.radius-o.radius).reduce((sum,o)=>sum+o.weight,0));
   if(q.sums[0]===B.scaleWeights.reduce((a,b)=>a+b,0)/2&&q.sums[1]===q.sums[0]&&q.objects.every(o=>q.docks.some(d=>distance(d,o)<=d.radius-o.radius)))finish(s,poi);
  }else if(q.objects.length&&q.objects.every(o=>o.active))finish(s,poi);
 }
}
function contacts(poi,players){return poi.plates.flatMap((plate,i)=>players.some(p=>distance(p,plate)<B.plateRadius)?[i]:[]);}
function segmentDistance(x,y,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-ax-t*dx,y-ay-t*dy);}

export function drawPuzzle(ctx,poi,time){
 const q=poi.puzzle;if(!q)return;ctx.save();ctx.textAlign='center';ctx.font='18px system-ui';ctx.fillStyle='#302c34';ctx.fillText(q.name,poi.x,poi.y-poi.radius+48);
 ctx.font='14px system-ui';ctx.fillStyle='#34303a';
 // Clues are concise in-world text; full instructions are also available in the HUD.
 for(const m of q.marks)ctx.fillText(m.label,m.x,m.y);
 for(const d of q.docks){ctx.strokeStyle='#66573d';ctx.lineWidth=3;ctx.beginPath();ctx.arc(d.x,d.y,d.radius,0,TAU);ctx.stroke();ctx.fillText(String(d.symbol),d.x,d.y+5);}
 for(const book of q.books??[]){ctx.fillStyle='#b39975';ctx.fillRect(book.x-22,book.y-17,44,34);ctx.fillStyle='#342d25';ctx.fillText(book.text,book.x,book.y+38);}
 for(const plate of poi.plates){ctx.fillStyle=plate.active?'#65ce9f':q.pointer===plate.order?'#ffe098':'#8972b1';ctx.beginPath();ctx.arc(plate.x,plate.y,B.plateRadius,0,TAU);ctx.fill();ctx.fillStyle='#fff';ctx.fillText(plate.label,plate.x,plate.y+5);}
 if(q.kind==='clock'&&!poi.completed){ctx.fillStyle='#40363b';ctx.fillText(q.phase==='show'?'Watch…':`Repeat ${q.progress}/${q.sequence.length}`,poi.x,poi.y+90);if(q.pointer!==null&&q.pointer!==undefined){const plate=poi.plates[q.pointer];ctx.strokeStyle='#ffdf86';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(poi.x,poi.y);ctx.lineTo(plate.x,plate.y);ctx.stroke();}}
 if(q.kind==='scales'){ctx.strokeStyle='#dfc68d';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(q.docks[0].x,q.docks[0].y);ctx.lineTo(q.docks[1].x,q.docks[1].y);ctx.stroke();ctx.fillStyle='#342d25';ctx.fillText(`${q.sums[0]} ${q.sums[0]===q.sums[1]?'=':q.sums[0]>q.sums[1]?'>':'<'} ${q.sums[1]}`,poi.x,poi.y-190);}
 for(const o of q.objects){ctx.fillStyle=o.active?'#69d5a7':o.role==='wisp'?'#f6da85':o.role==='sprout'?'#75c784':o.role==='ball'?'#b2c9df':o.role==='stone'?'#b8a184':'#daafff';ctx.strokeStyle='#615246';ctx.lineWidth=2;ctx.beginPath();ctx.arc(o.x,o.y,o.radius,0,TAU);ctx.fill();ctx.stroke();ctx.fillStyle='#17272e';ctx.fillText(String(o.weight??o.symbol??o.label??'●'),o.x,o.y+5);if((o.rootUntil??0)>time){ctx.strokeStyle='#72e79f';ctx.beginPath();ctx.arc(o.x,o.y,o.radius+5,0,TAU);ctx.stroke();}}
 for(const source of q.sources??[]){ctx.fillStyle=poi.completed?'#637c74':'#a0e9f3';ctx.fillRect(source.x-12,source.y-12,24,24);}
 for(const b of q.beams??[]){ctx.fillStyle='#a0e9f3';ctx.beginPath();ctx.arc(b.x,b.y,B.beamRadius,0,TAU);ctx.fill();}
 if(!poi.completed){ctx.strokeStyle='#715c3d';ctx.strokeRect(q.reset.x-30,q.reset.y-22,60,44);ctx.fillStyle='#42372b';ctx.fillText('Reset',q.reset.x,q.reset.y+5);}ctx.restore();
}
