import {statFactor,hasRune} from './items.js';
import {BLOOD_BALANCE,STORM_BALANCE,VOID_BALANCE,MIRROR_BALANCE,ORBIT_BALANCE,COMET_BALANCE,PRISM_BALANCE,SPECIAL_RUNE_BALANCE,NATURE_BALANCE,GRAVITY_BALANCE,LIGHT_BALANCE,CRYSTAL_BALANCE,ITEM_BALANCE,CONFIG,ICE_BALANCE,LIGHTNING_BALANCE,AIR_BALANCE,EARTH_BALANCE,TEST_BALANCE} from './balance.js';
const DEFINITIONS = {
 fire:{name:'Fireball',color:'#ffac52',balance:CONFIG,normalHelp:'Hold to charge a fireball; quick taps are tiny and weak.',specialHelp:'Fully charge, then release a fire sphere around you.'},
 ice:{name:'Ice',color:'#89e7ff',balance:ICE_BALANCE,normalHelp:'Release a spread of small icicles.',specialHelp:'Fully charge, then release a forward cold wave.'},
 lightning:{name:'Lightning',color:'#f4eb79',balance:LIGHTNING_BALANCE,normalHelp:'Release an instant lightning line.',specialHelp:'Hold to move the sky-strike marker farther; release to strike.'},
 air:{name:'Air',color:'#a4ffc9',balance:AIR_BALANCE,normalHelp:'Release a damaging whirlwind that pushes targets apart.',specialHelp:'Fully charge, then release a strong outward air pulse.'},
 earth:{name:'Earth',color:'#c7a681',balance:EARTH_BALANCE,normalHelp:'Release a rolling boulder that ricochets off walls.',specialHelp:'Fully charge, then create a temporary solid wall in front.'},
 nature:{name:'Nature',color:'#75d779',balance:NATURE_BALANCE,normalHelp:'Release a thorn that roots its target.',specialHelp:'Fully charge, then place slowing vines ahead.'},
 gravity:{name:'Gravity',color:'#a59eff',balance:GRAVITY_BALANCE,normalHelp:'Release an orb that pulls enemies to the impact.',specialHelp:'Fully charge, then place a damaging gravity well.'},
 light:{name:'Light',color:'#fff7bd',balance:LIGHT_BALANCE,normalHelp:'Release a returning light disc.',specialHelp:'Fully charge, then place a wall that blocks projectiles.'},
 crystal:{name:'Crystal',color:'#f5a6ef',balance:CRYSTAL_BALANCE,normalHelp:'Release a guided shard that splits on impact.',specialHelp:'Fully charge, then place a shard trap ahead.'},
 blood:{name:'Blood',color:'#f45f85',balance:BLOOD_BALANCE,normalHelp:'Release a blood bolt; enemy hits heal you.',specialHelp:'Fully charge a fan of needles, costing health and mana.'},
 storm:{name:'Storm',color:'#a5c4ff',balance:STORM_BALANCE,normalHelp:'Release a lightning chain across nearby enemies.',specialHelp:'Fully charge, then place a storm cloud.'},
 void:{name:'Void',color:'#ae73de',balance:VOID_BALANCE,normalHelp:'Release a slow piercing orb.',specialHelp:'Fully charge a pulling rift that collapses after a warning.'},
 mirror:{name:'Mirror',color:'#c3f4ff',balance:MIRROR_BALANCE,normalHelp:'Release a shard that destroys enemy projectiles.',specialHelp:'Fully charge, then place a reflecting mirror.'},
 orbit:{name:'Orbit',color:'#f5d292',balance:ORBIT_BALANCE,normalHelp:'Release to create a temporary satellite; at most three.',specialHelp:'Fully charge, then launch all your satellites.'},
 comet:{name:'Comet',color:'#ffd07c',balance:COMET_BALANCE,normalHelp:'Release an accelerating meteor that grows stronger with distance.',specialHelp:'Fully charge a delayed meteor explosion with debris.'},
 prism:{name:'Prism',color:'#99ffea',balance:PRISM_BALANCE,normalHelp:'Release a piercing ray.',specialHelp:'Fully charge, then place a prism that splits your next Normal casts.'},
 test:{name:'Test Wand',color:'#ecb9ff',balance:TEST_BALANCE,normalHelp:'Release harmless sparks with a small push.',specialHelp:'Fully charge, then release a harmless firework sphere.'}
};
export function normalPower(charge){return Math.max(0,Math.min(1,charge))**CONFIG.normalChargeExponent;}
export function scaledNormal(maximum,minimumFactor,charge){return maximum*(minimumFactor+(1-minimumFactor)*normalPower(charge));}
export function lightningPoint(player){const b=spellBalance(player);const distance=b.strikeMinDistance+(b.strikeMaxDistance-b.strikeMinDistance)*player.charge;const adjusted=distance;return {x:player.x+Math.cos(player.angle)*adjusted,y:player.y+Math.sin(player.angle)*adjusted};}

// Each spell's numerical parameters are coefficients of the same seven item stats.
const parameterStat=key=>/damage/i.test(key)?'damage':/range|Range|Distance/.test(key)?'range':/Radius|radius|Depth|Length|Thickness|chargedRadiusBonus/.test(key)?'size':/^(projectileSpeed|waveSpeed)$/.test(key)?'speed':/chargeTime|ChargeTime/.test(key)?'chargeTime':key==='spread'?'spread':null;
export const WANDS=Object.freeze(Object.fromEntries(Object.entries(DEFINITIONS).map(([type,definition])=>{
 const b=definition.balance;
 const baseStats={damage:type==='test'?0:(b.normalDamage??b.pelletDamage??b.lineDamage),range:b.projectileRange??b.lineRange,size: b.projectileRadius??b.pelletRadius??b.lineRadius,speed:b.projectileSpeed??1,chargeTime:b.chargeTime,spread:b.spread??ITEM_BALANCE.spreadStart,manaCost:type==='test'?0:ITEM_BALANCE.normalMana*(b.manaMultiplier??1)};
 const coefficients={};for(const [key,value] of Object.entries(b)){const stat=parameterStat(key);if(stat&&baseStats[stat])coefficients[key]={stat,factor:value/baseStats[stat]};}
 return [type,{...definition,baseStats,coefficients}];
})));
export function wandStats(p){const stats={...WANDS[p.wand.type].baseStats};for(const key of Object.keys(stats))stats[key]*=statFactor(p,key);return stats;}
export function spellBalance(p){
 const definition=WANDS[p.wand.type],stats=wandStats(p),balance={...definition.balance};
 for(const [key,{stat,factor}] of Object.entries(definition.coefficients))balance[key]=stats[stat]*factor;
 if(p.wand.type==='fire'){balance.splashRadius=ITEM_BALANCE.splashRadius*stats.size/definition.baseStats.size;balance.splashDamage=ITEM_BALANCE.splashDamage*balance.normalDamage;}
 if(hasRune(p,'force'))for(const key of ['normalPush','specialPush','normalPull','pullSpeed'])if(balance[key]!==undefined)balance[key]*=SPECIAL_RUNE_BALANCE.pushMultiplier;
 return balance;
}
