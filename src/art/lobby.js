// Lobby art is decorative: portal triggers and player collision stay in simulation.
const CHALK='#e5d6ad',GOLD='#d4ac5d';
function circle(ctx,x,y,r){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);}
function line(ctx,points){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
function arrow(ctx,x,y,dx,dy){line(ctx,[[x,y],[x+dx,y+dy]]);const a=Math.atan2(dy,dx);line(ctx,[[x+dx-12*Math.cos(a-.6),y+dy-12*Math.sin(a-.6)],[x+dx,y+dy],[x+dx-12*Math.cos(a+.6),y+dy-12*Math.sin(a+.6)]]);}
function finger(ctx,x,y){ctx.save();ctx.translate(x,y);ctx.beginPath();ctx.moveTo(-12,37);ctx.lineTo(-22,15);ctx.quadraticCurveTo(-27,3,-17,5);ctx.lineTo(-8,16);ctx.lineTo(-8,-28);ctx.quadraticCurveTo(0,-41,8,-28);ctx.lineTo(8,-1);ctx.bezierCurveTo(33,-10,41,10,36,26);ctx.lineTo(29,43);ctx.stroke();ctx.restore();}
function wand(ctx,x,y){line(ctx,[[x-14,y+18],[x+12,y-16]]);ctx.strokeStyle=GOLD;circle(ctx,x+14,y-20,7);ctx.stroke();ctx.strokeStyle=CHALK;}
function tip(ctx,x,y,label,kind){ctx.save();ctx.translate(x,y);ctx.strokeStyle=CHALK;ctx.fillStyle=CHALK;ctx.lineWidth=5;ctx.lineCap='round';ctx.lineJoin='round';
 if(kind==='hold'||kind==='release'){circle(ctx,-22,-12,30);ctx.stroke();finger(ctx,-22,4);wand(ctx,39,-16);
  if(kind==='hold'){ctx.strokeStyle=GOLD;ctx.lineWidth=7;ctx.beginPath();ctx.arc(-22,-12,38,-Math.PI/2,Math.PI*.6);ctx.stroke();}
  else{arrow(ctx,-22,-49,0,-25);ctx.strokeStyle=GOLD;arrow(ctx,55,-34,26,-9);circle(ctx,91,-46,6);ctx.stroke();}
 }else if(kind==='move'){circle(ctx,-8,-4,34);ctx.stroke();circle(ctx,4,8,14);ctx.stroke();finger(ctx,4,29);ctx.strokeStyle=GOLD;arrow(ctx,-8,-46,0,-19);arrow(ctx,-49,-4,-19,0);arrow(ctx,33,-4,19,0);
 }else{ctx.beginPath();ctx.roundRect(-21,-53,35,97,17);ctx.stroke();for(const yy of [-36,-5,27]){circle(ctx,-4,yy,7);ctx.stroke();}ctx.strokeStyle=GOLD;circle(ctx,-4,-5,15);ctx.stroke();arrow(ctx,39,-27,0,-27);arrow(ctx,39,1,0,27);ctx.strokeStyle=CHALK;finger(ctx,-4,8);}
 ctx.fillStyle=CHALK;ctx.font='700 19px system-ui';ctx.textAlign='center';ctx.fillText(label,0,84);ctx.restore();}
function lantern(ctx,x,y,time){ctx.save();ctx.translate(x,y);const glow=ctx.createRadialGradient(0,0,3,0,0,110);glow.addColorStop(0,'#ffbe5960');glow.addColorStop(1,'#ffbe5900');ctx.fillStyle=glow;circle(ctx,0,0,110);ctx.fill();ctx.fillStyle='#30251f';ctx.strokeStyle='#826347';ctx.lineWidth=4;ctx.fillRect(-15,-21,30,43);ctx.strokeRect(-15,-21,30,43);ctx.fillStyle='#f3b348';circle(ctx,0,2,9+Math.sin(time*3+x)*1.5);ctx.fill();ctx.fillStyle='#ffe6a4';circle(ctx,0,0,5);ctx.fill();ctx.restore();}
export function drawLobby(ctx,world,time){ctx.save();ctx.fillStyle='#151e20';ctx.fillRect(0,0,world.width,world.height);
 for(let y=0;y<world.height;y+=80)for(let x=0;x<world.width;x+=80){const n=((x*17+y*31)%97)/97;ctx.fillStyle=['#253333','#283735','#2d3a38','#243231'][Math.floor(n*4)];ctx.beginPath();ctx.moveTo(x+10,y+3);ctx.lineTo(x+69,y+4);ctx.lineTo(x+77,y+12);ctx.lineTo(x+75,y+69);ctx.lineTo(x+67,y+77);ctx.lineTo(x+11,y+75);ctx.lineTo(x+3,y+66);ctx.lineTo(x+4,y+11);ctx.closePath();ctx.fill();ctx.strokeStyle='#3c4841';ctx.lineWidth=2;ctx.stroke();ctx.strokeStyle='#172322';line(ctx,[[x+7,y+74],[x+73,y+74]]);if(n>.6){ctx.strokeStyle='#38463c';ctx.lineWidth=1;line(ctx,[[x+12,y+6],[x+19,y+20],[x+14,y+31]]);}}
 // Raised border, hanging banners and moss frame the central arrival hall.
 for(const x of [250,930])for(let y=0;y<world.height;y+=64){ctx.fillStyle=y%128?'#465044':'#3d473e';ctx.strokeStyle='#182421';ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(x,y,38,60,5);ctx.fill();ctx.stroke();}
 for(const x of [280,920])for(const y of [210,470,810]){lantern(ctx,x,y,time);ctx.fillStyle='#3f2a4c';ctx.strokeStyle='#8d6e47';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-15,y+36);ctx.lineTo(x+15,y+36);ctx.lineTo(x+15,y+106);ctx.lineTo(x,y+96);ctx.lineTo(x-15,y+106);ctx.closePath();ctx.fill();ctx.stroke();}
 for(let i=0;i<35;i++){const x=i%2?294:906,y=35+i*25;ctx.fillStyle=i%3?'#536143':'#687044';ctx.beginPath();ctx.ellipse(x+Math.sin(i*3)*8,y,5,9,i,0,Math.PI*2);ctx.fill();}
 ctx.fillStyle='#3e2945';ctx.strokeStyle='#8d7046';ctx.lineWidth=4;ctx.fillRect(535,968,130,72);ctx.strokeRect(535,968,130,72);ctx.strokeStyle='#b59259';line(ctx,[[551,1038],[551,982],[649,982],[649,1038]]);
 tip(ctx,490,690,'HOLD','hold');tip(ctx,700,690,'RELEASE','release');tip(ctx,490,845,'MOVE','move');tip(ctx,700,845,'SWITCH','switch');ctx.restore();}
