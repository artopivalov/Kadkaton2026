import {ITEM_BALANCE as B,RARITIES,RARITY_COLORS} from './balance.js';
export const combatWands=['fire','ice','lightning','air','earth','nature','gravity','light','crystal'];
export const rarityColor=item=>RARITY_COLORS[Math.max(0,RARITIES.indexOf(item?.rarity??'Common'))];
export function rollRarity(random,location,progress){
 const base={forest:0,cave:1,library:2}[location]??0;
 const rare=B.rareChanceStart+(B.rareChanceEnd-B.rareChanceStart)*progress;
 const roll=random();return RARITIES[base+(roll<rare?2:roll<rare+progress*(1-rare)?1:0)];
}
export function createWand(type,rarity='Common',random=()=>.5){
 const tier=Math.max(0,RARITIES.indexOf(rarity)),modifiers=[{type:'damage',factor:1+B.damageBonus[tier]}];
 const pool=B.stats.filter(s=>s!=='damage');
 for(let i=0;i<B.extraStats[tier];i++){const type=pool.splice(Math.floor(random()*pool.length),1)[0];modifiers.push({type,factor:B.inverse.includes(type)?1-B.wandBonus:1+B.wandBonus});}
 return {kind:'wand',type,rarity,modifiers};
}
export function createRune(random,rarity='Common'){
 const modifiers=Array.from({length:Math.max(0,RARITIES.indexOf(rarity))+1},()=>{
  const type=B.stats[Math.floor(random()*B.stats.length)],negative=random()<B.negativeChance;
  const benefit=negative?-(B.minPenalty+random()*(B.maxPenalty-B.minPenalty)):B.minBonus+random()*(B.maxBonus-B.minBonus);
  return {type,factor:1+(B.inverse.includes(type)?-benefit:benefit)};
 });return {kind:'rune',rarity,modifiers};
}
export function statFactor(player,type){
 let value=1;
 for(const item of [player.wand,player.rune]){
  const mods=item?.modifiers??(item?.factor!==undefined?[{type:item.type,factor:item.factor}]:[]);
  for(const mod of mods)if(mod.type===type)value*=mod.factor;
 }return Math.max(.05,Math.min(10,value));
}
const statNames={damage:'Damage',range:'Range',size:'Size',speed:'Projectile Speed',chargeTime:'Charge Time',spread:'Spread',manaCost:'Mana Cost'};
export function runeLabel(rune){return (rune.modifiers??[{type:rune.type,factor:rune.factor}]).map(m=>`${statNames[m.type]??m.type} ${(m.factor>=1?'+':'')}${Math.round((m.factor-1)*100)}%`).join(' · ');}
