import assert from 'node:assert/strict';
import test from 'node:test';
import { growthAt, petalOpening, seededRandom, stemPoint } from '../src/motion.js';
import { constrain, place } from '../src/placement.js';

const flower = { stemTime: .83, petalTime: .53 };
test('growth has separate stem, bud, and center phases', () => {
  assert.deepEqual(growthAt(flower, 0), { stem: 0, bud: 0, center: 0 });
  assert.ok(growthAt(flower, .4).stem > 0 && growthAt(flower, .4).bud === 0);
  assert.ok(growthAt(flower, .77).bud > 0 && growthAt(flower, .77).stem < 1);
  assert.deepEqual(growthAt(flower, 2), { stem: 1, bud: 1, center: 1 });
});
test('petals stagger and settle after a small overshoot', () => {
  assert.ok(petalOpening(flower, 1.1, 0) > petalOpening(flower, 1.1, 4));
  assert.ok(petalOpening(flower, 1.24, 0) > 1);
  assert.equal(petalOpening(flower, 2, 0), 1);
});
test('curve keeps the root still and connects its endpoint to the moving head', () => {
  assert.deepEqual(stemPoint({}, 0, 50, 100, 20, 300, 20, 8), { x: 50, y: 300 });
  assert.deepEqual(stemPoint({}, 1, 50, 100, 20, 300, 20, 8), { x: 108, y: 20 });
});
test('safe area and minimum stem length are enforced', () => {
  const safe = { left: 30, right: 0, top: 30, bottom: 20 };
  const a = constrain(0, 500, 390, 390, 22, safe);
  assert.ok(a.x >= 30 && a.y <= 322);
});
test('crowding adjustment stays near the tap', () => {
  const scene = { width: 390, height: 844, safe: { left: 0, right: 0, top: 0, bottom: 0 },
    flowers: [{ radius: 40, retired: null, position: { x: 200, y: 200 } }] };
  const p = place(200, 200, scene, 40);
  assert.ok(Math.hypot(p.x - 200, p.y - 200) > 10);
  assert.ok(Math.hypot(p.x - 200, p.y - 200) < 36);
});
test('seeded scenes reproduce exactly', () => {
  const first = seededRandom(3);
  const second = seededRandom(3);
  for (let i = 0; i < 100; i++) assert.equal(first(), second());
});
