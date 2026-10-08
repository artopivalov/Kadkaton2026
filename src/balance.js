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
 projectileRadius:12,chargedRadiusBonus:12,normalDamage:12,normalPush:100,splashFactor:.5,
 specialRadius:190,specialDamage:24,specialPush:210,specialDuration:.65
});
export const EARTH_BALANCE = Object.freeze({
 chargeTime:1.4,specialChargeTime:2.8,projectileSpeed:290,projectileRange:950,
 projectileRadius:8,chargedRadiusBonus:10,normalDamage:18,
 wallDistance:100,wallLength:200,wallThickness:24,wallDuration:6,
 maxRicochets:12,collisionEpsilon:.01
});
export const TEST_BALANCE = Object.freeze({
 chargeTime:1,specialChargeTime:2,projectileSpeed:330,projectileRange:350,
 projectileRadius:2,chargedRadiusBonus:5,normalPush:48,specialRadius:150,specialDuration:.6
});
export const SCENE_BALANCE = Object.freeze({pedestalRadius:38,portalRadius:50,spawnSpacing:70});
// Friendly fire deals half damage; self-damage stays undefined, so attackers never hit themselves.
export const PVP_BALANCE = Object.freeze({friendlyFireMultiplier:.5});

// Provisional playtest values: puzzle design and final enemy coefficients remain open in the GDD.
export const PLAYER_BALANCE={health:100,mana:100,manaRegen:3,specialMana:32};
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
export const ENCOUNTER_BALANCE={partyHealth:.6,partyDamage:.15,progressHealth:.8,progressDamage:.4,activationDistance:450,groupAggroRadius:220,pathRefreshDistance:100,waypointRadius:35,standoffFactor:.8,telegraphDelay:1.8,bulletSpeed:220,bulletCount:16,coneCount:9,coneAngle:1.1,areaRadius:150,bulletRange:420,puzzlePlateRadius:32,chestRadius:55,corridorBase:1,combatBase:3};

// Temporary values for the new shared item model and playtest geometry.
export const MAP_BALANCE={arenaRadius:540,corridorRadius:270,spacing:1840,branchStep:1840,entranceLength:1400,entranceRadius:300,margin:300,branchProgress:.05,mainRatio:.65};
export const ITEM_BALANCE={
 stats:['damage','range','size','speed','chargeTime','spread','manaCost'],
 inverse:['chargeTime','spread','manaCost'],negativeChance:.2,minPenalty:.01,maxPenalty:.2,minBonus:.01,maxBonus:.5,bonusPerTier:.1,wandRollMin:.8,wandRollMax:1.3,statMin:.02,statMax:50,
 damageBonus:[0,.2,.4,.65,1],extraStats:[0,0,1,2,3],wandBonus:.2,
 rareChanceStart:.02,rareChanceEnd:.12,normalMana:6,specialMana:32,
 spreadStart:.12,spreadMin:.015,splashRadius:48,splashDamage:.65,
 debugWidth:1400,debugHeight:1400
};
export const RARITIES=['Common','Uncommon','Rare','Epic','Legendary'];
export const RARITY_COLORS=['#ffffff','#69d68a','#69aaff','#bd83ff','#ffe168'];
export const NATURE_BALANCE={chargeTime:1.2,specialChargeTime:2.8,projectileSpeed:360,projectileRange:520,projectileRadius:5,chargedRadiusBonus:5,normalDamage:14,rootDuration:1.3,patchDistance:150,patchRadius:120,patchDuration:5,patchDamage:6,tickInterval:.6,slowFactor:.35};
export const GRAVITY_BALANCE={chargeTime:1.3,specialChargeTime:3,projectileSpeed:300,projectileRange:550,projectileRadius:7,chargedRadiusBonus:6,normalDamage:12,pullRadius:110,normalPull:70,wellDistance:180,wellRadius:150,wellDamage:7,wellDuration:4,pullSpeed:100,tickInterval:.5};
export const LIGHT_BALANCE={chargeTime:1.1,specialChargeTime:2.6,projectileSpeed:400,projectileRange:420,projectileRadius:8,chargedRadiusBonus:5,normalDamage:14,wallDistance:110,wallLength:220,wallThickness:20,wallDuration:5};
export const CRYSTAL_BALANCE={chargeTime:1.2,specialChargeTime:2.8,projectileSpeed:370,projectileRange:520,projectileRadius:5,chargedRadiusBonus:5,normalDamage:16,homingRange:220,homingAngle:.55,turnSpeed:1.2,childDamage:.4,childAngle:.32,trapDistance:160,trapRadius:100,trapDuration:8,trapDamage:28,shardCount:8};

