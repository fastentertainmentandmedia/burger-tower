// ============================================================
// [FILE: game/js/config.js]
// ЕДИНСТВЕННОЕ место специфики клиента.
// ============================================================

import { roundRectPath } from '../../core/js/drawers.js';

export const gameConfig = {
  STORAGE_KEY: 'stack_burger',
  PLAY_LIMIT_MINUTES: 5,
  LIMIT_RESET_HOURS: 4,

  ASSETS: {
    logo:        'game/assets/logo.svg',
    favicon16:   'game/assets/favicon/favicon-16x16.png',
    favicon32:   'game/assets/favicon/favicon-32x32.png',
    appleTouch:  'game/assets/favicon/apple-touch-icon.png',
    goatcounter: 'game/assets/goatcounter/count.js',
  },

  VIRTUAL_W: 520,
  VIRTUAL_H: 720,

  BASE_BLOCK_WIDTH: 220,
  MIN_BLOCK_WIDTH:  40,
  PLATE_Y_OFFSET:   20,
  TOP_MARGIN:       300, //140

  INITIAL_SPEED:    2.9,
  SPEED_INCREMENT:  0.065,
  MAX_SPEED:        8.0,
  GRAVITY:          0.65,
  CAMERA_LERP:      0.15, //0.15

  PERFECT_TOLERANCE: 4.0,
  PERFECT_BONUS_MAX: 5,
  SCORE_PER_BLOCK:   1,

  // ----------------------------------------------------------
  // Base-типы (основания). Один выбирается случайно на партию.
  // ----------------------------------------------------------
  BASE_TYPES: ['bun', 'bunwheat', 'bunblack'],

  // Пары «base → его extra-bun (прослойка)».
  // Гарантирует, что прослойка всегда того же семейства, что base.
  BASE_TOP_PAIRS: {
    bun:  'extra-bun',
    bunwheat: 'extra-bun-wheat',
    bunblack: 'extra-bun-black',
  },

  // Вероятность, что при спавне выпадет extra-bun (0..1).
  BUN_CHANCE: 0.15,

  // Антиповтор для обычных ингредиентов:
  //   0  — off
  //   1  — не повторять предыдущий
  //   2+ — не повторять N последних
  SPAWN_ANTI_REPEAT: 1,

  // ----------------------------------------------------------
  // Вписывание картинок в блок.
  // ----------------------------------------------------------
  INGREDIENT_FIT:         'fill',
  INGREDIENT_FIT_SCALE:   1.0,
  INGREDIENT_FIT_PADDING: 0,
  INGREDIENT_FIT_OVERRIDES: {},

  // ----------------------------------------------------------
  // Параметры «разваливания» при game over.
  // ----------------------------------------------------------
  CRUMBLE: {
    OVERLAY_DELAY_MS: 700,
    OVERLAY_FADE_MS:  300,
    SETTLE_EXTRA_MS:  400,

    VY_MIN: 2.0,
    VY_MAX: 4.0,
    VX_MIN: 0.8,
    VX_MAX: 2.4,
    VX_CULPRIT_MIN: 2.0,
    VX_CULPRIT_MAX: 4.5,
    VR_RANGE:          0.12,
    VR_CULPRIT_RANGE:  0.2,
    FADE_AT:   150,
    FADE_SPAN: 100,
  },

  // ----------------------------------------------------------
  // Типы блоков.
  //   src     — картинка (svg/png)
  //   height  — толщина слоя в виртуальных px
  //   weight  — вес в обычном пуле спавна (0 = не спавнится сам)
  //   fallback — цвета для процедурного рендера
  //   draw    — опциональная процедурная рисовалка
  // ----------------------------------------------------------
  BLOCK_TYPES: {
    // --- Обычные ингредиенты ---
    lettuce: {
      src: 'game/assets/ingredients/lettuce.svg',
      height: 32, weight: 2,
      fallback: { color: '#6cb52b', border: '#3a6e12' },
    },
    patty: {
      src: 'game/assets/ingredients/patty.svg',
      height: 37, weight: 3,
      fallback: { color: '#6e3b1f', border: '#2e1508' },
    },
    cheese: {
      src: 'game/assets/ingredients/cheese.svg',
      height: 27, weight: 2,
      fallback: { color: '#f4b93a', border: '#b87614' },
    },
    tomato: {
      src: 'game/assets/ingredients/tomato.svg',
      height: 29, weight: 1,
      fallback: { color: '#e0301e', border: '#7a1206' },
    },
    pickle: {
      src: 'game/assets/ingredients/pickle.svg',
      height: 24, weight: 1,
      fallback: { color: '#7cb53c', border: '#355a10' },
    },
    bacon: {
      src: 'game/assets/ingredients/bacon.svg',
      height: 24, weight: 2,
      fallback: { color: '#a83222', border: '#5a1208' },
    },
    onion: {
      src: 'game/assets/ingredients/onion.svg',
      height: 24, weight: 1,
      fallback: { color: '#e0c6d8', border: '#8a6a7e' },
    },

    // --- Base-типы (основания) ---
    bun: {
      src: 'game/assets/ingredients/bun.svg',
      height: 43, weight: 0,
      fallback: { color: '#d99e4a', border: '#8b5a2b' },
    },
    bunwheat: {
      src: 'game/assets/ingredients/bun-wheat.svg',
      height: 43, weight: 0,
      fallback: { color: '#c98a6a', border: '#7a4a2a' },
    },
    bunblack: {
      src: 'game/assets/ingredients/bun-black.svg',
      height: 43, weight: 0,
      fallback: { color: '#b85a3a', border: '#6a2a1a' },
    },

    // --- Extra-bun (прослойки) ---
    'extra-bun': {
      src: 'game/assets/ingredients/extra-bun.svg',
      height: 30, weight: 0,
      fallback: { color: '#d99e4a', border: '#8b5a2b' },
    },
    'extra-bun-wheat': {
      src: 'game/assets/ingredients/extra-bun-wheat.svg',
      height: 30, weight: 0,
      fallback: { color: '#c98a6a', border: '#7a4a2a' },
    },
    'extra-bun-black': {
      src: 'game/assets/ingredients/extra-bun-black.svg',
      height: 30, weight: 0,
      fallback: { color: '#060416', border: '#140e0c' },
    },
  },

  COLORS: {
    blockBorder:   { var: '--color-block-border',   fallback: 'rgba(0,0,0,0.4)' },
    perfectGlow:   { var: '--color-perfect-glow',   fallback: 'rgba(255,255,200,0.75)' },
    perfectRing:   { var: '--color-perfect-ring',   fallback: '#ffd23f' },
    spark:         { var: '--color-spark',          fallback: '#fff8c9' },
    perfectText:   { var: '--color-perfect-text',   fallback: '#ffde59' },
    perfectStroke: { var: '--color-perfect-stroke', fallback: '#5a3a10' },
    bgGradTop:     { var: '--color-field-bg-top',   fallback: '#fef5e3' },
    bgGradBottom:  { var: '--color-field-bg-bot',   fallback: '#f0dcbb' },
  },
};

export const DEBUG_DISABLE_LIMIT = true;