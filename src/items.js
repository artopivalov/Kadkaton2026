import {ITEM_BALANCE as B,RARITIES,RARITY_COLORS,WAND_MIN_RARITY,WAND_WEIGHTS,SPECIAL_RUNE_BALANCE,SPECIAL_RUNES} from './balance.js';
export const combatWands=['fire','ice','lightning','air','earth','nature','gravity','light','crystal','blood','storm','void','mirror','orbit','comet','prism'];
export const rarityColor=item=>RARITY_COLORS[Math.max(0,RARITIES.indexOf(item?.rarity??'Common'))];
export function rollRarity(random,location,progress){
 const base={forest:0,cave:1,library:2}[location]??0;
 const rare=B.rareChanceStart+(B.rareChanceEnd-B.rareChanceStart)*progress;
 const roll=random();return RARITIES[base+(roll<rare?2:roll<rare+progress*(1-rare)?1:0)];
}
export function createWand(type,rarity='Common',random=()=>.5){
 rarity=wandRarity(type,rarity);
 const rolls=type==='test'?{}:Object.fromEntries(B.stats.map(stat=>[stat,B.wandRollMin+random()*(B.wandRollMax-B.wandRollMin)]));
 const tier=Math.max(0,RARITIES.indexOf(rarity)),modifiers=[{type:'damage',factor:1+B.damageBonus[tier]}];
 const pool=B.stats.filter(s=>s!=='damage');
 for(let i=0;i<B.extraStats[tier];i++){const type=pool.splice(Math.floor(random()*pool.length),1)[0];modifiers.push({type,factor:B.inverse.includes(type)?1-B.wandBonus:1+B.wandBonus});}
 return {kind:'wand',type,rarity,modifiers,rolls};
}
export function createRune(random,rarity='Common'){
 const modifiers=Array.from({length:Math.max(0,RARITIES.indexOf(rarity))+1},()=>{
  const type=B.stats[Math.floor(random()*B.stats.length)],negative=random()<B.negativeChance;
  const benefit=negative?-(B.minPenalty+random()*(B.maxPenalty-B.minPenalty)):B.minBonus+random()*(B.maxBonus+B.bonusPerTier*Math.max(0,RARITIES.indexOf(rarity))-B.minBonus);
  return {type,factor:1+(B.inverse.includes(type)?-benefit:benefit)};
 });const special=[];if(RARITIES.indexOf(rarity)>=SPECIAL_RUNE_BALANCE.minTier&&random()<SPECIAL_RUNE_BALANCE.chance){const pool=Object.keys(SPECIAL_RUNES);special.push(pool[Math.floor(random()*pool.length)]);}
 return {kind:'rune',rarity,modifiers,special};
}
export function statFactor(player,type){
 let value=player.wand?.rolls?.[type]??1;
 for(const item of [player.wand,player.rune]){
  const mods=item?.modifiers??(item?.factor!==undefined?[{type:item.type,factor:item.factor}]:[]);
  for(const mod of mods)if(mod.type===type)value*=mod.factor;
 }for(const special of player.rune?.special??[])value*=SPECIAL_RUNES[special]?.stats[type]??1;
 if(type==='damage')value*=player.castMultiplier??1;
 return Math.max(B.statMin,Math.min(B.statMax,value));
}
const statNames={damage:'Damage',range:'Range',size:'Size',speed:'Projectile Speed',chargeTime:'Charge Time',spread:'Spread',manaCost:'Mana Cost'};
export function runeLabel(rune){return (rune.modifiers??[{type:rune.type,factor:rune.factor}]).map(m=>`${statNames[m.type]??m.type} ${(m.factor>=1?'+':'')}${Math.round((m.factor-1)*100)}%`).concat((rune.special??[]).map(id=>SPECIAL_RUNES[id]?.name??id)).join(' · ');}

export const hasRune=(p,id)=>(p.rune?.special??[]).includes(id);
export function rollWand(random,rarity){
 const tier=Math.max(0,RARITIES.indexOf(rarity));const pool=combatWands.filter(type=>(WAND_MIN_RARITY[type]??0)<=tier);
 let roll=random()*pool.reduce((sum,type)=>sum+(WAND_WEIGHTS[type]??1),0);
 for(const type of pool){roll-=WAND_WEIGHTS[type]??1;if(roll<=0)return createWand(type,rarity,random);}return createWand(pool.at(-1),rarity,random);
}

export const wandRarity=(type,rarity)=>RARITIES[Math.max(WAND_MIN_RARITY[type]??0,RARITIES.indexOf(rarity),0)];
