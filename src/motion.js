export const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
export const mix = (a, b, t) => a + (b - a) * t;
export function smooth(t) {
  t = clamp(t);
  return t * t * (3 - 2 * t);
}

export function seededRandom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function growthAt(flower, age, result = {}) {
  result.stem = smooth(age / flower.stemTime);
  result.bud = smooth((age - flower.stemTime * .74) / .26);
  result.center = smooth((age - flower.stemTime - .30) / .80);
  return result;
}

export function roseOpening(flower, age, layer, index) {
  const t = clamp((age - flower.stemTime + .03 - layer * .105 - index * .022) / flower.petalTime);
  return smooth(t) + Math.sin(Math.PI * t) * t ** 3 * .16;
}

export function stemPoint(out, t, root, tip, bend, bottom, top, sway) {
  const u = 1 - t;
  out.x = u ** 3 * root + 3 * u * u * t * (root - bend * 1.04)
    + 3 * u * t * t * (tip + bend * 1.35) + t ** 3 * tip + t * t * sway;
  out.y = mix(bottom, top, t);
  return out;
}
