import {RARITIES,SPECIAL_RUNES,ENEMY_BALANCE} from './balance.js';
import {rarityColor,runeLabel} from './items.js';
import {enterLocation} from './locations.js';
import {configureLobby} from './scenes/lobby.js';
import {CAMERA_BALANCE} from './balance.js';
import {step,getPlayer,readyPortal} from './simulation.js';
import {render,renderPreview} from './renderer.js';
import {WANDS} from './wands.js';
import {createScene} from './scene.js';
import {createHost} from './net/host.js';
import {createClient} from './net/client.js';
import {connectServer} from './net/matchmaking.js';
import {acceptPeer,connectToHost} from './net/rtc.js';
const $=selector=>document.querySelector(selector);
const menu=$('#menu'),game=$('#game'),canvas=$('#canvas'),ctx=canvas.getContext('2d'),joystick=$('#joystick'),stick=$('#stick');
let view={zoom:CAMERA_BALANCE.default},targetZoom=CAMERA_BALANCE.default;
let session=null,sceneKey='',state=null,localId=null,pending=[],accumulator=0,activePointer=null,vector={x:0,y:0},keys=new Set(),lastTime=0,noticeUntil=0;
try{const profile=JSON.parse(localStorage.getItem('kadkaton.profile'));if(profile){$('#name').value=String(profile.name||'').slice(0,24);if(/^#[0-9a-f]{6}$/i.test(profile.color))$('#color').value=profile.color;}}catch{}
function notice(message){$('#notice').textContent=message;noticeUntil=performance.now()+2300;}
function clearInput(){activePointer=null;modePointer=null;vector={x:0,y:0};keys.clear();stick.style.transform='';joystick.hidden=true;pending.length=0;if(state)pending.push({type:'cancel'});}
const modeNames=['Safe','Normal','Special'];
const TICK=1/60;
const me=()=>getPlayer(state,localId);
const modeSlider=$('#mode-slider');
function wandIcon(type){const color=WANDS[type].color;const tip=type==='lightning'?`<path d="m31 3-9 14h7l-6 13 14-18h-8Z" fill="${color}"/>`:type==='ice'?`<path d="m30 3 7 12-7 8-7-8Z" fill="${color}"/>`:`<circle cx="30" cy="10" r="6" fill="${color}"/>`;return `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M9 32 29 12" stroke="#d8b97e" stroke-width="5"/>${tip}</svg>`;}
function updateUI(){
 const p=me();if(!p)return;$('#rune-effect').disabled=RARITIES.indexOf(state.debugRarity??'Common')<2;$('#vitals').textContent=`Health ${Math.ceil(p.health)} · Mana ${Math.floor(p.mana)}`;$('#retry').textContent=state.scene.id==='debug'?'Reset playground':'Return to lobby';$('#retry').hidden=state.scene.viewer||(p.health>0&&!state.completed);if(state.map)$('#vitals').textContent+=` · POI ${state.map.pois.filter(p=>p.completed).length}/${state.map.pois.length}${state.completed?' · Victory!':''}`;const runeHTML=`<span>◇</span><small>${p.rune?`${p.rune.rarity??'Common'} rune`:'Empty rune'}</small>`;if($('#rune-slot').innerHTML!==runeHTML)$('#rune-slot').innerHTML=runeHTML;$('#rune-slot').disabled=!p.rune;$('#rune-slot').setAttribute('aria-label',p.rune?`${p.rune.rarity??"Common"} ${runeLabel(p.rune)} rune: tap to drop`:'Rune slot: empty');$('#player-name').textContent=p.name;$('#charge').value=p.charge;
 $('#health-bar').value=p.health;$('#health-bar').max=100;$('#wand-slot').style.borderColor=rarityColor(p.wand);$('#rune-slot').style.borderColor=rarityColor(p.rune);$('#rune-info').textContent=p.rune?`${p.rune.rarity??'Common'} rune · ${runeLabel(p.rune)}`:'';$('#rune-info').hidden=!p.rune;$('#rune-slot').title=p.rune?`${p.rune.rarity??'Common'} · ${runeLabel(p.rune)}`:'';
 const definition=p.wand?WANDS[p.wand.type]:null;
 const wandName=definition?(definition.name.endsWith('Wand')?definition.name:`${definition.name} wand`):'';
 const slotHTML=(p.wand?wandIcon(p.wand.type):'<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M9 32 29 12" stroke="#78889e" stroke-width="5"/></svg>')+`<small>${definition?definition.name:'Empty wand'}</small>`;
 if($('#wand-slot').innerHTML!==slotHTML)$('#wand-slot').innerHTML=slotHTML;
 $('#wand-slot').disabled=!p.wand;
 $('#wand-slot').setAttribute('aria-label',p.wand?`${p.wand.rarity??'Common'} ${wandName}: tap to drop`:'Wand slot: empty, auto-pickup');
 $('#wand-slot').title=p.wand?`Drop ${p.wand.rarity??'Common'} ${wandName}`:'Move close to a wand to pick it up';
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
function readProfile(){const profile={name:$('#name').value.trim()||'Wizard',color:$('#color').value};try{localStorage.setItem('kadkaton.profile',JSON.stringify(profile));}catch{}return profile;}
function showGame(){clearInput();pending.length=0;accumulator=0;menu.hidden=true;game.hidden=false;syncScene();sceneKey=state.scene.id+state.scene.title;updateUI();game.setAttribute('aria-label',state.scene.title);canvas.setAttribute('aria-label',state.scene.title);$('#scene-title').textContent=state.scene.title;notice(state.scene.description);}
$('#start-form').addEventListener('submit',event=>{event.preventDefault();$('#menu-message').textContent='';state=createScene(readProfile());localId=state.players[0].id;showGame();});
$('#exit').addEventListener('click',()=>leaveSession());
$('#wand-slot').addEventListener('click',()=>{if(me()?.wand){pending.push({type:'drop'});notice('Wand dropped. Move close to pick it up.');}});
$('#rune-slot').addEventListener('click',()=>{if(me()?.rune)pending.push({type:'dropRune'});});
$('#zoom').addEventListener('input',()=>{targetZoom=Number($('#zoom').value);});
$('#enemy-type').innerHTML=Object.entries(ENEMY_BALANCE).map(([id,enemy])=>`<option value="${id}">${enemy.name}</option>`).join('');
$('#spawn-enemy').addEventListener('click',()=>pending.push({type:'spawnEnemy',enemy:$('#enemy-type').value}));
$('#clear-enemies').addEventListener('click',()=>pending.push({type:'clearEnemies'}));
$('#rune-effect').innerHTML='<option value="random">Random</option>'+Object.entries(SPECIAL_RUNES).map(([id,effect])=>`<option value="${id}">${effect.name}</option>`).join('');
$('#rune-effect').addEventListener('change',()=>pending.push({type:'setRuneEffect',effect:$('#rune-effect').value}));
$('#rarity').innerHTML=RARITIES.map(r=>`<option>${r}</option>`).join('');
$('#rarity').addEventListener('change',()=>pending.push({type:'setRarity',rarity:$('#rarity').value}));
function syncScene(){$('#debug-tools').hidden=state.scene.id!=='debug';game.classList.toggle('viewer',Boolean(state.scene.viewer));$('#generation-tools').hidden=!state.scene.viewer;$('#scene-title').textContent=state.scene.title;game.setAttribute('aria-label',state.scene.title);canvas.setAttribute('aria-label',state.scene.title);if(state.scene.viewer){view.x=state.spawn.x;view.y=state.spawn.y;$('#map-stats').textContent=`${state.map.pois.length} POI · ${state.enemies.length} enemies · Seed ${state.seed}`;}else{delete view.x;delete view.y;}clearInput();}
$('#regenerate').addEventListener('click',()=>{enterLocation(state,$('#location').value,Number($('#seed').value)>>>0,{viewer:true});syncScene();});
$('#retry').addEventListener('click',()=>{if(session?.role==='client'){session.client.requestLobby();notice('Asked the host to return to the lobby.');return;}if(state.scene.id==='debug'){const p=me();state=createScene({name:p.name,color:p.color});localId=state.players[0].id;syncScene();notice('Playground reset.');}else{configureLobby(state);session?.match?.setInGame(false);syncScene();notice('Choose another adventure.');}});
function position(event){const x=event.clientX-gestureOrigin.x,y=event.clientY-gestureOrigin.y;const length=Math.hypot(x,y),radius=42;const ratio=length>radius?radius/length:1;vector={x:x*ratio/radius,y:y*ratio/radius};stick.style.transform=`translate(${vector.x*radius}px,${vector.y*radius}px)`;}
let gestureOrigin={x:0,y:0};
// Only the canvas starts a gesture; UI owns its own pointer events.
canvas.addEventListener('pointerdown',event=>{
 if(activePointer!==null)return;event.preventDefault();activePointer=event.pointerId;canvas.setPointerCapture(event.pointerId);
 gestureOrigin={x:event.clientX,y:event.clientY};const rect=game.getBoundingClientRect();joystick.style.left=`${event.clientX-rect.left}px`;joystick.style.top=`${event.clientY-rect.top}px`;joystick.hidden=false;vector={x:0,y:0};stick.style.transform='';
});
canvas.addEventListener('pointermove',event=>{if(event.pointerId===activePointer)position(event);});
canvas.addEventListener('pointerup',event=>{if(event.pointerId!==activePointer)return;activePointer=null;vector={x:0,y:0};stick.style.transform='';joystick.hidden=true;if(state)pending.push({type:'release'});});
for(const type of ['pointercancel','lostpointercapture'])canvas.addEventListener(type,event=>{if(event.pointerId===activePointer)clearInput();});
const movementKeys=new Set(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright']);
function keyboardVector(){return {x:Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),y:Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'))};}
window.addEventListener('keydown',event=>{const k=event.key.toLowerCase();if(!state||!movementKeys.has(k)||event.target===modeSlider||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return;event.preventDefault();keys.add(k);});
window.addEventListener('keyup',event=>{const k=event.key.toLowerCase();if(!movementKeys.has(k))return;const had=keys.delete(k);if(had&&state&&keys.size===0&&activePointer===null)pending.push({type:'release'});});
window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearInput();});
// Local input becomes one input frame; discrete actions ride along as commands.
function localInput(){return {...(activePointer!==null?vector:keyboardVector()),held:activePointer!==null||keys.size>0,commands:pending.splice(0)};}
// ---- Online play -------------------------------------------------------------------------------
const netPanel=$('#net-panel'),netStatus=$('#net-status'),startForm=$('#start-form');
function setNetStatus(text,isError=true){netStatus.textContent=text;netStatus.className=isError?'error':'';}
function openPanel(mode){
 closeNetwork();$('#menu-message').textContent='';startForm.hidden=true;$('#menu-hint').hidden=true;netPanel.hidden=false;
 $('#net-title').textContent=mode==='host'?'Host a game':'Join a game';$('#net-host').hidden=mode!=='host';$('#net-join').hidden=mode!=='join';setNetStatus('');
}
function closePanel(){closeNetwork();netPanel.hidden=true;startForm.hidden=false;$('#menu-hint').hidden=false;setNetStatus('');}
let panelMatch=null;
function closeNetwork(){panelMatch?.close();panelMatch=null;}
async function connectOrExplain(){
 setNetStatus('Connecting to the matchmaking server...',false);
 try{const match=await connectServer();setNetStatus('',false);return match;}
 catch(error){setNetStatus(`${error.message} Run "npm run server" and open the game from the address it shows.`);return null;}
}
function leaveSession(message=''){
 const current=session;session=null;current?.client?.close();current?.host?.close();current?.match?.close();
 clearInput();state=null;localId=null;sceneKey='';game.hidden=true;menu.hidden=false;
 startForm.hidden=false;netPanel.hidden=true;$('#menu-hint').hidden=false;$('#net-hud').textContent='';$('#menu-message').textContent=message;
 if(!message)$('#name').focus();
}
$('#host-game').addEventListener('click',()=>{openPanel('host');$('#room-name').value||($('#room-name').value=`${$('#name').value.trim()||'Wizard'}'s game`);});
$('#join-game').addEventListener('click',async()=>{
 openPanel('join');renderRooms([]);const match=await connectOrExplain();if(!match)return;
 if(netPanel.hidden||$('#net-join').hidden){match.close();return;}
 panelMatch=match;match.onRooms=renderRooms;match.onClose=()=>{if(panelMatch===match){panelMatch=null;renderRooms([]);setNetStatus('Lost connection to the matchmaking server.');}};match.subscribe();
});
$('#net-back').addEventListener('click',closePanel);
function renderRooms(rooms){
 const list=$('#room-list');list.replaceChildren();$('#room-empty').textContent=rooms.length?'':(panelMatch?'No open rooms yet. Ask a friend to host one.':'');
 for(const room of rooms){
  const item=document.createElement('li'),meta=document.createElement('div'),name=document.createElement('strong'),detail=document.createElement('small'),button=document.createElement('button');
  meta.className='meta';name.textContent=room.name;detail.textContent=`${room.hostName} · ${room.players}/${room.max} players${room.inGame?' · in game':''}`;
  button.type='button';button.textContent='Join';button.disabled=!room.joinable;button.title=room.joinable?'':room.inGame?'The game has already started':'Room is full';
  button.addEventListener('click',()=>joinRoom(room));meta.append(name,detail);item.append(meta,button);list.append(item);
 }
}
async function joinRoom(room){
 const match=panelMatch;if(!match)return;const profile=readProfile();
 for(const button of $('#room-list').querySelectorAll('button'))button.disabled=true;
 setNetStatus(`Joining ${room.name}...`,false);
 try{
  const joined=await match.join(room.id,profile.name);match.unsubscribe();
  setNetStatus('Connecting to the host...',false);
  let link;try{link=await connectToHost(match,joined.hostId);}catch(error){match.leave();match.subscribe();throw error;}
  panelMatch=null;match.onRooms=null;match.onClose=null;
  const client=createClient(link,profile,{onNotice:notice,onClose:reason=>{if(session?.client===client)leaveSession(reason);}});
  session={role:'client',match,client,waiting:true};setNetStatus('Connected. Waiting for the game...',false);
  setTimeout(()=>{if(session?.client===client&&session.waiting)leaveSession('The host did not respond.');},8000);
 }catch(error){setNetStatus(error.message);for(const button of $('#room-list').querySelectorAll('button'))button.disabled=false;}
}
$('#room-create').addEventListener('click',async()=>{
 const match=await connectOrExplain();if(!match)return;
 const profile=readProfile();const hosting=createScene(profile);
 if(hosting.scene.viewer){setNetStatus('Online play is not available in this build.');match.close();return;}
 let hosted;
 try{hosted=await match.host({name:profile.name,roomName:$('#room-name').value.trim()||`${profile.name}'s game`,scene:hosting.scene.id,max:Number($('#room-max').value)});}
 catch(error){setNetStatus(error.message);match.close();return;}
 state=hosting;localId=state.players[0].id;
 const host=createHost(state,{maxPlayers:hosted.max,onJoin:name=>notice(`${name} joined the game.`),onLeave:name=>notice(`${name} left the game.`),onRequest:kind=>{if(kind==='lobby'){configureLobby(state);match.setInGame(false);syncScene();notice('Back in the lobby.');}}});
 match.onPeerJoined=async(id,name)=>{try{host.addPeer(id,await acceptPeer(match,id));}catch{notice(`${name} could not connect directly.`);}};
 match.onPeerLeft=id=>host.removePeer(id);
 match.onClose=()=>{if(session?.match===match)notice('Lost the matchmaking server: nobody new can join.');};
 session={role:'host',match,host,max:hosted.max};closePanel();showGame();notice(`Room "${$('#room-name').value.trim()||profile.name}" is open. Waiting for players.`);
});
// Local input becomes one input frame; discrete actions ride along as commands.
function advance(now,dt){
 if(session?.role==='client'){
  const rs=session.client.update(now,localInput);
  if(rs){state=rs;localId=session.client.localId;if(session.waiting){session.waiting=false;showGame();}}
  return;
 }
 accumulator+=dt;
 while(accumulator>=TICK){
  const input=localInput();
  if(state.scene.viewer){view.x+=input.x*CAMERA_BALANCE.flightSpeed*TICK;view.y+=input.y*CAMERA_BALANCE.flightSpeed*TICK;}
  else{
   step(state,{[localId]:input,...session?.host?.collectInputs()},TICK);session?.host?.afterTick();
   const portal=readyPortal(state);
   if(portal){if(portal.location==='lobby')configureLobby(state);else enterLocation(state,portal.location);session?.match?.setInGame(state.scene.id!=='lobby');syncScene();notice(state.scene.description);}
  }
  accumulator-=TICK;
 }
}
function frame(now){
 const dt=Math.min((now-lastTime)/1000||0,.1);lastTime=now;
 if(session?.role==='client'||(state&&!document.hidden)){
  const before=state&&me()?.wand,previousPortal=state&&me()?.nearPortal;
  advance(now,dt);
  if(state&&!(session?.waiting)){
   view.zoom+=(targetZoom-view.zoom)*(1-Math.exp(-CAMERA_BALANCE.smoothing*dt));
   const player=me();
   if(player){
    if(player.wand&&before?.id!==player.wand.id)notice(`${WANDS[player.wand.type].name} equipped`);
    if(player.nearPortal&&player.nearPortal!==previousPortal)notice('All players must enter the same portal.');
   }
   if(session?.role==='client'&&sceneKey!==state.scene.id+state.scene.title){sceneKey=state.scene.id+state.scene.title;syncScene();notice(state.scene.description);}
   const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);const width=Math.round(r.width*dpr),height=Math.round(r.height*dpr);
   if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
   render(ctx,state,width,height,localId,view);updateUI();
   if(session&&state.scene.id==='debug')$('#retry').hidden=true;
   $('#net-hud').textContent=session?.role==='host'?`Hosting · ${state.players.length}/${session.max} players`:session?.role==='client'?`Online · ${session.client.rtt===null?'...':Math.round(session.client.rtt)+' ms'}`:'';
   if(now>noticeUntil)$('#notice').textContent='';
  }
 }
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
