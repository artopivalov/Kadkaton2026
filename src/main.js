import {createState,setMode,dropWand,release,step} from './simulation.js';
import {render,renderPreview} from './renderer.js';
const $=selector=>document.querySelector(selector);
const menu=$('#menu'),game=$('#game'),canvas=$('#canvas'),ctx=canvas.getContext('2d'),joystick=$('#joystick'),stick=$('#stick');
let state=null,activePointer=null,vector={x:0,y:0},keys=new Set(),lastTime=0,noticeUntil=0;
try{const profile=JSON.parse(localStorage.getItem('kadkaton.profile'));if(profile){$('#name').value=String(profile.name||'').slice(0,24);if(/^#[0-9a-f]{6}$/i.test(profile.color))$('#color').value=profile.color;}}catch{}
function notice(message){$('#notice').textContent=message;noticeUntil=performance.now()+2300;}
function clearInput(){activePointer=null;modePointer=null;vector={x:0,y:0};keys.clear();stick.style.transform='';if(state)state.player.charge=0;}
const modeNames=['Safe','Normal','Special'];
const modeSlider=$('#mode-slider');
const wandIcon='<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M9 32 29 12" stroke="#d8b97e" stroke-width="5"/><circle cx="30" cy="10" r="6" fill="#ffac52"/></svg>';
function updateUI(){
 const p=state.player;$('#player-name').textContent=p.name;$('#charge').value=p.charge;
 const slotHTML=wandIcon+`<small>${p.wand?'Fireball':'Empty wand'}</small>`;
 if($('#wand-slot').innerHTML!==slotHTML)$('#wand-slot').innerHTML=slotHTML;
 $('#wand-slot').disabled=!p.wand;
 $('#wand-slot').setAttribute('aria-label',p.wand?'Fireball wand: tap to drop':'Wand slot: empty, auto-pickup');
 $('#wand-slot').title=p.wand?'Drop Fireball wand':'Move close to a wand to pick it up';
 const modeIndex=modeNames.indexOf(p.mode);
 modeSlider.setAttribute('aria-valuenow',modeIndex);modeSlider.setAttribute('aria-valuetext',p.mode);
 $('#mode-thumb').style.top=`${(2-modeIndex)*56+6}px`;
 for(const label of modeSlider.querySelectorAll('.mode-label'))label.classList.toggle('active',label.textContent===p.mode);
 $('#mode-help').textContent={Safe:'Safe · move without firing',Normal:'Normal · hold to charge, release to fire',Special:'Special · fully charge, release a fire wave'}[p.mode];
}
let modePointer=null;
function slideMode(event){const rect=modeSlider.getBoundingClientRect();const ratio=Math.max(0,Math.min(1,(event.clientY-rect.top-22)/(rect.height-44)));const mode=modeNames[2-Math.round(ratio*2)];if(state&&state.player.mode!==mode){setMode(state,mode);updateUI();}}
modeSlider.addEventListener('pointerdown',event=>{if(modePointer!==null)return;event.preventDefault();modePointer=event.pointerId;modeSlider.setPointerCapture(event.pointerId);slideMode(event);});
modeSlider.addEventListener('pointermove',event=>{if(event.pointerId===modePointer)slideMode(event);});
for(const type of ['pointerup','pointercancel','lostpointercapture'])modeSlider.addEventListener(type,event=>{if(event.pointerId===modePointer)modePointer=null;});
modeSlider.addEventListener('keydown',event=>{
 if(!state)return;const current=modeNames.indexOf(state.player.mode);let next=current;
 if(event.key==='ArrowUp'||event.key==='ArrowRight')next=Math.min(2,current+1);
 else if(event.key==='ArrowDown'||event.key==='ArrowLeft')next=Math.max(0,current-1);
 else if(event.key==='Home')next=0;else if(event.key==='End')next=2;else return;
 event.preventDefault();event.stopPropagation();setMode(state,modeNames[next]);updateUI();
});
const preview=$('#character-preview'),previewContext=preview.getContext('2d');
function updatePreview(){renderPreview(previewContext,$('#color').value);}
$('#color').addEventListener('input',updatePreview);$('#color').addEventListener('change',updatePreview);updatePreview();
$('#start-form').addEventListener('submit',event=>{event.preventDefault();const profile={name:$('#name').value.trim()||'Wizard',color:$('#color').value};try{localStorage.setItem('kadkaton.profile',JSON.stringify(profile));}catch{}clearInput();state=createState(profile);menu.hidden=true;game.hidden=false;updateUI();notice('Lobby ready. Select Normal or Special to cast.');});
$('#exit').addEventListener('click',()=>{clearInput();state=null;game.hidden=true;menu.hidden=false;$('#name').focus();});
$('#wand-slot').addEventListener('click',()=>{if(dropWand(state)){notice('Wand dropped. Move close to pick it up.');updateUI();}});
function position(event){const r=joystick.getBoundingClientRect();const x=event.clientX-r.left-r.width/2,y=event.clientY-r.top-r.height/2;const length=Math.hypot(x,y),radius=42;const ratio=length>radius?radius/length:1;vector={x:x*ratio/radius,y:y*ratio/radius};stick.style.transform=`translate(${vector.x*radius}px,${vector.y*radius}px)`;}
joystick.addEventListener('pointerdown',event=>{if(activePointer!==null)return;event.preventDefault();activePointer=event.pointerId;joystick.setPointerCapture(event.pointerId);position(event);});
joystick.addEventListener('pointermove',event=>{if(event.pointerId===activePointer)position(event);});
joystick.addEventListener('pointerup',event=>{if(event.pointerId!==activePointer)return;activePointer=null;vector={x:0,y:0};stick.style.transform='';if(state)release(state);});
for(const type of ['pointercancel','lostpointercapture'])joystick.addEventListener(type,event=>{if(event.pointerId===activePointer)clearInput();});
const movementKeys=new Set(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright']);
function keyboardVector(){return {x:Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),y:Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'))};}
window.addEventListener('keydown',event=>{const k=event.key.toLowerCase();if(!state||!movementKeys.has(k)||event.target===modeSlider||/INPUT|TEXTAREA/.test(event.target.tagName))return;event.preventDefault();keys.add(k);});
window.addEventListener('keyup',event=>{const k=event.key.toLowerCase();if(!movementKeys.has(k))return;const had=keys.delete(k);if(had&&state&&keys.size===0&&activePointer===null)release(state);});
window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearInput();});
function frame(now){const dt=Math.min((now-lastTime)/1000||0,1/30);lastTime=now;if(state&&!document.hidden){const before=state.player.wand;step(state,activePointer!==null?vector:keyboardVector(),dt);if(!before&&state.player.wand)notice('Wand picked up');const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);const width=Math.round(r.width*dpr),height=Math.round(r.height*dpr);if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}render(ctx,state,width,height);updateUI();if(now>noticeUntil)$('#notice').textContent='';}requestAnimationFrame(frame);}requestAnimationFrame(frame);
