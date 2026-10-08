import test from 'node:test';
import assert from 'node:assert/strict';
import {render} from '../src/renderer.js';
import {createScene} from '../src/scenes/lobby.js';
function recordingContext(){
 const calls=[];
 const ctx=new Proxy({measureText:text=>({width:text.length*10}),createRadialGradient:()=>({addColorStop(){}})},{get(target,key){return key in target?target[key]:(...args)=>calls.push({method:key,args});}});
 return {ctx,calls};
}
test('lobby camera follows the local player on both axes and preserves explicit viewer position',()=>{
 const state=createScene({name:'Wizard',color:'#7c2fee'}),p=state.players[0],first=recordingContext();
 render(first.ctx,state,360,640,p.id,{zoom:.72});
 const transform=first.calls.filter(c=>c.method==='setTransform').at(-1).args;
 p.x+=100;p.y+=60;
 const moved=recordingContext();render(moved.ctx,state,360,640,p.id,{zoom:.72});
 const next=moved.calls.filter(c=>c.method==='setTransform').at(-1).args;
 assert.equal(next[4]-transform[4],-100*transform[0]);
 assert.ok(Math.abs(next[5]-transform[5]+60*transform[0])<1e-9);
 const explicit=recordingContext();render(explicit.ctx,state,360,640,p.id,{zoom:.72,x:600,y:600});
 const freeTransform=explicit.calls.filter(c=>c.method==='setTransform').at(-1).args;
 assert.ok(Math.abs(state.spawn.y*transform[3]+transform[5]-640*2/3)<1e-9);
 assert.ok(Math.abs(600*freeTransform[3]+freeTransform[5]-640/2)<1e-9);
});
test('lobby paints four floor tips, stacked depleted resources, and the existing charge ring',()=>{
 const state=createScene({name:'Wizard',color:'#7c2fee'}),p=state.players[0];p.health=50;p.mana=25;p.charge=.5;
 const {ctx,calls}=recordingContext();render(ctx,state,360,640,p.id,{zoom:.72});
 assert.deepEqual(calls.filter(c=>c.method==='fillText'&&['HOLD','RELEASE','MOVE','SWITCH'].includes(c.args[0])).map(c=>c.args[0]),['SWITCH','HOLD','MOVE','RELEASE']);
 assert.ok(calls.some(c=>c.method==='fillRect'&&c.args.join(',')===[p.x-28,p.y-55,28,8].join(',')));
 assert.ok(calls.some(c=>c.method==='fillRect'&&c.args.join(',')===[p.x-28,p.y-44,14,6].join(',')));
 assert.ok(calls.some(c=>c.method==='arc'&&c.args[0]===p.x&&c.args[1]===p.y&&c.args[2]===27));
});
