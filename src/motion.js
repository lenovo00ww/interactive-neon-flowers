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
  result.center = smooth((age - flower.stemTime - .11) / .44);
  return result;
}

export function petalOpening(flower, age, index) {
  const t = clamp((age - flower.stemTime + .07 - index * .038) / flower.petalTime);
  return smooth(t) + Math.sin(Math.PI * t) * t ** 2 * .20;
}

export function stemPoint(out, t, root, tip, bend, bottom, top, sway) {
  const u = 1 - t;
  out.x = u ** 3 * root + 3 * u * u * t * (root - bend * .56)
    + 3 * u * t * t * (tip + bend) + t ** 3 * tip + t * t * sway;
  out.y = mix(bottom, top, t);
  return out;
}
