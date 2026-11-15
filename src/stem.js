import { stemPoint } from './motion.js';

const point = { x: 0, y: 0 };
const green = [
  ['#204136', '#58a775', '#a9d68c'],
  ['#234d31', '#61a760', '#c3db8f'],
  ['#35451e', '#849c49', '#d2df8b'],
];

export function drawStem(ctx, flower, scene, progress, sway, alpha, tip) {
  const { width, height } = scene;
  const { x, y } = flower.position;
  const root = x - flower.root * Math.min(width * .19, height * .28);
  const bottom = height + 5;
  const bend = flower.bend * Math.min(width * .1, height * .14);
  stemPoint(tip, progress, root, x, bend, bottom, y, sway);
  if (progress <= 0) return;
  const thickness = Math.max(1.07, flower.radius * .036);
  const segments = Math.max(4, Math.ceil(progress * 27));
  const gradient = ctx.createLinearGradient(0, bottom, 0, y);
  green[flower.green].forEach((color, index) => gradient.addColorStop([0, .60, 1][index], color));
  ctx.globalAlpha = alpha * flower.depth;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  for (let side = 1; side >= -1; side -= 2) {
    for (let i = 0; i <= segments; i++) {
      const t = progress * (side === 1 ? i : segments - i) / segments;
      stemPoint(point, t, root, x, bend, bottom, y, sway);
      const edge = point.x + side * thickness * (.60 - t * .36);
      if (side === 1 && i === 0) ctx.moveTo(edge, point.y);
      else ctx.lineTo(edge, point.y);
    }
  }
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}
