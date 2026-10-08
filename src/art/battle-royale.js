// Presentation only: the exact safe radius comes from the authoritative simulation.
function circle(ctx,x,y,r){ctx.beginPath();ctx.arc(x,y,Math.max(0,r),0,Math.PI*2);}
function line(ctx,points){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
function glow(ctx,x,y,r,color){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,color.slice(0,7)+'00');ctx.fillStyle=g;circle(ctx,x,y,r);ctx.fill();}
function rock(ctx,x,y,size,angle){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle='#302e34';ctx.strokeStyle='#191f24';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-size,-size*.4);ctx.lineTo(-size*.4,-size);ctx.lineTo(size*.7,-size*.7);ctx.lineTo(size,size*.2);ctx.lineTo(size*.2,size*.8);ctx.lineTo(-size*.8,size*.5);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle='#55505a';ctx.lineWidth=2;line(ctx,[[-size*.4,-size],[0,-4],[size,size*.2]]);ctx.restore();}
function pillar(ctx,x,y,time,index){ctx.save();ctx.translate(x,y);ctx.fillStyle='#403a3b';ctx.strokeStyle='#181e22';ctx.lineWidth=4;ctx.fillRect(-26,-26,52,52);ctx.strokeRect(-26,-26,52,52);ctx.fillStyle='#6c5d50';circle(ctx,0,0,19);ctx.fill();ctx.stroke();ctx.strokeStyle='#b29866';ctx.lineWidth=2;circle(ctx,0,0,12);ctx.stroke();if(index%2===0){glow(ctx,0,0,95,'#ff9c3850');ctx.fillStyle='#e89436';circle(ctx,0,0,10+Math.sin(time*4+index)*2);ctx.fill();ctx.fillStyle='#ffe6a0';circle(ctx,0,-2,5);ctx.fill();}ctx.restore();}
export function drawBattleArena(ctx,s,r,time=s.time){
 const b=s.battleRoyale,R=b.radius,outer=R+240;ctx.save();ctx.fillStyle='#25252d';ctx.fillRect(-600,-600,s.world.width+1200,s.world.height+1200);
 // Ancient arena paving remains quiet enough to read projectiles and players.
 ctx.save();circle(ctx,b.x,b.y,R);ctx.clip();ctx.fillStyle='#797363';ctx.fillRect(b.x-R,b.y-R,R*2,R*2);
 ctx.lineWidth=1;ctx.strokeStyle='#625d522e';
 for(let y=-R;y<R;y+=105)for(let x=-R;x<R;x+=105){const n=Math.sin(x*3+y*7);ctx.fillStyle=n>.2?'#8b827310':'#4f4c4510';ctx.fillRect(b.x+x+2,b.y+y+2,102,102);ctx.strokeRect(b.x+x+2,b.y+y+2,102,102);if(n>.8){line(ctx,[[b.x+x+20,b.y+y],[b.x+x+32,b.y+y+20],[b.x+x+26,b.y+y+34]]);}}
 ctx.strokeStyle='#b49b6538';ctx.lineWidth=2;for(const ratio of [.42,.66]){circle(ctx,b.x,b.y,R*ratio);ctx.stroke();}
 for(let i=0;i<s.battleRoyale.participants.length;i++){const a=Math.PI/2+i*Math.PI*2/s.battleRoyale.participants.length,x=b.x+Math.cos(a)*R*.78,y=b.y+Math.sin(a)*R*.78;ctx.strokeStyle='#c8a46c80';ctx.lineWidth=2;circle(ctx,x,y,34);ctx.stroke();circle(ctx,x,y,27);ctx.stroke();ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.strokeRect(-10,-10,20,20);ctx.restore();}ctx.restore();
 // An even-odd annulus guarantees every magma effect is outside the safe disk.
 ctx.save();ctx.beginPath();ctx.arc(b.x,b.y,outer,0,Math.PI*2);if(r>0){ctx.moveTo(b.x+r,b.y);ctx.arc(b.x,b.y,r,0,Math.PI*2);}ctx.clip('evenodd');
 const magma=ctx.createRadialGradient(b.x,b.y,Math.max(0,r),b.x,b.y,outer);magma.addColorStop(0,'#ffb548');magma.addColorStop(.13,'#ed7035');magma.addColorStop(.65,'#be422e');magma.addColorStop(1,'#743136');ctx.fillStyle=magma;ctx.fillRect(b.x-outer,b.y-outer,outer*2,outer*2);
 for(let y=-outer;y<outer;y+=72)for(let x=-outer;x<outer;x+=72){const phase=Math.sin(x*12.7+y*4.3),xx=b.x+x+phase*25,yy=b.y+y+Math.cos(x*4.1+y*7.3)*25;if(Math.hypot(x,y)>outer+90||Math.hypot(x,y)<r-105)continue;const flow=Math.sin(time*.8+phase*6)*11;
  ctx.fillStyle='#682c2d50';ctx.beginPath();ctx.moveTo(xx+8,yy+10);ctx.lineTo(xx+35+phase*20,yy+5);ctx.lineTo(xx+50+phase*16,yy+35);ctx.lineTo(xx+32,yy+45+phase*15);ctx.lineTo(xx+5,yy+48);ctx.closePath();ctx.fill();
  ctx.strokeStyle=phase>0?'#ffc46799':'#ff8a4299';ctx.lineWidth=2.5+Math.sin(time+phase)*.8;line(ctx,[[xx-8,yy+flow],[xx+14,yy+13+flow],[xx+28,yy+6+flow],[xx+55,yy+19+flow]]);
  if(phase>.5){const pulse=(time*.38+phase)%1;ctx.globalAlpha=1-pulse;ctx.strokeStyle='#ffe4a1';ctx.lineWidth=2;circle(ctx,xx+37,yy+36,3+pulse*12);ctx.stroke();ctx.globalAlpha=1;}
 }
 if(r>0){ctx.strokeStyle='#ffac4a80';ctx.lineWidth=16;circle(ctx,b.x,b.y,r);ctx.stroke();ctx.strokeStyle='#ffe1a0';ctx.lineWidth=3;circle(ctx,b.x,b.y,r);ctx.stroke();}
 // Sparks rise over magma only; none are drawn over the safe floor.
 for(let i=0;i<70;i++){const a=i*2.39996,life=(time*.3+i*.137)%1,d=r+16+(i%5)*27+life*35,x=b.x+Math.cos(a)*d,y=b.y+Math.sin(a)*d-life*24;ctx.globalAlpha=(1-life)*.75;ctx.fillStyle=i%3?'#ffd47c':'#fff0bd';circle(ctx,x,y,1+(i%3)*.7);ctx.fill();}ctx.globalAlpha=1;ctx.restore();
 // Outer ruins are scenery, never additional cover or safe islands.
 for(let i=0;i<32;i++){const a=i*Math.PI/16,rr=R+290+(i%3)*70,x=b.x+Math.cos(a)*rr,y=b.y+Math.sin(a)*rr;rock(ctx,x,y,28+(i%4)*9,a);if(i%4===0){ctx.save();ctx.translate(x,y);ctx.rotate(a+Math.PI/2);ctx.strokeStyle='#191d24';ctx.lineWidth=32;ctx.beginPath();ctx.arc(0,0,65,Math.PI*.15,Math.PI*.85);ctx.stroke();ctx.strokeStyle='#625550';ctx.lineWidth=22;ctx.stroke();ctx.strokeStyle='#a08560';ctx.lineWidth=2;ctx.stroke();ctx.restore();}if(i%2===0){pillar(ctx,x,y,time,i);const next=a+Math.PI/8;ctx.strokeStyle='#494149';ctx.lineWidth=4;ctx.setLineDash([5,5]);line(ctx,[[x,y],[b.x+Math.cos(next)*rr,b.y+Math.sin(next)*rr]]);ctx.setLineDash([]);}}
 for(let i=0;i<48;i++){const a=i*Math.PI/24;ctx.save();ctx.translate(b.x+Math.cos(a)*(R+14),b.y+Math.sin(a)*(R+14));ctx.rotate(a+Math.PI/2);ctx.fillStyle='#544c4640';ctx.strokeStyle='#a38a5960';ctx.lineWidth=2;ctx.fillRect(-25,-10,50,20);ctx.strokeRect(-25,-10,50,20);ctx.restore();}
 ctx.restore();
}
export function drawArenaCover(ctx,wall){ctx.save();ctx.translate(wall.x+wall.width/2,wall.y+wall.height/2);ctx.rotate(wall.angle??0);const x=-wall.width/2,y=-wall.height/2;ctx.fillStyle='#484342';ctx.strokeStyle='#24272a';ctx.lineWidth=3;ctx.fillRect(x,y,wall.width,wall.height);ctx.strokeRect(x,y,wall.width,wall.height);ctx.strokeStyle='#8b7c65';ctx.lineWidth=2;line(ctx,[[x+3,y+3],[x+wall.width-3,y+3]]);ctx.strokeStyle='#625b50';for(let i=24;i<wall.width;i+=25)line(ctx,[[x+i,y+2],[x+i-4,y+wall.height-2]]);ctx.strokeStyle='#c4a366';ctx.lineWidth=1.5;ctx.strokeRect(-6,-5,12,10);ctx.restore();}
