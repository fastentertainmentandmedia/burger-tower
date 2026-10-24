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
  TOP_MARGIN:       130,

  INITIAL_SPEED:    3,
  SPEED_INCREMENT:  0.065,
  MAX_SPEED:        8.0,
  GRAVITY:          0.65,
  CAMERA_LERP:      0.15,

  PERFECT_TOLERANCE: 4.0,
  PERFECT_BONUS_MAX: 5,
  SCORE_PER_BLOCK:   1,

  // Массив base-типов. При каждой новой игре случайно выбирается один.
// Если хотите фиксированный — оставьте массив из одного элемента.
  BASE_TYPES: ['bun', 'bunblack', 'bunwheat'],

  // ----------------------------------------------------------
  // Вписывание картинок в блок.
  // Дефолт 'fill' — картинка ровно w × h блока: при обрезке
  // по ширине высота не уменьшается, гэпов нет.
  // Если хочется сохранить пропорции SVG — 'contain' или 'cover'
  // (с clip по блоку — перекрытий не будет).
  // ----------------------------------------------------------
  INGREDIENT_FIT:         'fill',
  INGREDIENT_FIT_SCALE:   1,
  INGREDIENT_FIT_PADDING: 0,

  INGREDIENT_FIT_OVERRIDES: {
    // Пример: картинка крупнее блока, но обрежется клипом:
    // patty: { fit: 'cover', scale: 1.2 },
  },

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
    FADE_AT:   50,
    FADE_SPAN: 100,
  },

  BLOCK_TYPES: {
    lettuce: {
      src: 'game/assets/ingredients/lettuce.svg',
      height: 24, weight: 1,
      fallback: { color: '#6cb52b', border: '#3a6e12' },
    },
    patty: {
      src: 'game/assets/ingredients/patty.svg',
      height: 35, weight: 2,
      fallback: { color: '#6e3b1f', border: '#2e1508' },
    },
    cheese: {
      src: 'game/assets/ingredients/cheese.svg',
      height: 24, weight: 1,
      fallback: { color: '#f4b93a', border: '#b87614' },
    },
    tomato: {
      src: 'game/assets/ingredients/tomato.svg',
      height: 24, weight: 1,
      fallback: { color: '#e0301e', border: '#7a1206' },
    },
    pickle: {
      src: 'game/assets/ingredients/pickle.svg',
      height: 24, weight: 2,
      fallback: { color: '#7cb53c', border: '#355a10' },
    },
    bacon: {
      src: 'game/assets/ingredients/bacon.svg',
      height: 30, weight: 2,
      fallback: { color: '#a83222', border: '#5a1208' },
    },
    onion: {
      src: 'game/assets/ingredients/onion.svg',
      height: 24, weight: 1,
      fallback: { color: '#e0c6d8', border: '#8a6a7e' },
    },
    bun: {
      src: 'game/assets/ingredients/bun.svg',
      height: 55, weight: 0,
      fallback: { color: '#d99e4a', border: '#8b5a2b' },
    },

    bunblack: {
      src: 'game/assets/ingredients/bun-black.svg',
      height: 55, weight: 0,
      fallback: { color: '#d99e4a', border: '#8b5a2b' },
    },

    bunwheat: {
      src: 'game/assets/ingredients/bun-wheat.svg',
      height: 55, weight: 0,
      fallback: { color: '#d99e4a', border: '#8b5a2b' },
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