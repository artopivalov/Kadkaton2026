// In-memory transport with latency, jitter and packet loss, driven by a manual clock.
// Used for tests and for judging how the game feels without a real network.
import {encode,split,createReassembler} from './codec.js';
export function createNetwork({latency=0,jitter=0,loss=0,random=Math.random}={}){
 let clock=0,counter=0;const queue=[];
 const network={
  settings:{latency,jitter,loss},
  get now(){return clock;},
  // Two linked ends. Reliable messages are never lost; unreliable ones may be.
  pair(){
   const ends=[{},{}],closed={value:false};
   ends.forEach((end,i)=>{
    const other=ends[1-i],reassemble=createReassembler();let id=0;
    end.onmessage=null;end.onclose=null;
    end.send=(message,reliable=false)=>{
     if(closed.value)return;
     for(const part of split(encode(message),++id)){
      if(!reliable&&random()<network.settings.loss)continue;
      const delay=network.settings.latency+random()*network.settings.jitter;
      queue.push({at:clock+delay,order:counter++,reliable,deliver:()=>{const decoded=reassemble(part);if(decoded&&other.onmessage)other.onmessage(decoded);}});
     }
    };
    end.close=()=>{if(closed.value)return;closed.value=true;queue.push({at:clock+network.settings.latency,order:counter++,deliver:()=>{for(const e of ends)e.onclose?.();}});};
   });
   return ends;
  },
  // Moves time forward and delivers everything due. Reliable messages keep their order.
  advance(ms){
   clock+=ms;
   queue.sort((a,b)=>a.at-b.at||a.order-b.order);
   let reliableAt=-Infinity;
   while(queue.length&&queue[0].at<=clock){const item=queue.shift();item.deliver();}
   return clock;
  }
 };
 return network;
}