// New content uses the same seven base stats. These are provisional playtest values.
export const BLOOD_BALANCE={chargeTime:1.3,specialChargeTime:3,projectileSpeed:400,projectileRange:540,projectileRadius:5,chargedRadiusBonus:5,normalDamage:18,healFactor:.25,specialDamage:12,needles:9,spread:.75,healthCost:12,minHealth:20,manaMultiplier:1.2};
export const STORM_BALANCE={chargeTime:1.4,specialChargeTime:3.2,projectileSpeed:1,projectileRange:550,projectileRadius:8,normalDamage:8,chainCount:4,chainRange:170,chainFalloff:.65,cloudDistance:180,cloudRadius:155,cloudDuration:4,cloudDamage:9,tickInterval:.7,manaMultiplier:1.6};
export const VOID_BALANCE={chargeTime:2.4,specialChargeTime:5.2,projectileSpeed:160,projectileRange:650,projectileRadius:14,chargedRadiusBonus:8,normalDamage:28,pierceCount:5,riftDistance:200,riftRadius:180,riftDuration:3,riftDamage:80,pullSpeed:100,manaMultiplier:2.5};
export const MIRROR_BALANCE={chargeTime:1.3,specialChargeTime:3,projectileSpeed:390,projectileRange:550,projectileRadius:8,chargedRadiusBonus:4,normalDamage:18,mirrorDistance:110,mirrorLength:180,mirrorDuration:5,reflections:6,manaMultiplier:1.2};
export const ORBIT_BALANCE={chargeTime:1.3,specialChargeTime:3,projectileSpeed:420,projectileRange:650,projectileRadius:9,normalDamage:16,orbitRadius:65,orbitDuration:7,orbitSpeed:2.5,contactInterval:.7,maxSatellites:3,launchSpread:.6,manaMultiplier:1.5};
export const COMET_BALANCE={chargeTime:1.8,specialChargeTime:4.5,projectileSpeed:180,projectileRange:750,projectileRadius:9,chargedRadiusBonus:5,normalDamage:12,acceleration:220,distanceDamage:2.5,meteorDistance:300,meteorRadius:180,meteorDamage:85,meteorDelay:2.5,debrisCount:10,debrisDamage:12,manaMultiplier:2.2};
export const PRISM_BALANCE={chargeTime:1.7,specialChargeTime:4,projectileSpeed:1,projectileRange:700,projectileRadius:7,normalDamage:24,prismDistance:150,prismRadius:35,prismDuration:8,prismShots:4,prismSpread:.4,sideDamage:.55,manaMultiplier:2};
export const WAND_MIN_RARITY={crystal:1,blood:2,storm:3,void:4,mirror:2,orbit:3,comet:4,prism:4};
export const WAND_WEIGHTS={blood:.5,storm:.5,void:.3};
export const SPECIAL_RUNE_BALANCE={minTier:2,chance:.3,maxEffects:1,copyOffset:24,wallGap:12,unstableMin:.5,unstableMax:3,healFactor:1,pushMultiplier:5};
export const SPECIAL_RUNES={
 double:{name:'Double cast',stats:{}},healing:{name:'Healing',stats:{}},force:{name:'Super knockback',stats:{}},haste:{name:'Super fast charge',stats:{chargeTime:.2}},huge:{name:'Huge size',stats:{size:3}},power:{name:'Power for mana',stats:{damage:2,manaCost:3}},reach:{name:'Long range',stats:{range:3,chargeTime:2}},swift:{name:'Swift projectile',stats:{speed:3,size:.5}},economy:{name:'Economy',stats:{manaCost:.25,damage:.5}},overload:{name:'Overload',stats:{damage:3,chargeTime:3}},unstable:{name:'Instability',stats:{}}
};
export const COMBAT_BALANCE={basePush:36,pierceFalloff:.75,pierceMin:.2,telegraphFill:.18,telegraphStroke:.8,rayDuration:.22,fieldTick:.5,objectSpacing:15};
export const ENEMY_SPAWN_BALANCE={specialChance:.2,progressSpecialChance:.15,rareChance:.05,combatProgress:4,spawnMinRadius:100,spawnRadiusSpan:160,corridorSpacing:50,initialCooldown:1,rareLeash:.9};
Object.assign(ENEMY_BALANCE,{
 jumper:{name:'Leaping skeleton',health:28,damage:8,speed:80,radius:18,range:260,cooldown:3.2,behavior:'jump',warning:.9,flightDuration:.65,landingRadius:55},
 hooker:{name:'Goblin hooker',health:48,damage:9,speed:70,radius:20,range:480,cooldown:3.5,behavior:'hook',projectileSpeed:300,pullSpeed:280,pullDuration:.65},
 wizard:{name:'Orc wizard',health:58,damage:16,speed:55,radius:22,range:550,cooldown:3.8,behavior:'wizard',warning:1.3,areaRadius:110},
 mushroomKeeper:{name:'Mushroom shepherd',health:100,damage:12,speed:30,radius:28,range:420,cooldown:5,behavior:'summoner',rare:true,closedDamage:.25,openDuration:1.5,summonCount:3,summonRadius:55},
 mushroom:{name:'Sporeling',health:10,damage:7,speed:140,radius:12,range:50,cooldown:1,behavior:'spore',warning:.75,areaRadius:65},
 crystalShell:{name:'Crystal shellback',health:170,damage:18,speed:40,radius:30,range:600,cooldown:4.5,behavior:'charge',rare:true,frontAngle:1.05,frontDamage:.25,warning:1.1,chargeSpeed:520,chargeDuration:1.2,stunDuration:2,chargeWidth:55},
 scribe:{name:'The Scribe',health:180,damage:12,speed:40,radius:26,range:600,cooldown:5,behavior:'scribe',rare:true,warning:1.8,sealCount:3,sealSpacing:60,sealDirections:4,projectileSpeed:250,sealRange:440}
});
export const BIOME_NEW_ENEMIES={forest:['jumper'],cave:['jumper','hooker'],library:['jumper','hooker','wizard']};
export const BIOME_RARE_ENEMIES={forest:'mushroomKeeper',cave:'crystalShell',library:'scribe'};
// Network tuning. The host simulates at the fixed tick; snapshots are sent every few ticks.
export const NET_BALANCE=Object.freeze({
 tick:1/60,snapshotEvery:2,viewRadius:2600,interpolationDelay:.075,maxCompensation:.15,inputRedundancy:4,maxUnacked:180,
 hostQueueLimit:8,hostCatchUpAt:4,hostGapWaitTicks:2,pingInterval:1,silenceTimeout:6,connectTimeout:15,
 correctionRate:12,maxCorrection:160,maxPlayers:8,chunkSize:14000,
 stunServers:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302']
});

