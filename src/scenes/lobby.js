import {createState} from '../simulation.js';
export function configureLobby(s){
 delete s.map;delete s.world;s.spawn={x:600,y:600};s.scene={id:'lobby',title:'Adventure lobby',description:'Choose a portal: Forest, Cave, or Library. All players must enter the same portal.'};
 s.items=[];s.pedestals=[];s.walls=[];s.targets=[];s.enemies=[];s.telegraphs=[];s.projectiles=[];s.effects=[];s.completed=false;
 s.portals=['forest','cave','library'].map((location,i)=>({id:40+i,x:420+i*180,y:300,location,label:['Forest · Easy','Cave · Medium','Library · Hard'][i],available:true}));
 for(const [i,p] of s.players.entries()){p.x=600+[0,1,-1][i%3]*70;p.y=600+Math.floor(i/3)*70;p.wand={id:s.nextId++,type:'test'};p.rune=null;p.health=100;p.mana=100;p.charge=0;p.nearPortal=null;}
 return s;
}
export function createScene(profile=null,options={}){return configureLobby(createState(profile,options));}
