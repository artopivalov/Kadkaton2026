import {ITEM_BALANCE} from '../balance.js';
import {createState} from '../simulation.js';
import {WANDS} from '../wands.js';
export function createScene(profile=null,options={}){
 const s=createState(profile,options);
 s.scene={id:'debug',title:'Wand playground',description:'Walk up to a pedestal to swap your wand.'};
 s.world={width:ITEM_BALANCE.debugWidth,height:ITEM_BALANCE.debugHeight};s.debugRarity='Common';s.runeStation={id:40,x:900,y:780};
 const positions=[[300,680],[420,680],[540,680],[660,680],[780,680],[300,820],[420,820],[540,820],[660,820],[780,820]];
 s.pedestals=Object.keys(WANDS).map((type,index)=>({id:20+index,type,x:positions[index][0],y:positions[index][1]}));
 s.targets=[{id:4,x:600,y:210,hits:0,damage:0},{id:5,x:850,y:310,hits:0,damage:0},{id:6,x:350,y:310,hits:0,damage:0}];
 s.walls=[{id:30,x:750,y:190,width:24,height:190,permanent:true}];
 return s;
}
