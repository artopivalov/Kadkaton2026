import {clearBattleRoyale} from '../battle-royale.js';
import {createState} from '../simulation.js';
export function configureLobby(s){
 clearBattleRoyale(s);delete s.map;s.world={width:1200,height:1040};s.spawn={x:600,y:1000};s.scene={id:'lobby',title:'Adventure lobby',description:'Choose an adventure portal or Battle Royale. All players must enter the same portal.'};
 s.items=[];s.pedestals=[];s.walls=[];s.targets=[];s.enemies=[];s.telegraphs=[];s.projectiles=[];s.effects=[];s.hitFeedback=[];s.completed=false;
 s.portals=['forest','cave','library'].map((location,i)=>({id:40+i,x:420+i*180,y:300,location,label:['Forest · Easy','Cave · Medium','Library · Hard'][i],available:true}));
 s.portals.push({id:43,x:600,y:110,location:'battleRoyale',label:'Battle Royale',available:s.players.length>1});
 for(const [i,p] of s.players.entries()){p.x=s.spawn.x+[0,1,-1][i%3]*70;p.y=s.spawn.y-Math.floor(i/3)*70;p.wand={id:s.nextId++,type:'test'};p.rune=null;p.health=100;p.mana=100;p.charge=0;delete p.knockback;p.nearPortal=null;}
 return s;
}
export function createScene(profile=null,options={}){return configureLobby(createState(profile,options));}
