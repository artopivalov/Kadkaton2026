// Snapshots: what the host sends and how a client turns it back into a world state.
import {generateLocation} from '../generator.js';
import {NET_BALANCE} from '../balance.js';
const LISTS=['players','items','pedestals','portals','walls','projectiles','effects','targets','enemies','telegraphs'];
const SCALARS=['time','seed','nextId','rngState','scene','spawn','world','completed','debugRarity','debugRuneEffect','runeStation','shots'];
const near=(e,x,y,radius)=>e.x===undefined||Math.hypot(e.x-x,e.y-y)<=radius||(e.x2!==undefined&&Math.hypot(e.x2-x,e.y2-y)<=radius);
// The map is rebuilt from its seed on each client; only its progress travels.
export function mapDescriptor(s){return s.map?{loc:s.map.location,seed:s.map.seed,party:s.map.partySize}:null;}
export function buildSnapshot(s,viewerId,{tick,ack}){
 const viewer=s.players.find(p=>p.id===viewerId),x=viewer?.x??0,y=viewer?.y??0,radius=NET_BALANCE.viewRadius;
 const snap={t:'snap',tick,ack,desc:mapDescriptor(s)};
 for(const key of SCALARS)if(s[key]!==undefined)snap[key]=s[key];
 for(const key of LISTS){
  const list=s[key]??[];
  snap[key]=['players','pedestals','portals','walls','targets'].includes(key)||!viewer?list:list.filter(e=>near(e,x,y,radius));
 }
 if(s.map)snap.poi=s.map.pois.map(p=>[p.completed?1:0,p.opened?1:0,p.plates.reduce((bits,plate,i)=>bits|(plate.active?1<<i:0),0)]);
 return snap;
}
// Writes a snapshot into a client-side world state, keeping the generated map when it is still the right one.
export function applySnapshot(state,snap){
 for(const key of SCALARS){if(snap[key]!==undefined)state[key]=snap[key];else delete state[key];}
 for(const key of LISTS)state[key]=snap[key]??[];
 const d=snap.desc;
 if(!d)delete state.map;
 else{
  if(!state.map||state.map.location!==d.loc||state.map.seed!==d.seed||state.map.partySize!==d.party)state.map=generateLocation(d.loc,d.seed,d.party);
  snap.poi?.forEach(([done,opened,plates],i)=>{const poi=state.map.pois[i];if(!poi)return;poi.completed=Boolean(done);poi.opened=Boolean(opened);poi.plates.forEach((plate,n)=>{plate.active=Boolean(plates&(1<<n));});});
 }
 return state;
}
// A private copy for prediction. Static map data is shared, progress flags are copied.
export function cloneForPrediction(auth){
 const {map,...rest}=auth,copy=structuredClone(rest);
 if(map)copy.map={...map,pois:map.pois.map(p=>({...p,plates:p.plates.map(plate=>({...plate}))}))};
 for(const key of ['projectiles','effects','walls','items'])for(const e of copy[key])e.auth=true;
 return copy;
}