export function drawLobbyPortal(ctx,portal,time){ctx.save();ctx.translate(portal.x,portal.y);const purple=portal.location==='battleRoyale'?'#e09550':'#ae7bec';ctx.fillStyle='#172223';circle(ctx,0,0,65);ctx.fill();ctx.strokeStyle='#4c5149';ctx.lineWidth=13;circle(ctx,0,0,56);ctx.stroke();
 for(let i=0;i<10;i++){ctx.save();ctx.rotate(i*Math.PI/5);ctx.strokeStyle='#202a27';ctx.lineWidth=3;line(ctx,[[47,0],[64,0]]);ctx.restore();}
 const glow=ctx.createRadialGradient(0,0,3,0,0,78);glow.addColorStop(0,portal.location==='battleRoyale'?'#ffb263b0':'#a45bf2b0');glow.addColorStop(1,'#6f3aaa00');ctx.fillStyle=glow;circle(ctx,0,0,78);ctx.fill();ctx.fillStyle='#392549';circle(ctx,0,0,43);ctx.fill();ctx.strokeStyle=purple;ctx.lineWidth=3;circle(ctx,0,0,44);ctx.stroke();
 for(let i=0;i<3;i++){ctx.save();ctx.rotate(time*.35+i*2.1);ctx.globalAlpha=.35+i*.16;ctx.beginPath();ctx.arc(0,0,15+i*9,.2,4.4);ctx.stroke();ctx.restore();}
 for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.save();ctx.translate(Math.cos(a)*56,Math.sin(a)*56);ctx.rotate(a);ctx.fillStyle=purple;ctx.fillRect(-5,-2,10,4);ctx.restore();}
 ctx.fillStyle='#ece0c7';ctx.textAlign='center';ctx.font='600 16px system-ui';ctx.fillText(portal.label,0,89);ctx.font='12px system-ui';ctx.fillStyle='#baa9c9';ctx.fillText(portal.available?'Enter together':'Waiting for players',0,108);ctx.restore();}
