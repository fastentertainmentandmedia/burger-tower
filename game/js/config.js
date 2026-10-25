// ============================================================
// [FILE: game/js/config.js]
// ЕДИНСТВЕННОЕ место специфики клиента.
// Размеры — в долях от VW/VH (ratio). VW/VH = cssW/cssH.
// ============================================================

import { roundRectPath } from '../../core/js/drawers.js';

export const gameConfig = {
  STORAGE_KEY: 'stack_burger',
  PLAY_LIMIT_MINUTES: 2,
  LIMIT_RESET_HOURS: 4,

  ASSETS: {
    logo:        'game/assets/logo.svg',
    favicon16:   'game/assets/favicon/favicon-16x16.png',
    favicon32:   'game/assets/favicon/favicon-32x32.png',
    appleTouch:  'game/assets/favicon/apple-touch-icon.png',
    goatcounter: 'game/assets/goatcounter/count.js',
  },

  // ----------------------------------------------------------
  // Ratio-конфиг (все числа — доли от VW или VH)
  // ----------------------------------------------------------
  BASE_BLOCK_WIDTH_RATIO: 0.55,   // 42% ширины поля
  MIN_BLOCK_WIDTH_RATIO:  0.09,   // 8%

  PLATE_Y_OFFSET_RATIO:   0.03,   // отступ от низа поля до основания (3% VH)
  TOP_MARGIN_RATIO:       0.18,   // верхняя граница камеры (18% VH)

  INITIAL_SPEED_RATIO:    0.006,  // скорость за кадр, доля VW (≈2.3 px на 390)
  SPEED_INCREMENT_RATIO:  0.0002, // прирост за блок
  MAX_SPEED_RATIO:        0.014,  // потолок (≈5.5 px на 390)

  GRAVITY_RATIO:          0.0008, // для кусков, доля VH за кадр²
  CAMERA_LERP:            0.15,

  PERFECT_TOLERANCE_RATIO: 0.007,  // допуск идеального попадания (доля VW)
  PERFECT_BONUS_MAX: 5,
  SCORE_PER_BLOCK:   1,

  // ----------------------------------------------------------
  // Base-типы (основания) + extra-bun
  // ----------------------------------------------------------
  BASE_TYPES: ['bun', 'bunwheat', 'bunblack'],

  BASE_TOP_PAIRS: {
    bun:  'extra-bun',
    bunwheat: 'extra-bun-wheat',
    bunblack: 'extra-bun-black',
  },

  BUN_CHANCE: 0.15,
  SPAWN_ANTI_REPEAT: 1,

  // ----------------------------------------------------------
  // Картинки
  // ----------------------------------------------------------
  INGREDIENT_FIT:         'fill',
  INGREDIENT_FIT_SCALE:   1.0,
  INGREDIENT_FIT_PADDING: 0,
  INGREDIENT_FIT_OVERRIDES: {},

  // ----------------------------------------------------------
  // Разваливание
  // ----------------------------------------------------------
  CRUMBLE: {
    OVERLAY_DELAY_MS: 700,
    OVERLAY_FADE_MS:  300,
    SETTLE_EXTRA_MS:  400,

    VY_MIN: 0.003, VY_MAX: 0.006,
    VX_MIN: 0.001, VX_MAX: 0.004,
    VX_CULPRIT_MIN: 0.003, VX_CULPRIT_MAX: 0.007,
    VR_RANGE:          0.12,
    VR_CULPRIT_RANGE:  0.2,
    FADE_AT:   0.07,
    FADE_SPAN: 0.14,
  },

  // ----------------------------------------------------------
  // Типы блоков.
  //   height: доля VH (если <= 1) либо абсолютные px (если > 1)
  // ----------------------------------------------------------
  BLOCK_TYPES: {
    lettuce: {
      src: 'game/assets/ingredients/lettuce.svg',
      height: 0.045, weight: 2,
      fallback: { color: '#6cb52b', border: '#3a6e12' },
    },
    patty: {
      src: 'game/assets/ingredients/patty.svg',
      height: 0.055, weight: 3,
      fallback: { color: '#6e3b1f', border: '#2e1508' },
    },
    cheese: {
      src: 'game/assets/ingredients/cheese.svg',
      height: 0.040, weight: 2,
      fallback: { color: '#f4b93a', border: '#b87614' },
    },
    tomato: {
      src: 'game/assets/ingredients/tomato.svg',
      height: 0.042, weight: 1,
      fallback: { color: '#e0301e', border: '#7a1206' },
    },
    pickle: {
      src: 'game/assets/ingredients/pickle.svg',
      height: 0.035, weight: 1,
      fallback: { color: '#7cb53c', border: '#355a10' },
    },
    bacon: {
      src: 'game/assets/ingredients/bacon.svg',
      height: 0.035, weight: 2,
      fallback: { color: '#a83222', border: '#5a1208' },
    },
    onion: {
      src: 'game/assets/ingredients/onion.svg',
      height: 0.035, weight: 1,
      fallback: { color: '#e0c6d8', border: '#8a6a7e' },
    },

    bun: {
      src: 'game/assets/ingredients/bun.svg',
      height: 0.060, weight: 0,
      fallback: { color: '#d99e4a', border: '#8b5a2b' },
    },
    bunwheat: {
      src: 'game/assets/ingredients/bun-wheat.svg',
      height: 0.060, weight: 0,
      fallback: { color: '#c98a6a', border: '#7a4a2a' },
    },
    bunblack: {
      src: 'game/assets/ingredients/bun-black.svg',
      height: 0.060, weight: 0,
      fallback: { color: '#b85a3a', border: '#6a2a1a' },
    },

    'extra-bun': {
      src: 'game/assets/ingredients/extra-bun.svg',
      height: 0.030, weight: 0,
      fallback: { color: '#d99e4a', border: '#8b5a2b' },
    },
    'extra-bun-wheat': {
      src: 'game/assets/ingredients/extra-bun-wheat.svg',
      height: 0.030, weight: 0,
      fallback: { color: '#c98a6a', border: '#7a4a2a' },
    },
    'extra-bun-black': {
      src: 'game/assets/ingredients/extra-bun-black.svg',
      height: 0.030, weight: 0,
      fallback: { color: '#b85a3a', border: '#6a2a1a' },
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