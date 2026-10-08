// Initial tuning values are provisional and should be playtested together.
export const CONFIG = Object.freeze({
  cameraZoom:.72,worldWidth:1200,worldHeight:900,speed:190,playerRadius:20,
  inputDeadzone:.08,pickupRadius:38,dropDistance:68,pickupDelay:.8,
  chargeTime:1.2,specialChargeTime:3.6,normalChargeExponent:2,
  projectileSpeed:380,projectileRange:540,minRangeFactor:.01,projectileOffset:25,
  projectileRadius:.6,chargedRadiusBonus:11.4,normalDamage:10,minDamageFactor:.0001,
  targetRadius:22,specialRadius:180,specialDamage:30,specialDuration:.7,
  impactDuration:.35,impactRadius:24,chargedImpactBonus:24,
  expiryDuration:.25,expiryRadius:15
});
export const ICE_BALANCE = Object.freeze({
  chargeTime:1.2,specialChargeTime:2.8,pellets:7,spread:.65,
  projectileSpeed:440,projectileRange:470,pelletDamage:3,pelletRadius:2,chargedRadiusBonus:3,
  waveSpeed:260,waveRange:520,waveRadius:80,waveDepth:18,waveDamage:24
});
export const LIGHTNING_BALANCE = Object.freeze({
  chargeTime:1.2,specialChargeTime:2.6,lineRange:550,lineRadius:8,lineDamage:12,
  strikeMinDistance:45,strikeMaxDistance:560,strikeRadius:75,strikeDamage:35,
  lineDuration:.25,strikeDuration:.6
});
export const AIR_BALANCE = Object.freeze({
 chargeTime:1.2,specialChargeTime:2.6,projectileSpeed:320,projectileRange:480,
 projectileRadius:12,chargedRadiusBonus:12,normalDamage:12,normalPush:100,
 specialRadius:190,specialPush:210,specialDuration:.65
});
export const EARTH_BALANCE = Object.freeze({
 chargeTime:1.4,specialChargeTime:2.8,projectileSpeed:290,projectileRange:950,
 projectileRadius:8,chargedRadiusBonus:10,normalDamage:18,
 wallDistance:100,wallLength:200,wallThickness:24,wallDuration:6,
 maxRicochets:12,collisionEpsilon:.01
});
export const TEST_BALANCE = Object.freeze({
 chargeTime:1,specialChargeTime:2,projectileSpeed:330,projectileRange:350,
 projectileRadius:2,chargedRadiusBonus:5,normalPush:24,specialRadius:150,specialDuration:.6
});
export const SCENE_BALANCE = Object.freeze({pedestalRadius:38,portalRadius:50,spawnSpacing:70});
// Friendly fire deals half damage; self-damage stays undefined, so attackers never hit themselves.
export const PVP_BALANCE = Object.freeze({friendlyFireMultiplier:.5});

