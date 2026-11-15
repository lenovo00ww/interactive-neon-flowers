import { mix } from './motion.js';

export const pinkTones = [
  '#ffe0ef', '#ffd1e6', '#ffc0df', '#ffabd3',
  '#ff94c9', '#ff7ebc', '#ff64ac', '#ff4f9f',
  '#f83c92', '#ea2587', '#d9177a', '#be176b',
];

function blend(a, b, weight) {
  const channels = [1, 3, 5].map(i => Math.round(mix(
    parseInt(a.slice(i, i + 2), 16), parseInt(b.slice(i, i + 2), 16), weight,
  )).toString(16).padStart(2, '0'));
  return '#' + channels.join('');
}

export const palettes = pinkTones.map((tone, i) => {
  const body = blend(tone, '#ff529f', .12);
  const base = blend(tone, '#ffceea', .45);
  const tip = blend(tone, '#a61057', .27);
  const crease = blend(tone, '#500622', .70);
  const rim = blend(tone, '#ffe0ef', .52);
  const halo = [1, 3, 5].map(channel => parseInt(tone.slice(channel, channel + 2), 16)).join(',');
  return { body, base, tip, crease, rim, halo, inner: i < 4 ? '#ffb5d8' : '#ffc3e2' };
});

export function pinkSequence(random) {
  // Interleave shuffled light, medium and deep groups. Each cycle uses all
  // twelve tones, and neighboring blooms belong to different groups.
  let deck = [];
  return () => {
    if (!deck.length) {
      const groups = [0, 4, 8].map(first => {
        const group = [first, first + 1, first + 2, first + 3];
        for (let i = group.length - 1; i > 0; i--) {
          const j = Math.floor(random() * (i + 1));
          [group[i], group[j]] = [group[j], group[i]];
        }
        return group;
      });
      deck = groups[0].flatMap((_, i) => groups.map(group => group[i])).reverse();
    }
    return deck.pop();
  };
}
