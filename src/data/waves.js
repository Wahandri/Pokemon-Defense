// ─── Wave Definitions ──────────────────────────────────────────────────────────
// Pokémon-themed waves by tier.
// type: 'red' = T1 common, 'blue' = T2 uncommon, 'green' = T3 rare,
//       't4'  = T4 epic,   'boss' = T5 legendary (single spawns)

import { ENEMY_TYPE } from '../utils/constants.js';

const { RED, BLUE, GREEN, T4, BOSS } = ENEMY_TYPE;

export const WAVES = [
  // ── Magikarp parade y amigos (Tier 1 only) ───────────────────────────────
  /* 01 */[{ type: RED, count: 6, delay: 1000 }],
  /* 02 */[{ type: RED, count: 10, delay: 850 }],
  /* 03 */[{ type: RED, count: 14, delay: 700 }],
  /* 04 */[{ type: RED, count: 18, delay: 620 }],
  /* 05 */[{ type: RED, count: 22, delay: 550 }],

  // ── Tier 2 aparece (Psyduck, Geodude…) ──────────────────────────────────
  /* 06 */[{ type: RED, count: 12, delay: 550 }, { type: BLUE, count: 4, delay: 1200 }],
  /* 07 */[{ type: BLUE, count: 8, delay: 950 }, { type: RED, count: 8, delay: 520 }],
  /* 08 */[{ type: RED, count: 14, delay: 500 }, { type: BLUE, count: 6, delay: 900 }],
  /* 09 */[{ type: BLUE, count: 12, delay: 800 }],
  /* 10 */[{ type: BLUE, count: 8, delay: 750 }, { type: RED, count: 16, delay: 460 }],

  // ── Tier 3 (Gengar, Alakazam…) ─ + primer BOSS ──────────────────────────
  /* 11 */[{ type: RED, count: 14, delay: 480 }, { type: GREEN, count: 3, delay: 1400 }],
  /* 12 */[{ type: BLUE, count: 10, delay: 700 }, { type: GREEN, count: 5, delay: 1200 }],
  /* 13 */[{ type: GREEN, count: 8, delay: 1100 }, { type: RED, count: 16, delay: 420 }],
  /* 14 */[{ type: BLUE, count: 12, delay: 650 }, { type: GREEN, count: 7, delay: 1000 }],
  /* 15 */[{ type: GREEN, count: 12, delay: 900 }, { type: BLUE, count: 8, delay: 600 }, { type: BOSS, count: 1, delay: 3000 }],

  // ── Mezcla creciente (T1+T2+T3) ─────────────────────────────────────────
  /* 16 */[{ type: RED, count: 20, delay: 400 }, { type: GREEN, count: 8, delay: 850 }],
  /* 17 */[{ type: BLUE, count: 14, delay: 620 }, { type: GREEN, count: 10, delay: 820 }],
  /* 18 */[{ type: RED, count: 22, delay: 380 }, { type: BLUE, count: 12, delay: 600 }, { type: GREEN, count: 8, delay: 800 }],
  /* 19 */[{ type: GREEN, count: 14, delay: 780 }, { type: BLUE, count: 14, delay: 580 }],
  /* 20 */[{ type: RED, count: 25, delay: 360 }, { type: BLUE, count: 15, delay: 560 }, { type: GREEN, count: 12, delay: 780 }, { type: BOSS, count: 1, delay: 4000 }],

  // ── Tier 4 aparece (Dragonite, Snorlax…) ────────────────────────────────
  /* 21 */[{ type: GREEN, count: 10, delay: 750 }, { type: T4, count: 3, delay: 2000 }],
  /* 22 */[{ type: RED, count: 28, delay: 340 }, { type: T4, count: 5, delay: 1800 }],
  /* 23 */[{ type: BLUE, count: 16, delay: 560 }, { type: T4, count: 6, delay: 1600 }, { type: GREEN, count: 8, delay: 720 }],
  /* 24 */[{ type: T4, count: 10, delay: 1500 }, { type: GREEN, count: 14, delay: 700 }],
  /* 25 */[{ type: RED, count: 30, delay: 300 }, { type: BLUE, count: 18, delay: 480 }, { type: T4, count: 8, delay: 1400 }, { type: BOSS, count: 1, delay: 5000 }],
  // Waves 26+ generated procedurally by WaveSystem
];
