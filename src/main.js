import './style.css';
import { clamp, growthAt, petalOpening, seededRandom, smooth } from './motion.js';
import { constrain, flowerSize, place } from './placement.js';
import { createTextures, drawFlower } from './petals.js';
import { drawStem } from './stem.js';

const garden = document.querySelector('#garden');
const canvas = document.querySelector('#scene');
const hint = document.querySelector('#hint');
const announcement = document.querySelector('#announcement');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const ctx = canvas.getContext('2d', { alpha: false });
const query = new URLSearchParams(location.search);
const testing = query.has('qa');
const random = seededRandom(query.has('seed') ? Number(query.get('seed')) : 78126);
const scene = { width: 1, height: 1, safe: {}, flowers: [], dpr: 1 };
let quality = 2;
let added = 0;
let frameId = 0;
let lastTime = 0;
let lastResize = '';
let slowFrames = 0;
let clock = 0;
let manual = null;
let textures;
let contextLost = false;
let announcementTimer;

function readSafeArea() {
  const probe = document.createElement('i');
  probe.style.cssText = 'position:absolute;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  garden.append(probe);
  const style = getComputedStyle(probe);
  const safe = { top: parseFloat(style.paddingTop), right: parseFloat(style.paddingRight),
    bottom: parseFloat(style.paddingBottom), left: parseFloat(style.paddingLeft) };
  probe.remove();
  return safe;
}

function resize() {
  const { width, height } = garden.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, [1, 1.4, 2][quality],
    Math.sqrt(5400000 / Math.max(1, width * height)));
  const key = [width, height, dpr].join('/');
  if (lastResize === key) return;
  lastResize = key;
  Object.assign(scene, { width, height, dpr, safe: readSafeArea() });
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
  ctx.imageSmoothingQuality = 'medium';
  for (const flower of scene.flowers) {
    flower.radius = flowerSize(width, height, flower.scale);
    flower.position = constrain(flower.nx * width, flower.ny * height, width,
      height, flower.radius, scene.safe);
  }
  if (motion.matches || manual !== null) render();
}

function plant(x, y, preset) {
  const palette = preset?.palette ?? Math.floor(random() * 5);
  const density = scene.width < 580 ? smooth((scene.flowers.length - 9) / 26) : 0;
  const scale = preset?.scale ?? ((.46 + random() * .54) * (1 - density * .22));
  const radius = flowerSize(scene.width, scene.height, scale);
  const position = place(x, y, scene, radius, !preset);
  const flower = {
    position, scale, radius, palette,
    nx: position.x / scene.width, ny: position.y / scene.height,
    born: clock - (preset ? 3 : 0), retired: null,
    stemTime: .63 + random() * .34,
    petalTime: .48 + random() * .15,
    root: preset?.root ?? (random() - .5) * 1.65,
    bend: preset?.bend ?? (random() - .5) * 2.3,
    phase: random() * Math.PI * 2,
    speed: .53 + random() * .45,
    depth: .74 + random() * .26,
    aspect: .89 + random() * .22,
    pitch: .69 + .38 * (Math.sin(position.x * .083 + position.y) * .5 + .5),
    tilt: (random() - .5) * .53,
    green: Math.floor(random() * 3),
    textureOffset: Math.floor(random() * 5),
    variations: Array.from({ length: 5 }, () => .87 + random() * .27),
    tip: { x: 0, y: 0 },
    growth: {},
  };
  scene.flowers.push(flower);
  const active = scene.flowers.filter(item => item.retired === null);
  if (active.length > 40) {
    const oldest = active[0];
    if (motion.matches) scene.flowers.splice(scene.flowers.indexOf(oldest), 1);
    else oldest.retired = clock;
  }
  // Keep a small allowance for fades even under unusually dense input.
  if (scene.flowers.length > 50) scene.flowers.splice(0, scene.flowers.length - 50);
  return flower;
}

function seedGarden() {
  const compact = scene.width < 580;
  const initial = compact
    ? [[.15, .401, .53, 4, -.38, .98], [.40, .32, 1.10, 0, .47, -.96],
      [.76, .362, .72, 2, -.42, 1.02], [.86, .50, .48, 1, -.35, .80],
      [.57, .646, .69, 3, .38, -.87]]
    : [[.13, .39, .47, 4, -.32, .90], [.26, .47, .56, 1, -.34, -.85],
      [.43, .32, 1.04, 0, .45, -.84], [.59, .65, .67, 3, .30, 1.05],
      [.75, .32, .67, 2, .30, -.91], [.88, .48, .51, 1, -.25, .78]];
  for (const [x, y, scale, palette, root, bend] of initial) {
    plant(scene.width * x, scene.height * y, { scale, palette, root, bend });
  }
}

