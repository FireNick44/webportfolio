const SEED_KEY = "flask-field-seed";
const FALLBACK_SEED = 42;

export function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getSessionSeed(): number {
  try {
    const existing = sessionStorage.getItem(SEED_KEY);
    if (existing !== null) return Number(existing);
    const seed = Math.floor(Math.random() * 0xffffffff);
    sessionStorage.setItem(SEED_KEY, String(seed));
    return seed;
  } catch {
    return FALLBACK_SEED;
  }
}
