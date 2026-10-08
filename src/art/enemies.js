const INK='#182c28',BONE='#e9ddbb',BRASS='#c58a45';
function disk(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.stroke();}
function polygon(c,points,color){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();c.stroke();}
function line(c,points,color=INK,width=2){c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();c.strokeStyle=INK;c.lineWidth=2;}
function skull(c,type){
 if(type==='archer'){c.strokeStyle='#785236';c.lineWidth=3;c.beginPath();c.arc(0,20,15,-Math.PI/2,Math.PI/2);c.stroke();line(c,[[0,5],[0,35]],BONE,1);line(c,[[-12,20],[20,20]],'#785236');}
 else if(type==='skeleton')polygon(c,[[0,18],[18,18],[23,21],[18,24],[0,24]],'#a48f6c');
 if(type==='jumper')for(const y of [-9,9])polygon(c,[[-12,y-3],[-24,y],[-12,y+3]],BONE);
 disk(c,0,0,17,BONE);polygon(c,[[13,-7],[21,-6],[22,6],[13,7]],'#d5c7a8');
 line(c,[[-10,-3],[-3,-2],[0,2],[6,0]],'#9b9277',1.5);
 if(type==='skeletonBoss'){polygon(c,[[-8,-17],[-13,-24],[-2,-21],[4,-27],[8,-19],[16,-23],[13,-13]],BRASS);}
}
function greenHead(c,type){const orc=type.startsWith('orc')||type==='wizard',base=orc?'#8b9565':'#839960';
 for(const sign of [-1,1])polygon(c,[[-7,sign*13],[-3,sign*(orc?24:27)],[8,sign*13]],base);
 if(type==='goblinArcher'){line(c,[[-12,20],[10,23],[18,17]],'#785236',3);disk(c,15,20,4,'#b7ada0');}
 else if(type==='orcArcher'){line(c,[[-6,23],[26,23]],'#785236',4);line(c,[[12,11],[12,35]],BRASS,4);}
 else if(type==='hooker'){line(c,[[-5,22],[20,22]],'#a5aaa0',3);c.beginPath();c.arc(20,18,7,0,Math.PI*1.5);c.stroke();}
 else if(type!=='wizard')polygon(c,[[0,20],[20,18],[25,22],[20,27],[0,24]],'#a8aaa0');
 disk(c,0,0,orc?19:16,base);disk(c,16,0,5,base);line(c,[[-10,-4],[-4,-5],[0,-2]],'#596f48',1.5);
 if(orc)for(const y of [-8,8])polygon(c,[[12,y-2],[24,y],[15,y+3]],BONE);
 if(type==='hooker'){c.strokeStyle='#625b4c';c.lineWidth=5;c.beginPath();c.arc(-2,0,16,Math.PI/2,Math.PI*1.5);c.stroke();}
 if(type==='goblinBoss')polygon(c,[[-10,-15],[-13,-22],[-3,-18],[3,-23],[11,-17],[12,-10]],BRASS);
 if(type==='orcBoss'){for(const sign of [-1,1])polygon(c,[[-9,sign*12],[-20,sign*27],[-2,sign*19]],BONE);polygon(c,[[-15,-11],[8,-10],[10,10],[-15,11]],'#785236');line(c,[[-13,0],[8,0]],BRASS,3);}
 if(type==='wizard'){polygon(c,[[-19,-10],[1,-18],[16,-10],[18,12],[-17,15]],'#715d68');polygon(c,[[8,-7],[5,8],[-24,0]],'#947b89');line(c,[[6,21],[28,21]],BRASS,3);disk(c,29,21,3,'#ef795e');}
}
function fungus(c,type,e,time){const big=type==='mushroomKeeper';disk(c,0,0,big?20:16,big?'#b88a60':'#ba7963');
 for(const [x,y,r] of big?[[-8,-8,5],[7,-6,4],[-2,10,5]]:[[0,0,6]])disk(c,x,y,r,BONE);
 if(big){c.strokeStyle=(e.openUntil??0)>time?'#e9ddbb':INK;c.lineWidth=3;c.setLineDash((e.openUntil??0)>time?[7,5]:[]);c.beginPath();c.arc(0,0,22,0,Math.PI*2);c.stroke();c.setLineDash([]);}
}
function shell(c){polygon(c,[[-20,-10],[-7,-20],[13,-16],[22,0],[13,16],[-7,20],[-20,10]],'#91aaa0');polygon(c,[[9,-16],[22,0],[9,16],[3,0]],'#52695f');line(c,[[-17,0],[3,0],[-7,-17]],'#d5d9bd');line(c,[[3,0],[-7,17]],'#d5d9bd');}
function scribe(c){line(c,[[0,23],[25,23]],BRASS,3);polygon(c,[[12,21],[24,12],[30,17],[20,23]],BONE);disk(c,0,0,16,'#a89d83');polygon(c,[[-18,-16],[16,-16],[18,16],[-16,18]],'#785236');line(c,[[-12,-10],[12,-10],[12,10]],BRASS,2);for(let i=0;i<3;i++)polygon(c,[[-18,-7+i*7],[-26,-7+i*7],[-23,-3+i*7],[-18,-3+i*7]],BONE);}
export const ENEMY_ART=Object.freeze({skeleton:skull,archer:skull,skeletonBoss:skull,jumper:skull,goblin:greenHead,goblinArcher:greenHead,goblinBoss:greenHead,orc:greenHead,orcArcher:greenHead,orcBoss:greenHead,hooker:greenHead,wizard:greenHead,mushroomKeeper:fungus,mushroom:fungus,crystalShell:shell,scribe});
export function drawEnemy(ctx,e,def,time=0){
 ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.angle);let scale=def.radius/20;if(e.flight)scale*=1+Math.sin(Math.PI*e.flight.elapsed/e.flight.duration)*.18;ctx.scale(scale,scale);ctx.strokeStyle=INK;ctx.lineWidth=2;ctx.lineJoin='round';ctx.lineCap='round';
 const art=ENEMY_ART[e.type];if(art===skull||art===greenHead)art(ctx,e.type);else if(art===fungus)art(ctx,e.type,e,time);else if(art)art(ctx);else disk(ctx,0,0,18,BONE);
 if((e.stunUntil??0)>time){ctx.strokeStyle=BRASS;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,26,0,Math.PI*1.6);ctx.stroke();}
 ctx.restore();
}
