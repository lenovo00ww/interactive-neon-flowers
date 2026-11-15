import { mix, roseOpening, smooth } from './motion.js';

// Each palette runs from a shaded crease through the body to the rolled lip.
export const palettes = [
  ['#651538', '#d75288', '#ff9ac7', '#ffd1e6', '255,126,181'],
  ['#671635', '#c73c78', '#ff7fbe', '#ffb6d9', '255,99,169'],
  ['#671036', '#b82968', '#ff5fb0', '#ffa3cf', '255,78,158'],
  ['#590c32', '#a51d5b', '#ff4fa3', '#ff94c7', '250,64,153'],
  ['#51092d', '#92164f', '#eb338d', '#ff80b9', '244,51,141'],
];

const TAU = 2 * Math.PI;
const layers = [
  { count: 7, radius: .97, height: -.25, span: .73, offset: .1 },
  { count: 6, radius: .76, height: -.37, span: .84, offset: .53 },
  { count: 5, radius: .54, height: -.47, span: .98, offset: .90 },
  { count: 4, radius: .34, height: -.53, span: 1.21, offset: 1.34 },
  { count: 3, radius: .19, height: -.56, span: 1.56, offset: 1.90 },
];

// The front walls occlude the bases of the petals behind them. The rings
// advance in azimuth and contract toward a small open, rolled center.
export function roseShape(variant) {
  const petals = layers.flatMap((ring, layer) => {
    const count = ring.count - (variant === 1 && layer === 1 ? 1 : 0);
    return Array.from({ length: count }, (_, index) => {
      const noise = Math.sin((index + 1) * 7.23 + variant * 4.31 + layer * 1.39);
      const angle = ring.offset + (index + .12 * noise) * TAU / count + variant * .72;
      return { ring, layer, index, angle, noise, front: Math.sin(angle) };
    });
  });
  return petals.sort((a, b) => {
    const order = p => p.front > .08 ? 10 - p.layer + p.front * .6 : p.layer + p.front * .6;
    return order(a) - order(b);
  });
}

function petal(ctx, p, open, colors) {
  const { ring, layer, angle, front, noise } = p;
  const radius = ring.radius * (1 + noise * .095) * mix(.31, 1, open);
  const depth = mix(.19, .46, open);
  const height = mix(-.81 - layer * .036, ring.height, open);
  const span = ring.span * mix(.70, 1, open);
  const rootX = Math.cos(angle) * radius * .23;
  const rootY = height * .32 + front * radius * .07;
  const lip = (u, dip = 0) => {
    const a = angle + span * (u + .12 * noise * (1 - u * u));
    const curl = 1 - .17 * u * u + .045 * Math.sin(u * 4 + angle);
    return [
      Math.cos(a) * radius * curl,
      height + Math.sin(a) * radius * depth * curl
        - (.12 + noise * .035) * (1 - u * u) * mix(.62, 1, open) + dip,
    ];
  };
  const left = lip(-1), right = lip(1), crest = lip(0);
  const fold = ctx.createLinearGradient(crest[0], crest[1], rootX, rootY + .025);
  fold.addColorStop(0, colors[2]);
  fold.addColorStop(.24, colors[2]);
  fold.addColorStop(.53, colors[1]);
  fold.addColorStop(.91, colors[0]);
  ctx.fillStyle = fold;
  ctx.beginPath();
  ctx.moveTo(rootX, rootY);
  ctx.bezierCurveTo(mix(rootX, left[0], .82), rootY - .018, left[0] * 1.09, left[1] + .105, ...left);
  for (let i = 1; i <= 10; i++) ctx.lineTo(...lip(i / 5 - 1));
  ctx.bezierCurveTo(right[0] * 1.08, right[1] + .10, mix(rootX, right[0], .73), rootY + .015, rootX, rootY);
  ctx.closePath();
  ctx.fill();

  // A narrow, tapered lip is lit across its width and falls into the crease.
  const rim = ctx.createLinearGradient(left[0], left[1], right[0] + .002, right[1] + .002);
  rim.addColorStop(0, colors[2] + '00');
  rim.addColorStop(.42, colors[3] + 'd7');
  rim.addColorStop(.72, colors[3] + 'a0');
  rim.addColorStop(1, colors[2] + '10');
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.moveTo(...left);
  for (let i = 1; i <= 10; i++) ctx.lineTo(...lip(i / 5 - 1));
  for (let i = 9; i >= 0; i--) {
    const u = i / 5 - 1;
    ctx.lineTo(...lip(u, (.012 + radius * .032) * (1 - u * u)));
  }
  ctx.fill();
}

const SIZE = 288;
const UNIT = 116;
const ANCHOR = 193;
const SHADES = 3;

export function createTextures() {
  const shapes = Array.from({ length: SHADES }, (_, i) => roseShape(i));
  const blooms = palettes.map(colors => shapes.map(shape => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    ctx.translate(SIZE / 2, ANCHOR);
    ctx.scale(UNIT, UNIT);
    paint(ctx, shape, colors, null, 3, false);
    return canvas;
  }));
  return { shapes, blooms };
}

function paint(ctx, shape, colors, flower, age, lowQuality) {
  const bloom = flower ? roseOpening(flower, age, 1, 0) : 1;
  if (!lowQuality) {
    const halo = ctx.createRadialGradient(0, -.45, .03, 0, -.45, mix(.72, 1.19, bloom));
    halo.addColorStop(0, 'rgba(' + colors[4] + ',.31)');
    halo.addColorStop(.58, 'rgba(' + colors[4] + ',.12)');
    halo.addColorStop(1, 'rgba(' + colors[4] + ',0)');
    ctx.fillStyle = halo;
    ctx.fillRect(-1.23, -1.65, 2.46, 2.37);
  }
  for (const p of shape) petal(ctx, p, flower ? roseOpening(flower, age, p.layer, p.index) : 1, colors);
}

export function drawFlower(ctx, flower, age, growth, tip, textures, alpha, tilt, lowQuality) {
  if (growth.bud <= 0 || alpha <= 0) return;
  const radius = flower.radius * mix(.46, 1, growth.bud);
  const settled = age >= flower.stemTime + flower.petalTime + .67;
  ctx.save();
  ctx.translate(tip.x, tip.y);
  ctx.rotate(tilt);
  ctx.scale(radius * flower.aspect, radius * flower.pitch);
  ctx.globalAlpha = alpha * growth.bud;
  // The small, curved sepals clasp the base following the same head transform.
  ctx.fillStyle = '#488357';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, .025);
    ctx.quadraticCurveTo(side * .13, .013, side * .24, -.19);
    ctx.quadraticCurveTo(side * .09, -.08, 0, -.10);
    ctx.fill();
  }
  if (settled) {
    ctx.drawImage(textures.blooms[flower.palette][flower.variant],
      -SIZE / (2 * UNIT), -ANCHOR / UNIT, SIZE / UNIT, SIZE / UNIT);
  } else {
    paint(ctx, textures.shapes[flower.variant], palettes[flower.palette], flower, age, lowQuality);
  }
  ctx.restore();
}
