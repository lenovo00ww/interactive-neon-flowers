import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const url = process.env.GARDEN_URL || 'http://127.0.0.1:4173/';
const out = process.env.GARDEN_OUTPUT || 'qa-output';
const browser = await chromium.launch(process.env.GARDEN_BROWSER_PATH
  ? { executablePath: process.env.GARDEN_BROWSER_PATH }
  : { channel: process.env.GARDEN_BROWSER_CHANNEL || 'chrome' });
const failures = [];
const checks = [];
await mkdir(out, { recursive: true });

async function open(viewport, options = {}) {
  const page = await browser.newPage({ viewport, ...options });
  page.on('pageerror', error => failures.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') failures.push(message.text());
  });
  page.on('requestfailed', request => failures.push(request.url() + ' ' + request.failure()?.errorText));
  page.on('response', response => {
    if (response.status() >= 400) failures.push(response.url() + ' ' + response.status());
  });
  const target = new URL(url);
  target.searchParams.set('qa', '1');
  target.searchParams.set('seed', '78126');
  assert.equal((await page.goto(target.href)).status(), 200);
  await page.waitForFunction(() => !!window.gardenQA);
  await page.evaluate(() => gardenQA.freeze());
  return page;
}
const snapshot = page => page.evaluate(() => gardenQA.snapshot());
const advance = (page, seconds) => page.evaluate(value => gardenQA.advance(value), seconds);
const capture = (page, name) => page.screenshot({ path: out + '/' + name + '.png' });