function render() {
  if (contextLost) return;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, scene.width, scene.height);
  for (let i = scene.flowers.length - 1; i >= 0; i--) {
    const retired = scene.flowers[i].retired;
    if (retired !== null && clock - retired >= .75) scene.flowers.splice(i, 1);
  }
  for (const flower of scene.flowers) {
    const age = motion.matches ? 3 : Math.max(0, clock - flower.born);
    const p = growthAt(flower, age, flower.growth);
    flower.age = age;
    const pulse = motion.matches ? 0 : Math.sin(clock * flower.speed + flower.phase);
    const sway = pulse * Math.min(8, flower.radius * .12)
      + (motion.matches ? 0 : Math.sin(clock * .33 + flower.phase) * flower.radius * .018);
    const opacity = flower.retired === null ? 1 : 1 - smooth((clock - flower.retired) / .75);
    drawStem(ctx, flower, scene, p.stem, sway, opacity, flower.tip);
    flower.opacity = opacity;
    flower.rotation = flower.tilt + pulse * .042 + (motion.matches ? 0 : Math.sin(clock * .68 + flower.phase + .75) * .023);
  }
  // Put the thin stems behind the heads, including in a densely planted garden.
  for (const flower of scene.flowers) {
    const { age, growth, tip, opacity, rotation } = flower;
    drawFlower(ctx, flower, age, growth, tip, textures, opacity, rotation, quality === 0);

    // A brief, subtle point of light confirms the tap while the stem is beginning.
    if (age < .28) {
      ctx.globalAlpha = .43 * (1 - smooth(age / .28));
      ctx.fillStyle = '#ffdcec';
      ctx.beginPath();
      ctx.arc(flower.position.x, flower.position.y, 1.15 + age * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

function animate(now) {
  frameId = 0;
  if (manual !== null || motion.matches || contextLost || document.hidden) return;
  const dt = lastTime ? (now - lastTime) / 1000 : 0;
  lastTime = now;
  clock += clamp(dt, 0, .066);
  if (dt > .028) slowFrames++;
  else slowFrames = Math.max(0, slowFrames - 2);
  if (slowFrames > 45 && quality > 0) {
    slowFrames = 0;
    quality--;
    resize();
  }
  render();
  start();
}

function start() {
  if (!frameId && !motion.matches && manual === null && !contextLost && !document.hidden) {
    frameId = requestAnimationFrame(animate);
  }
}

function syncMotion() {
  if (frameId) cancelAnimationFrame(frameId);
  frameId = lastTime = 0;
  if (motion.matches || manual !== null) render();
  start();
}

function addFlower(x, y) {
  plant(x, y);
  added++;
  hint.classList.add('dismissed');
  clearTimeout(announcementTimer);
  announcementTimer = setTimeout(() => {
    announcement.textContent = `Flowers planted: ${added}.`;
  }, 150);
  if (motion.matches || manual !== null) render();
}

function addInput() {
  const active = new Map();
  // Commit on pointerdown for instant feedback. Subsequent lifecycle events only clear state.
  garden.addEventListener('pointerdown', event => {
    if (event.button !== 0 || active.has(event.pointerId)) return;
    active.set(event.pointerId, true);
    if (event.isTrusted) garden.setPointerCapture(event.pointerId);
    const rect = garden.getBoundingClientRect();
    addFlower(event.clientX - rect.left, event.clientY - rect.top);
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    garden.addEventListener(event, pointer => active.delete(pointer.pointerId));
  }
  garden.addEventListener('keydown', event => {
    if (event.target !== garden || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    if (!event.repeat) addFlower(scene.width * (.25 + .5 * random()), scene.height * (.30 + .33 * random()));
  });
}

if (!ctx) {
  hint.hidden = true;
  document.querySelector('#failure').hidden = false;
} else {
  textures = createTextures();
  resize();
  seedGarden();
  render();
  addInput();
  new ResizeObserver(resize).observe(garden);
  window.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', syncMotion);
  motion.addEventListener('change', syncMotion);
  canvas.addEventListener('contextlost', event => {
    event.preventDefault();
    contextLost = true;
    syncMotion();
  });
  canvas.addEventListener('contextrestored', () => {
    contextLost = false;
    lastResize = '';
    resize();
    render();
    syncMotion();
  });
  start();

  if (testing) {
    window.gardenQA = {
      snapshot: () => ({
        added, width: scene.width, height: scene.height, dpr: scene.dpr,
        active: scene.flowers.filter(item => item.retired === null).length,
        total: scene.flowers.length,
        flowers: scene.flowers.map(flower => ({
          x: flower.position.x, y: flower.position.y, tip: { ...flower.tip },
          stem: flower.stemTime, petals: flower.petalTime, radius: flower.radius,
          progress: growthAt(flower, motion.matches ? 3 : clock - flower.born),
          opening: Array.from({ length: 5 }, (_, index) => petalOpening(flower, flower.age, index)),
        })),
      }),
      freeze: () => { manual = clock; syncMotion(); },
      advance: seconds => {
        if (manual === null) throw new Error('Freeze the clock before advancing it.');
        clock += seconds;
        render();
      },
    };
  }
}
