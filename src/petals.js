import { clamp, mix, petalOpening, smooth } from './motion.js';

// Local petal coordinates are anchored at the receptacle, pointing upward.
const palettes = [
  { rim: '#ff2393', mid: '#f743a4', warm: '#ff9ac0', root: '#ffe648', shadow: '#810c4b', edge: '#ff9add', halo: '255,45,145' },
  { rim: '#a93cff', mid: '#b950f1', warm: '#ec90f7', root: '#fff264', shadow: '#531780', edge: '#ec9aff', halo: '178,64,255' },
  { rim: '#ffb52e', mid: '#ffcb36', warm: '#ffdf55', root: '#fff590', shadow: '#ae4618', edge: '#ffe995', halo: '255,186,42' },
  { rim: '#f74bd1', mid: '#e854c4', warm: '#f796df', root: '#fff25a', shadow: '#82106d', edge: '#ffa9ee', halo: '255,60,206' },
  { rim: '#ff575f', mid: '#ff6b87', warm: '#ffb3a5', root: '#fff05b', shadow: '#a92057', edge: '#ffacb7', halo: '255,75,115' },
];

function sprite(size, draw) {
  const image = document.createElement('canvas');
  image.width = image.height = size;
  draw(image.getContext('2d'), size);
  return image;
}

function silhouette(ctx, curl, edge) {
  ctx.beginPath();
  ctx.moveTo(-.035, .04);
  ctx.bezierCurveTo(-.18, -.13, -.51, -.42, -.53 + edge, -.67);
  ctx.bezierCurveTo(-.55 + edge, -.84, -.43, -1.04, -.23, -1.015);
  ctx.bezierCurveTo(-.17, -1.012, -.07, -1.10 + curl, .045, -1.075);
  ctx.bezierCurveTo(.165, -1.08, .249, -.985, .33, -.964);
  ctx.bezierCurveTo(.51, -.917, .54 - edge, -.755, .46, -.55);
  ctx.bezierCurveTo(.38, -.35, .143, -.095, .035, .04);
  ctx.quadraticCurveTo(0, .064, -.035, .04);
  ctx.closePath();
}

function paintPetal(ctx, size, palette, variant) {
  ctx.translate(size * .5, size * .838);
  ctx.scale(size * .67, size * .67);
  silhouette(ctx, variant * .021, variant * .017);
  const pigment = ctx.createLinearGradient(0, .02, -.075, -1.07);
  pigment.addColorStop(0, palette.shadow);
  pigment.addColorStop(.18, palette.root);
  pigment.addColorStop(.28, palette.warm);
  pigment.addColorStop(.55, palette.mid);
  pigment.addColorStop(1, palette.rim);
  ctx.shadowColor = 'rgba(' + palette.halo + ',.72)';
  ctx.shadowBlur = size * .034;
  ctx.fillStyle = pigment;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.save();
  ctx.clip();
  const fold = ctx.createLinearGradient(-.5, 0, .5, 0);
  fold.addColorStop(0, '#1600279c');
  fold.addColorStop(.21, '#29002943');
  fold.addColorStop(.44, '#fff0c10e');
  fold.addColorStop(.63, '#fff4df48');
  fold.addColorStop(.77, '#ffffff09');
  fold.addColorStop(1, '#42002585');
  ctx.fillStyle = fold;
  ctx.fillRect(-.62, -1.2, 1.24, 1.3);
  const light = ctx.createRadialGradient(-.06, -.15, .008, -.06, -.15, .47);
  light.addColorStop(0, '#ffffa9c4');
  light.addColorStop(.47, '#fff24752');
  light.addColorStop(1, '#ffe76800');
  ctx.fillStyle = light;
  ctx.fillRect(-.62, -1.2, 1.24, 1.3);
  const veins = ctx.createLinearGradient(0, 0, 0, -.95);
  veins.addColorStop(0, '#fffaac00');
  veins.addColorStop(.4, '#ffffd256');
  veins.addColorStop(.79, '#ffe1ec37');
  veins.addColorStop(1, '#ffe1ec00');
  ctx.strokeStyle = veins;
  for (let i = -5; i <= 5; i++) {
    const f = i / 5;
    ctx.beginPath();
    ctx.moveTo(f * .025, -.075);
    ctx.bezierCurveTo(f * .105 - .02, -.31, f * .37 - .033, -.51,
      f * .41 - .035, -.82 + Math.abs(f) * .13 + Math.sin(i * 13 + variant) * .055);
    ctx.lineWidth = (i % 3 === 0) ? .009 : .004;
    ctx.stroke();
  }
  ctx.restore();
  ctx.lineWidth = .010;
  ctx.strokeStyle = palette.edge + '80';
  ctx.stroke();
}

