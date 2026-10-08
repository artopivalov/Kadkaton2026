import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,release,step} from '../src/simulation.js';
import {KNOCKBACK_BALANCE} from '../src/balance.js';
function setup(){const s=createState({name:'Wizard',color:'#ffbb66'});s.world={width:3000,height:2000};const p=s.players[0];p.x=600;p.y=450;p.angle=0;p.mode='Special';p.wand={type:'air',id:9};p.charge=1;s.targets=[{id:5,x:660,y:450,hits:0,damage:0}];return s;}
test('knockback travels over multiple ticks and ends at the same distance across tick sizes',()=>{
 const positions=[];for(const dt of [1/30,1/60,1/120]){const s=setup(),t=s.targets[0];release(s,1);assert.equal(t.x,660);const distance=t.knockback.x;step(s,{},dt);assert.ok(t.x>660&&t.x<660+distance);for(let i=0;i<Math.ceil(KNOCKBACK_BALANCE.duration/dt);i++)step(s,{},dt);assert.equal(t.knockback,undefined);positions.push(t.x);assert.ok(Math.abs(t.x-660-distance)<1e-6);}
 assert.ok(Math.max(...positions)-Math.min(...positions)<1e-6);
});
test('knockback stops at walls, serializes, and does not suspend player input',()=>{
 const s=setup(),t=s.targets[0];s.walls=[{id:99,x:710,y:350,width:20,height:200,permanent:true}];release(s,1);const copy=JSON.parse(JSON.stringify(s)),x=s.players[0].x;
 for(let i=0;i<30;i++){step(s,{1:{x:0,y:1}},1/60);step(copy,{1:{x:0,y:1}},1/60);}
 assert.ok(t.x<710&&t.x>660);assert.equal(t.knockback,undefined);assert.equal(s.players[0].x,x);assert.ok(s.players[0].y>450);assert.deepEqual(copy,s);
});
