import {createState} from '../simulation.js';
export function createScene(profile=null,options={}){
 const s=createState(profile,options);
 s.scene={id:'lobby',title:'Lobby',description:'Your Test Wand is harmless. Portals are coming next.'};
 s.portals=[{id:40,x:480,y:230,label:'Adventure',available:false},{id:41,x:720,y:230,label:'Coming soon',available:false}];
 return s;
}
