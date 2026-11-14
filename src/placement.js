import { clamp } from './motion.js';

export function flowerSize(width, height, scale) {
  return clamp(Math.min(width, height) * .103, 20, 115) * scale;
}

export function constrain(x, y, width, height, radius, safe) {
  const side = Math.min(width * .45, radius * 1.28 + 6);
  const top = Math.min(height * .48, radius * 1.25 + 6 + safe.top);
  const bottom = Math.max(top, height - Math.max(48, radius * 1.85) - safe.bottom);
  const left = Math.min(width * .49, side + safe.left);
  const right = Math.max(left, width - side - safe.right);
  return {
    x: clamp(x, left, right),
    y: clamp(y, top, bottom),
  };
}

export function place(x, y, scene, radius, avoid = true) {
  const { width, height, safe, flowers } = scene;
  const origin = constrain(x, y, width, height, radius, safe);
  if (!avoid) return origin;
  let best = origin;
  let bestScore = -Infinity;
  for (let candidate = 0; candidate < 17; candidate++) {
    const angle = candidate * 2.39996323;
    const distance = radius * .89 * Math.sqrt(candidate / 16);
    const point = constrain(origin.x + distance * Math.cos(angle),
      origin.y + distance * Math.sin(angle), width, height, radius, safe);
    let crowding = 0;
    for (const flower of flowers) {
      if (flower.retired !== null) continue;
      const clearance = Math.hypot(point.x - flower.position.x, point.y - flower.position.y);
      const overlap = Math.max(0, (radius + flower.radius) * .64 - clearance);
      crowding += overlap * overlap / radius;
    }
    const score = -crowding - Math.hypot(point.x - origin.x, point.y - origin.y) * .32;
    if (score > bestScore) {
      best = point;
      bestScore = score;
    }
  }
  return best;
}