function paintHalo(ctx, size, palette) {
  const half = size / 2;
  const g = ctx.createRadialGradient(half, half, 0, half, half, half);
  g.addColorStop(0, 'rgba(' + palette.halo + ',.39)');
  g.addColorStop(.39, 'rgba(' + palette.halo + ',.26)');
  g.addColorStop(.66, 'rgba(' + palette.halo + ',.095)');
  g.addColorStop(1, 'rgba(' + palette.halo + ',0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
}

function paintCenter(ctx, size) {
  const half = size / 2;
  ctx.translate(half, half);
  ctx.scale(half, half);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  glow.addColorStop(0, '#fffba3');
  glow.addColorStop(.25, '#fff56ed6');
  glow.addColorStop(.49, '#ffe53965');
  glow.addColorStop(1, '#ffca1900');
  ctx.fillStyle = glow;
  ctx.fillRect(-1, -1, 2, 2);
  for (let i = 0; i < 23; i++) {
    const radius = .41 * Math.sqrt(i / 23);
    const x = Math.cos(i * 2.39996) * radius;
    const y = Math.sin(i * 2.39996) * radius * .65;
    ctx.fillStyle = ['#fff895', '#ffe145', '#ffd139', '#fffdb2'][i % 4];
    ctx.beginPath();
    ctx.ellipse(x, y, .028 + (i % 3) * .012, .024 + (i % 3) * .008, i, 0, 2 * Math.PI);
    ctx.fill();
  }
}

export function createTextures() {
  return {
    petals: palettes.map(palette => [-2, -1, 0, 1, 2].map(variation =>
      sprite(272, (ctx, size) => paintPetal(ctx, size, palette, variation)))),
    halos: palettes.map(palette => sprite(128, (ctx, size) => paintHalo(ctx, size, palette))),
    center: sprite(128, paintCenter),
  };
}

// Back petals climb, side petals flare, and the foreground petal is foreshortened.
const profiles = [
  { angle: -.20, fan: -.32, length: 1.03, width: .70 },
  { angle: .22, fan: .28, length: .96, width: .74 },
  { angle: -.34, fan: -1.02, length: .84, width: .77 },
  { angle: .36, fan: .99, length: .89, width: .78 },
  { angle: .03, fan: 2.59, length: .39, width: .80 },
];

export function drawFlower(ctx, flower, age, growth, tip, textures, alpha, tilt, lowQuality) {
  const { center, bud } = growth;
  if (bud <= 0) return;
  const base = flower.radius * mix(.31, 1, smooth((age - flower.stemTime + .21) / .64));
  ctx.save();
  ctx.translate(tip.x, tip.y);
  ctx.rotate(tilt);
  ctx.scale(flower.aspect, 1);
  if (!lowQuality) {
    const radius = base * mix(.63, 1.37, center);
    ctx.globalAlpha = alpha * bud * mix(.20, .52, center);
    ctx.drawImage(textures.halos[flower.palette], -radius, -radius - base * .25, radius * 2, radius * 2);
  }
  for (let i = 0; i < profiles.length; i++) {
    const profile = profiles[i];
    const open = petalOpening(flower, age, i);
    const jitter = flower.variations[i];
    const along = base * mix(.80, profile.length * jitter, open);
    const across = base * mix(.22, profile.width * (2 - jitter), open);
    const angle = profile.angle + profile.fan * open + (jitter - 1) * .65;
    ctx.save();
    ctx.globalAlpha = alpha * bud * (i === 4 ? mix(.52, .94, clamp(open)) : 1);
    ctx.rotate(angle);
    ctx.drawImage(textures.petals[flower.palette][(i + flower.textureOffset) % 5],
      -across * .746, -along * 1.25, across / .67, along / .67);
    ctx.restore();
  }
  const radius = base * mix(.11, .53, center);
  ctx.globalAlpha = alpha * center;
  ctx.drawImage(textures.center, -radius, -radius - base * .13, radius * 2, radius * 2);
  ctx.restore();
}