// Provisional puzzle tuning: all room objects fit inside the circular arena.
export const PUZZLE_BALANCE={plateMin:5,plateMax:7,plateRing:310,plateRadius:32,objectRadius:18,dockRadius:42,followSpeed:85,followDistance:65,plantSpeed:65,plantOrbitX:105,plantOrbitY:190,scaleWeights:[1,2,3,4],scalePanRadius:95,rootHold:.6,bodyPush:110,shotPush:65,clockSolo:4,clockCoop:6,clockBeat:1.1,clockGap:.35,beamInterval:.65,beamSpeed:320,beamRadius:7,beamRange:1050,resetRadius:42,wandOffset:46};
export const PUZZLE_POOLS={forest:['wisps','roots','clock','scales','plates'],cave:['billiards','constellation','clock','scales','plates'],library:['lightCorridor','returnKey','crystalFork','books','clock','scales','plates']};

export const BATTLE_ROYALE_BALANCE=Object.freeze({radius:900,lavaMargin:240,fillSeconds:60,lavaDamage:.1,healthMultiplier:10,forceMultiplier:3,soloBots:2,soloTesting:true,spawnRadius:.78,coverRings:[.42,.66],coversPerSector:3,coverLength:100,coverThickness:24});

export const KNOCKBACK_BALANCE=Object.freeze({duration:.24,decay:14});
