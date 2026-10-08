// Message encoding shared by every transport: compact JSON, split into chunks when a message is large.
import {NET_BALANCE} from '../balance.js';
const round=(key,value)=>key==='path'||key==='pathTarget'?undefined:typeof value==='number'&&Number.isFinite(value)?Math.round(value*100)/100:value;
export const encode=message=>JSON.stringify(message,round);
// Returns the strings to transmit: the message itself, or numbered parts of it.
export function split(text,id,limit=NET_BALANCE.chunkSize){
 if(text.length<=limit)return [text];
 const count=Math.ceil(text.length/limit),parts=[];
 for(let i=0;i<count;i++)parts.push(`\u0001${id}:${i}:${count}:${text.slice(i*limit,(i+1)*limit)}`);
 return parts;
}
// Collects parts and returns the decoded message once complete. An incomplete message is dropped when newer ones arrive.
export function createReassembler(){
 const pending=new Map();
 return raw=>{
  if(typeof raw!=='string')return null;
  if(raw.charCodeAt(0)!==1){try{return JSON.parse(raw);}catch{return null;}}
  const head=raw.match(/^\u0001(\d+):(\d+):(\d+):/);if(!head)return null;
  const id=Number(head[1]),index=Number(head[2]),count=Number(head[3]);
  if(count>64||index>=count)return null;
  let entry=pending.get(id);if(!entry){entry={parts:new Array(count),received:0};pending.set(id,entry);}
  if(entry.parts[index]===undefined){entry.parts[index]=raw.slice(head[0].length);entry.received++;}
  for(const key of pending.keys())if(key<id-8)pending.delete(key);
  if(entry.received<count)return null;
  pending.delete(id);try{return JSON.parse(entry.parts.join(''));}catch{return null;}
 };
}