try {
  for (const [name, width, height, touch] of [
    ['desktop', 1440, 900, false], ['full-hd', 1920, 1080, false],
    ['portrait', 390, 844, true], ['landscape', 844, 390, true],
    ['tablet', 768, 1024, true],
  ]) {
    const page = await open({ width, height }, { hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 3 : 1 });
    const initial = await snapshot(page);
    assert.equal(initial.active, width < 580 ? 4 : 6);
    assert.equal(initial.width, width);
    assert.equal(initial.height, height);
    const hasFlowerPixels = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const ctx = canvas.getContext('2d');
      const p = gardenQA.snapshot().flowers[0].tip;
      const pixel = ctx.getImageData(p.x * canvas.width / innerWidth, (p.y - 3) * canvas.height / innerHeight, 1, 1).data;
      return pixel[0] + pixel[1] + pixel[2] > 80;
    });
    assert.ok(hasFlowerPixels, 'rendered flower pixels');
    await capture(page, name);
    if (touch) await page.touchscreen.tap(width * .55, height * .46);
    else await page.mouse.click(width * .55, height * .46);
    const planted = await snapshot(page);
    assert.equal(planted.added, 1);
    assert.equal(planted.active, initial.active + 1);
    assert.ok(Math.hypot(planted.flowers.at(-1).x - width * .55, planted.flowers.at(-1).y - height * .46) < 75);
    if (touch) {
      await advance(page, 2);
      await capture(page, name + '-planted');
    }
    await page.close();
    checks.push(name + ' ' + width + '×' + height + ': initial pixels, tap, coordinate mapping, no duplicate');
  }

  const stage = await open({ width: 960, height: 660 });
  await capture(stage, 'motion-00-before');
  await stage.mouse.click(510, 315);
  const planted = (await snapshot(stage)).flowers.at(-1);
  await capture(stage, 'motion-01-feedback');
  assert.equal(planted.progress.stem, 0);
  const times = [.37, planted.stem * .99, planted.stem + .31, 1.8, 2.85];
  const names = ['02-stem', '03-bud', '04-opening', '05-bloom', '06-sway'];
  let previous = 0;
  let settledTip;
  for (const [i, time] of times.entries()) {
    await advance(stage, time - previous);
    previous = time;
    const current = (await snapshot(stage)).flowers.at(-1);
    if (i === 0) assert.ok(current.progress.stem > 0 && current.progress.stem < 1 && current.progress.bud === 0);
    if (i === 1) assert.ok(current.progress.bud > 0 && current.progress.center === 0);
    if (i === 2) {
      assert.ok(current.progress.stem === 1 && current.progress.center > 0 && current.progress.center < 1);
      assert.ok(current.opening[0] > current.opening[4] && current.opening[4] > 0);
    }
    if (i === 3) {
      assert.deepEqual(current.progress, { stem: 1, bud: 1, center: 1 });
      settledTip = current.tip.x;
    }
    if (i === 4) assert.notEqual(current.tip.x, settledTip);
    await capture(stage, 'motion-' + names[i]);
  }
  checks.push('Growth, bud, staggered opening, full bloom and wind verified; seven real canvas screenshots');
  await stage.close();

  const dense = await open({ width: 390, height: 844 }, { hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
  await dense.touchscreen.tap(195, 380);
  assert.equal((await snapshot(dense)).active, 5);
  await advance(dense, 2);
  await capture(dense, 'density-05');
  let input = 1;
  for (const count of [10, 20, 40]) {
    for (let i = 0; i < count - input - 4; i++) {
      await dense.touchscreen.tap(42 + ((input + i) * 197) % 306, 75 + ((input + i) * 157) % 643);
    }
    input = count - 4;
    assert.equal((await snapshot(dense)).added, input);
    assert.equal((await snapshot(dense)).active, count);
    await advance(dense, 2);
    await capture(dense, 'density-' + count);
  }
  await dense.touchscreen.tap(320, 810);
  assert.deepEqual([(await snapshot(dense)).active, (await snapshot(dense)).total], [40, 41]);
  await advance(dense, .8);
  assert.equal((await snapshot(dense)).total, 40);
  await dense.setViewportSize({ width: 844, height: 390 });
  await dense.waitForFunction(() => gardenQA.snapshot().width === 844);
  const rotated = await snapshot(dense);
  assert.ok(rotated.flowers.every(flower => flower.x > 0 && flower.x < 844 && flower.y > 0 && flower.y < 390));
  const touch = await dense.context().newCDPSession(dense);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 210, y: 180, id: 1 }, { x: 440, y: 190, id: 2 }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  assert.equal((await snapshot(dense)).added, input + 3);
  await dense.touchscreen.tap(300, 200);
  assert.equal((await snapshot(dense)).added, input + 4);
  checks.push('5/10/20/40 flowers, rapid taps, capped fade, rotation, native simulated multi-touch/cancel');
  await dense.close();

  const reduced = await open({ width: 960, height: 660 }, { reducedMotion: 'reduce' });
  await reduced.locator('#garden').focus();
  await reduced.keyboard.press('Enter');
  assert.equal((await snapshot(reduced)).added, 1);
  const still = (await snapshot(reduced)).flowers.at(-1);
  await advance(reduced, 3);
  assert.deepEqual((await snapshot(reduced)).flowers.at(-1).tip, still.tip);
  assert.equal(still.progress.center, 1);
  await reduced.reload();
  await reduced.waitForFunction(() => gardenQA.snapshot().active === 6);
  checks.push('Keyboard, reduced motion, refresh');
  await reduced.close();
  const live = await browser.newPage({ viewport: { width: 960, height: 660 },
    ...(process.env.GARDEN_VIDEO ? { recordVideo: { dir: out, size: { width: 960, height: 660 } } } : {}) });
  const liveTarget = new URL(url);
  liveTarget.searchParams.set('qa', '1');
  assert.equal((await live.goto(liveTarget.href)).status(), 200);
  await live.waitForFunction(() => gardenQA.snapshot().active === 6);
  await live.waitForTimeout(430);
  await live.mouse.click(512, 315);
  await live.waitForFunction(() => gardenQA.snapshot().flowers.at(-1).progress.center === 1);
  await live.waitForTimeout(600);
  for (let i = 0; i < 4; i++) await live.mouse.click(150 + i * 188, 425 - (i % 2) * 185);
  assert.equal((await snapshot(live)).added, 5);
  await live.waitForTimeout(2100);
  const video = live.video();
  await live.close();
  if (video) {
    const { copyFile, unlink } = await import('node:fs/promises');
    const raw = await video.path();
    await copyFile(raw, out + '/garden-demo.webm');
    await unlink(raw);
  }
  checks.push('Real-time animation completes during regular requestAnimationFrame playback');
  assert.deepEqual(failures, []);
  checks.push('No console errors or failed requests');
  console.log(checks.join('\n'));
} finally {
  await browser.close();
  await writeFile(out + '/browser-report.json', JSON.stringify({ url, checks, failures }, null, 2));
}
