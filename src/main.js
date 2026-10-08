import {step,getPlayer} from './simulation.js';
import {render,renderPreview} from './renderer.js';
import {WANDS} from './wands.js';
import {createScene} from './scene.js';
const $=selector=>document.querySelector(selector);
const menu=$('#menu'),game=$('#game'),canvas=$('#canvas'),ctx=canvas.getContext('2d'),joystick=$('#joystick'),stick=$('#stick');
let state=null,localId=null,pending=[],accumulator=0,activePointer=null,vector={x:0,y:0},keys=new Set(),lastTime=0,noticeUntil=0;
try{const profile=JSON.parse(localStorage.getItem('kadkaton.profile'));if(profile){$('#name').value=String(profile.name||'').slice(0,24);if(/^#[0-9a-f]{6}$/i.test(profile.color))$('#color').value=profile.color;}}catch{}
function notice(message){$('#notice').textContent=message;noticeUntil=performance.now()+2300;}
function clearInput(){activePointer=null;modePointer=null;vector={x:0,y:0};keys.clear();stick.style.transform='';pending.length=0;if(state)pending.push({type:'cancel'});}
const modeNames=['Safe','Normal','Special'];
const TICK=1/60;
const me=()=>getPlayer(state,localId);
const modeSlider=$('#mode-slider');
function wandIcon(type){const color=WANDS[type].color;const tip=type==='lightning'?`<path d="m31 3-9 14h7l-6 13 14-18h-8Z" fill="${color}"/>`:type==='ice'?`<path d="m30 3 7 12-7 8-7-8Z" fill="${color}"/>`:`<circle cx="30" cy="10" r="6" fill="${color}"/>`;return `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M9 32 29 12" stroke="#d8b97e" stroke-width="5"/>${tip}</svg>`;}
function updateUI(){
 const p=me();$('#player-name').textContent=p.name;$('#charge').value=p.charge;
 const definition=p.wand?WANDS[p.wand.type]:null;
 const wandName=definition?(definition.name.endsWith('Wand')?definition.name:`${definition.name} wand`):'';
 const slotHTML=(p.wand?wandIcon(p.wand.type):'<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M9 32 29 12" stroke="#78889e" stroke-width="5"/></svg>')+`<small>${definition?definition.name:'Empty wand'}</small>`;
 if($('#wand-slot').innerHTML!==slotHTML)$('#wand-slot').innerHTML=slotHTML;
 $('#wand-slot').disabled=!p.wand;
 $('#wand-slot').setAttribute('aria-label',p.wand?`${wandName}: tap to drop`:'Wand slot: empty, auto-pickup');
 $('#wand-slot').title=p.wand?`Drop ${wandName}`:'Move close to a wand to pick it up';
 const modeIndex=modeNames.indexOf(p.mode);
 modeSlider.setAttribute('aria-valuenow',modeIndex);modeSlider.setAttribute('aria-valuetext',p.mode);
 $('#mode-thumb').style.top=`${(2-modeIndex)*56+6}px`;
 for(const label of modeSlider.querySelectorAll('.mode-label'))label.classList.toggle('active',label.textContent===p.mode);
 $('#mode-help').textContent=!definition?'Empty wand slot · move close to a wand to pick it up.':p.mode==='Safe'?`${definition.name} · Safe · no casting`:`${definition.name} · ${p.mode} · ${p.mode==='Normal'?definition.normalHelp:definition.specialHelp}`;
}
let modePointer=null;
function slideMode(event){const rect=modeSlider.getBoundingClientRect();const ratio=Math.max(0,Math.min(1,(event.clientY-rect.top-22)/(rect.height-44)));const mode=modeNames[2-Math.round(ratio*2)];if(state&&me().mode!==mode)pending.push({type:'setMode',mode});}
modeSlider.addEventListener('pointerdown',event=>{if(modePointer!==null)return;event.preventDefault();modePointer=event.pointerId;modeSlider.setPointerCapture(event.pointerId);slideMode(event);});
modeSlider.addEventListener('pointermove',event=>{if(event.pointerId===modePointer)slideMode(event);});
for(const type of ['pointerup','pointercancel','lostpointercapture'])modeSlider.addEventListener(type,event=>{if(event.pointerId===modePointer)modePointer=null;});
modeSlider.addEventListener('keydown',event=>{
 if(!state)return;const current=modeNames.indexOf(me().mode);let next=current;
 if(event.key==='ArrowUp'||event.key==='ArrowRight')next=Math.min(2,current+1);
 else if(event.key==='ArrowDown'||event.key==='ArrowLeft')next=Math.max(0,current-1);
 else if(event.key==='Home')next=0;else if(event.key==='End')next=2;else return;
 event.preventDefault();event.stopPropagation();pending.push({type:'setMode',mode:modeNames[next]});
});
const preview=$('#character-preview'),previewContext=preview.getContext('2d');
function updatePreview(){renderPreview(previewContext,$('#color').value);}
$('#color').addEventListener('input',updatePreview);$('#color').addEventListener('change',updatePreview);updatePreview();
$('#start-form').addEventListener('submit',event=>{event.preventDefault();const profile={name:$('#name').value.trim()||'Wizard',color:$('#color').value};try{localStorage.setItem('kadkaton.profile',JSON.stringify(profile));}catch{}clearInput();state=createScene(profile);localId=state.players[0].id;pending.length=0;accumulator=0;menu.hidden=true;game.hidden=false;updateUI();game.setAttribute('aria-label',state.scene.title);canvas.setAttribute('aria-label',state.scene.title);$('#scene-title').textContent=state.scene.title;notice(state.scene.description);});
$('#exit').addEventListener('click',()=>{clearInput();state=null;localId=null;game.hidden=true;menu.hidden=false;$('#name').focus();});
$('#wand-slot').addEventListener('click',()=>{if(me()?.wand){pending.push({type:'drop'});notice('Wand dropped. Move close to pick it up.');}});
function position(event){const r=joystick.getBoundingClientRect();const x=event.clientX-r.left-r.width/2,y=event.clientY-r.top-r.height/2;const length=Math.hypot(x,y),radius=42;const ratio=length>radius?radius/length:1;vector={x:x*ratio/radius,y:y*ratio/radius};stick.style.transform=`translate(${vector.x*radius}px,${vector.y*radius}px)`;}
// A held gameplay pointer charges independently of its movement vector.
for(const surface of [joystick,canvas]){
 surface.addEventListener('pointerdown',event=>{
  if(activePointer!==null)return;event.preventDefault();activePointer=event.pointerId;
  surface.setPointerCapture(event.pointerId);
  if(surface===joystick)position(event);else vector={x:0,y:0};
 });
 surface.addEventListener('pointermove',event=>{if(event.pointerId===activePointer&&surface===joystick)position(event);});
 surface.addEventListener('pointerup',event=>{
  if(event.pointerId!==activePointer)return;activePointer=null;vector={x:0,y:0};stick.style.transform='';if(state)pending.push({type:'release'});
 });
 for(const type of ['pointercancel','lostpointercapture'])surface.addEventListener(type,event=>{if(event.pointerId===activePointer)clearInput();});
}
const movementKeys=new Set(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright']);
function keyboardVector(){return {x:Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),y:Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'))};}
window.addEventListener('keydown',event=>{const k=event.key.toLowerCase();if(!state||!movementKeys.has(k)||event.target===modeSlider||/INPUT|TEXTAREA/.test(event.target.tagName))return;event.preventDefault();keys.add(k);});
window.addEventListener('keyup',event=>{const k=event.key.toLowerCase();if(!movementKeys.has(k))return;const had=keys.delete(k);if(had&&state&&keys.size===0&&activePointer===null)pending.push({type:'release'});});
window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearInput();});
// Local input becomes one input frame; discrete actions ride along as commands.
function localInput(){return {...(activePointer!==null?vector:keyboardVector()),held:activePointer!==null||keys.size>0,commands:pending.splice(0)};}
function frame(now){
 const dt=Math.min((now-lastTime)/1000||0,.1);lastTime=now;
 if(state&&!document.hidden){
  const before=me().wand,previousPortal=me().nearPortal;
  accumulator+=dt;
  while(accumulator>=TICK){step(state,{[localId]:localInput()},TICK);accumulator-=TICK;}
  const player=me();
  if(player.wand&&before?.id!==player.wand.id)notice(`${WANDS[player.wand.type].name} equipped`);
  if(player.nearPortal&&player.nearPortal!==previousPortal)notice('This portal is not available yet.');
  const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);const width=Math.round(r.width*dpr),height=Math.round(r.height*dpr);
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  render(ctx,state,width,height,localId);updateUI();if(now>noticeUntil)$('#notice').textContent='';
 }
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
