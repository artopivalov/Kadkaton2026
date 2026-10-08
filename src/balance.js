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
export const SCENE_BALANCE = Object.freeze({pedestalRadius:38,portalRadius:50});