// Provisional playtest values: puzzle design and final enemy coefficients remain open in the GDD.
export const PLAYER_BALANCE={health:100,mana:100,manaRegen:12,specialMana:20};
export const CAMERA_BALANCE={min:.35,max:1.25,default:.72,smoothing:8,flightSpeed:650};
export const LOCATION_BALANCE={
 forest:{name:'Forest',poiCount:10,difficulty:1,color:'#294934',melee:'skeleton',ranged:'archer',boss:'skeletonBoss'},
 cave:{name:'Cave',poiCount:15,difficulty:1.5,color:'#42404b',melee:'goblin',ranged:'goblinArcher',boss:'goblinBoss'},
 library:{name:'Library',poiCount:20,difficulty:2,color:'#463b32',melee:'orc',ranged:'orcArcher',boss:'orcBoss'}
};
export const ENEMY_BALANCE={
 skeleton:{name:'Skeleton',health:24,damage:6,speed:95,radius:16,range:38,cooldown:1.1},
 archer:{name:'Skeleton archer',health:18,damage:5,speed:65,radius:16,range:420,cooldown:2,projectileSpeed:240},
 goblin:{name:'Goblin',health:40,damage:10,speed:110,radius:18,range:42,cooldown:.9},
 goblinArcher:{name:'Goblin thrower',health:32,damage:8,speed:70,radius:18,range:460,cooldown:1.8,projectileSpeed:270},
 orc:{name:'Orc',health:65,damage:15,speed:80,radius:24,range:50,cooldown:1.3},
 orcArcher:{name:'Orc shooter',health:50,damage:12,speed:60,radius:24,range:500,cooldown:1.6,projectileSpeed:300},
 skeletonBoss:{name:'Skeleton king',health:200,damage:12,speed:45,radius:42,range:600,cooldown:4,boss:true},
 goblinBoss:{name:'Goblin boss',health:320,damage:16,speed:45,radius:44,range:650,cooldown:3.6,boss:true},
 orcBoss:{name:'Orc boss',health:480,damage:22,speed:40,radius:50,range:700,cooldown:3.2,boss:true}
};
export const ENCOUNTER_BALANCE={partyHealth:.6,partyDamage:.15,progressHealth:.8,progressDamage:.4,activationDistance:375,telegraphDelay:1.8,bulletSpeed:220,bulletCount:16,coneCount:9,coneAngle:1.1,areaRadius:150,bulletRange:420,puzzlePlateRadius:32,chestRadius:55,corridorBase:1,combatBase:3};

// Temporary values for the new shared item model and playtest geometry.
export const MAP_BALANCE={arenaRadius:360,corridorRadius:180,spacing:1100,branchStep:1100};
export const ITEM_BALANCE={
 stats:['damage','range','size','speed','chargeTime','spread','manaCost'],
 inverse:['chargeTime','spread','manaCost'],negativeChance:.2,minPenalty:.01,maxPenalty:.2,minBonus:.01,maxBonus:.25,
 damageBonus:[0,.2,.4,.65,1],extraStats:[0,0,1,2,3],wandBonus:.2,
 rareChanceStart:.02,rareChanceEnd:.12,normalMana:2,specialMana:20,
 spreadStart:.12,spreadMin:.015,splashRadius:48,splashDamage:.65,
 debugWidth:1400,debugHeight:1100
};
export const RARITIES=['Common','Uncommon','Rare','Epic','Legendary'];
export const RARITY_COLORS=['#ffffff','#69d68a','#69aaff','#bd83ff','#ffe168'];
export const NATURE_BALANCE={chargeTime:1.2,specialChargeTime:2.8,projectileSpeed:360,projectileRange:520,projectileRadius:5,chargedRadiusBonus:5,normalDamage:14,rootDuration:1.3,patchDistance:150,patchRadius:120,patchDuration:5,slowFactor:.35};
export const GRAVITY_BALANCE={chargeTime:1.3,specialChargeTime:3,projectileSpeed:300,projectileRange:550,projectileRadius:7,chargedRadiusBonus:6,normalDamage:12,pullRadius:110,normalPull:70,wellDistance:180,wellRadius:150,wellDamage:7,wellDuration:4,pullSpeed:100,tickInterval:.5};
export const LIGHT_BALANCE={chargeTime:1.1,specialChargeTime:2.6,projectileSpeed:400,projectileRange:420,projectileRadius:8,chargedRadiusBonus:5,normalDamage:14,wallDistance:110,wallLength:220,wallThickness:20,wallDuration:5};
export const CRYSTAL_BALANCE={chargeTime:1.2,specialChargeTime:2.8,projectileSpeed:370,projectileRange:520,projectileRadius:5,chargedRadiusBonus:5,normalDamage:16,homingRange:220,homingAngle:.55,turnSpeed:1.2,childDamage:.4,childAngle:.32,trapDistance:160,trapRadius:100,trapDuration:8,trapDamage:28,shardCount:8};
