import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatchmaker,LIMITS} from '../server/matchmaker.js';
function connect(m){const inbox=[];const id=m.connect(message=>inbox.push(message));return {id,inbox,send:message=>m.receive(id,message),last:type=>inbox.findLast(x=>x.t===type)};}
test('a new client is welcomed with an id and can host a room that shows up in the list',()=>{
 const m=createMatchmaker();const host=connect(m),viewer=connect(m);
 assert.equal(host.inbox[0].t,'welcome');assert.equal(host.inbox[0].id,host.id);
 viewer.send({t:'subscribe'});assert.deepEqual(viewer.last('rooms').rooms,[]);
 host.send({t:'host',name:'Ann',roomName:'Fun',scene:'lobby',max:4});
 const room=viewer.last('rooms').rooms[0];
 assert.equal(room.name,'Fun');assert.equal(room.hostName,'Ann');assert.equal(room.players,1);assert.equal(room.max,4);assert.equal(room.joinable,true);
 assert.equal(host.last('hosted').room,room.id);
});
test('names and sizes are sanitized and clamped',()=>{
 const m=createMatchmaker();const host=connect(m);
 host.send({t:'host',name:'<b>'+'x'.repeat(100)+'</b>',max:999});
 const [room]=m.rooms();assert.ok(room.hostName.length<=LIMITS.maxNameLength);assert.ok(!/[<>]/.test(room.hostName));assert.equal(room.max,LIMITS.maxPlayers);
 const small=connect(m);small.send({t:'host',max:1});assert.equal(m.rooms()[1].max,LIMITS.minPlayers);
});
test('a client joins, host is told, and the player count updates',()=>{
 const m=createMatchmaker();const host=connect(m),guest=connect(m),viewer=connect(m);
 host.send({t:'host',name:'Ann',max:3});viewer.send({t:'subscribe'});
 guest.send({t:'join',room:m.rooms()[0].id,name:'Bob'});
 assert.equal(guest.last('joined').hostId,host.id);assert.deepEqual(host.last('peer-joined'),{t:'peer-joined',id:guest.id,name:'Bob'});
 assert.equal(viewer.last('rooms').rooms[0].players,2);
 guest.send({t:'leave'});assert.equal(host.last('peer-left').id,guest.id);assert.equal(viewer.last('rooms').rooms[0].players,1);
});
test('joining fails for unknown, full, started rooms and when already in a room',()=>{
 const m=createMatchmaker();const host=connect(m),a=connect(m),b=connect(m),late=connect(m);
 late.send({t:'join',room:'nope'});assert.equal(late.last('error').code,'not-found');
 host.send({t:'host',max:2});const id=m.rooms()[0].id;
 a.send({t:'join',room:id});b.send({t:'join',room:id});assert.equal(b.last('error').code,'full');
 a.send({t:'join',room:id});assert.equal(a.last('error').code,'busy');
 const other=connect(m);other.send({t:'host',max:4});const open=m.rooms()[1].id;
 other.send({t:'status',inGame:true});late.send({t:'join',room:open});assert.equal(late.last('error').code,'started');
 assert.equal(m.rooms()[1].inGame,true);assert.equal(m.rooms()[1].joinable,false);
 a.send({t:'status',inGame:true});assert.equal(a.last('error').code,'not-host');
});
test('signals are relayed only between the host and clients of the same room',()=>{
 const m=createMatchmaker();const host=connect(m),a=connect(m),b=connect(m),outsider=connect(m);
 host.send({t:'host',max:4});const id=m.rooms()[0].id;a.send({t:'join',room:id});b.send({t:'join',room:id});
 a.send({t:'signal',to:host.id,data:{sdp:'offer'}});assert.deepEqual(host.last('signal'),{t:'signal',from:a.id,data:{sdp:'offer'}});
 host.send({t:'signal',to:a.id,data:{sdp:'answer'}});assert.equal(a.last('signal').data.sdp,'answer');
 a.send({t:'signal',to:b.id,data:{}});assert.equal(a.last('error').code,'bad-target');
 outsider.send({t:'signal',to:host.id,data:{}});assert.equal(outsider.last('error').code,'not-in-room');
 a.send({t:'signal',to:host.id,data:'x'.repeat(LIMITS.maxSignalBytes+10)});assert.equal(a.last('error').code,'too-large');
});
test('when the host disconnects the room closes and clients are told',()=>{
 const m=createMatchmaker();const host=connect(m),guest=connect(m),viewer=connect(m);viewer.send({t:'subscribe'});
 host.send({t:'host'});guest.send({t:'join',room:m.rooms()[0].id});
 m.disconnect(host.id);
 assert.equal(guest.last('room-closed').room!==undefined,true);assert.deepEqual(viewer.last('rooms').rooms,[]);assert.equal(m.roomCount,0);
 guest.send({t:'host',name:'Bob'});assert.equal(m.roomCount,1);
});
test('a disconnected guest frees the slot; the room count is capped',()=>{
 const m=createMatchmaker();const host=connect(m),guest=connect(m);host.send({t:'host',max:2});guest.send({t:'join',room:m.rooms()[0].id});
 m.disconnect(guest.id);assert.equal(m.rooms()[0].players,1);assert.equal(host.last('peer-left').id,guest.id);
 for(let i=0;i<LIMITS.maxRooms+5;i++)connect(m).send({t:'host'});
 assert.equal(m.roomCount,LIMITS.maxRooms);
});
test('malformed messages never throw',()=>{
 const m=createMatchmaker();const c=connect(m);
 for(const bad of [null,5,'x',[],{},{t:7},{t:'join'},{t:'signal'},{t:'host',max:'abc'}])assert.doesNotThrow(()=>c.send(bad));
 m.receive('missing',{t:'host'});m.disconnect('missing');
});
