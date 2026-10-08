import {CONFIG,ICE_BALANCE,LIGHTNING_BALANCE,AIR_BALANCE,EARTH_BALANCE,TEST_BALANCE} from './balance.js';
export const WANDS = Object.freeze({
 fire:{name:'Fireball',color:'#ffac52',balance:CONFIG,normalHelp:'Hold to charge a fireball; quick taps are tiny and weak.',specialHelp:'Fully charge, then release a fire sphere around you.'},
 ice:{name:'Ice',color:'#89e7ff',balance:ICE_BALANCE,normalHelp:'Release a spread of small icicles.',specialHelp:'Fully charge, then release a forward cold wave.'},
 lightning:{name:'Lightning',color:'#f4eb79',balance:LIGHTNING_BALANCE,normalHelp:'Release an instant lightning line.',specialHelp:'Hold to move the sky-strike marker farther; release to strike.'},
 air:{name:'Air',color:'#a4ffc9',balance:AIR_BALANCE,normalHelp:'Release a damaging whirlwind that pushes targets apart.',specialHelp:'Fully charge, then release a strong outward air pulse.'},
 earth:{name:'Earth',color:'#c7a681',balance:EARTH_BALANCE,normalHelp:'Release a rolling boulder that ricochets off walls.',specialHelp:'Fully charge, then create a temporary solid wall in front.'},
 test:{name:'Test Wand',color:'#ecb9ff',balance:TEST_BALANCE,normalHelp:'Release harmless sparks with a small push.',specialHelp:'Fully charge, then release a harmless firework sphere.'}
});
export function normalPower(charge){return Math.max(0,Math.min(1,charge))**CONFIG.normalChargeExponent;}
export function scaledNormal(maximum,minimumFactor,charge){return maximum*(minimumFactor+(1-minimumFactor)*normalPower(charge));}
export function lightningPoint(player){const b=LIGHTNING_BALANCE;const distance=b.strikeMinDistance+(b.strikeMaxDistance-b.strikeMinDistance)*player.charge;return {x:player.x+Math.cos(player.angle)*distance,y:player.y+Math.sin(player.angle)*distance};}
