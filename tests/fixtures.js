import {createState} from '../src/simulation.js';
export function createTrainingState(profile){
 const s=createState(profile);s.players[0].wand={id:2,type:'fire'};
 s.items=[{id:3,type:'fire',x:730,y:450,availableAt:0},{id:7,type:'ice',x:520,y:500,availableAt:0},{id:8,type:'lightning',x:680,y:500,availableAt:0}];
 s.targets=[{id:4,x:600,y:210,hits:0,damage:0},{id:5,x:850,y:310,hits:0,damage:0},{id:6,x:350,y:310,hits:0,damage:0}];return s;
}
