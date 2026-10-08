import {createState} from '../simulation.js';
import {enterLocation} from '../locations.js';
export function createScene(profile=null,options={}){return enterLocation(createState(profile,options),options.location??'forest',options.seed??1,{viewer:true});}
