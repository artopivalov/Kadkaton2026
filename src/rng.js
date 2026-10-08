// Seeded generator (mulberry32). Host and clients derive identical results from one shared seed.
const STEP=0x6D2B79F5;
function mix(a){let t=Math.imul(a^(a>>>15),a|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;}
// Standalone generator for pure functions of a seed, such as map generation.
export function createRandom(seed){let a=seed>>>0;return ()=>{a=(a+STEP)>>>0;return mix(a);};}
// Gameplay randomness inside the simulation keeps its state in the serializable world state.
export function nextRandom(s){s.rngState=(s.rngState+STEP)>>>0;return mix(s.rngState);}
