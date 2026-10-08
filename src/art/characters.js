const INK='#182c28';
export function drawWizard(ctx,p,tipColor){
 const value=(p.color??'#ef795e').replace('#','');
 const rgb=value.length===6?[0,2,4].map(i=>parseInt(value.slice(i,i+2),16)):[120,120,120];
 const ink=rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722<65?'#e9ddbb':INK;
 ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=1.8;
 // The right-hand wand sits behind the brim and points along local +X.
 if(p.wand){
  ctx.strokeStyle=ink;ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(4,12);ctx.lineTo(30,12);ctx.stroke();
  ctx.strokeStyle='#785236';ctx.lineWidth=3;ctx.stroke();
  ctx.fillStyle=tipColor;ctx.strokeStyle=ink;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(38,12);ctx.lineTo(32,8);ctx.lineTo(27,12);ctx.lineTo(32,16);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#c58a45';ctx.fillRect(25,9,3,6);
 }
 ctx.fillStyle=p.color;ctx.strokeStyle=ink;ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(21,0);ctx.bezierCurveTo(22,13,12,21,0,20);ctx.bezierCurveTo(-12,23,-22,12,-21,0);ctx.bezierCurveTo(-22,-12,-11,-22,0,-20);ctx.bezierCurveTo(12,-23,22,-12,21,0);ctx.closePath();ctx.fill();ctx.stroke();
 // Flat overlays derive all cloth accents from the chosen player color.
 ctx.save();ctx.globalAlpha*=.16;ctx.fillStyle=INK;ctx.beginPath();ctx.arc(0,0,12,0,Math.PI*2);ctx.fill();ctx.restore();
 ctx.strokeStyle='#785236';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,11,-Math.PI*.75,Math.PI*.75);ctx.stroke();
 ctx.fillStyle='#c58a45';ctx.strokeStyle=ink;ctx.lineWidth=1;ctx.fillRect(8,-3,5,6);ctx.strokeRect(8,-3,5,6);
 ctx.fillStyle=p.color;ctx.lineWidth=1.7;ctx.beginPath();ctx.moveTo(7,-7);ctx.bezierCurveTo(0,-13,-9,-9,-13,-5);ctx.bezierCurveTo(-18,-2,-19,0,-24,0);ctx.bezierCurveTo(-27,0,-24,4,-20,4);ctx.bezierCurveTo(-10,8,-2,11,5,7);ctx.bezierCurveTo(11,3,12,-3,7,-7);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.save();ctx.globalAlpha*=.18;ctx.fillStyle=INK;ctx.beginPath();ctx.moveTo(-23,2);ctx.quadraticCurveTo(-7,9,5,7);ctx.quadraticCurveTo(-2,4,-8,2);ctx.closePath();ctx.fill();ctx.restore();
 ctx.strokeStyle=ink;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-3,-17);ctx.lineTo(-1,-13);ctx.moveTo(15,7);ctx.lineTo(17,9);ctx.moveTo(13,-10);ctx.lineTo(16,-12);ctx.stroke();
 ctx.save();ctx.translate(-7,13);ctx.rotate(.2);ctx.globalAlpha*=.65;ctx.strokeRect(-3,-3,6,6);ctx.beginPath();ctx.moveTo(-4,-1);ctx.lineTo(-2,-1);ctx.moveTo(2,1);ctx.lineTo(4,1);ctx.moveTo(0,-4);ctx.lineTo(0,-2);ctx.stroke();ctx.restore();
 ctx.restore();
}
