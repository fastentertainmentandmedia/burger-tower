// ============================================================
// [FILE: core/js/main.js]
// ============================================================

import { gameConfig, DEBUG_DISABLE_LIMIT } from '../../game/js/config.js';
import { createRules } from './rules.js';
import { createRenderer } from './render.js';

import { createDOM } from './dom-factory.js';
import { createUI } from './ui-generic.js';
import { createLoop } from './loop-generic.js';
import { createResize } from './resize.js';
import { createLifecycle } from './lifecycle.js';
import { createIntro } from './intro-factory.js';
import { createPointerTap } from './controls/pointer-tap.js';
import { createPlayerLimits } from './player-limits-factory.js';
import { trackGoal, getClient } from './analytics.js';
import { state, updateState, resetGameState } from './state.js';

const $ = createDOM({
  canvas:            'gameCanvas',
  container:         'canvasContainer',
  startHint:         'startHint',
  introModal:        'introModal',
  introAccept:       'introAccept',
  limitBestScore:    'limitBestScore',
  introLimitMinutes: 'introLimitMinutes',
  hudLayer:          'hudLayer',
  hudTimer:          'hudTimer',
  hudBestLabel:      'hudBestLabel',
  hudBestValue:      'hudBestValue',
  hudScoreLabel:     'hudScoreLabel',
  hudScoreValue:     'hudScoreValue',
  hudStreakValue:    'hudStreakValue',
  hudStreakLabel:    'hudStreakLabel',
}, { required: ['canvas', 'container', 'startHint', 'introModal', 'introAccept'] });

const limits = createPlayerLimits(gameConfig, DEBUG_DISABLE_LIMIT);
limits.initPlayer();
state.bestScore = limits.getBestScore();

trackGoal('game_loaded', {
  type: limits.isReturning() ? 'returning' : 'new',
  client: getClient(),
});

const ui = createUI({
  $,
  limits,
  fields: [
    { id: 'hudBestValue',  key: 'bestScore' },
    { id: 'hudScoreValue', key: 'score' },
  ],
  timer: { limitMinutes: gameConfig.PLAY_LIMIT_MINUTES },
  hints: true,
});

const rules = createRules();
const renderer = createRenderer($.canvas, { onImageReady: () => game && game.render() });

rules.setFieldSize($.canvas.clientWidth || 360, $.canvas.clientHeight || 600);

function syncState(extraPatch) {
  const snap = rules.getState();
  updateState({ score: snap.score, ...(extraPatch || {}) }, ui);
}

let gamesThisSession = 0;

const game = createLoop({
  rules,
  renderer,
  limits,
  callbacks: {
    onScore: (score, event) => {
      if (event === 'score') {
        syncState({ score, perfectStreak: 0 });
      } else {
        syncState({ score });
      }
    },
    onPerfect: (snap) => {
      console.log('onPerfect', snap?.perfectStreak);
      trackGoal('perfect_hit', { streak: snap?.perfectStreak ?? 0 });
      syncState({ perfectStreak: snap?.perfectStreak ?? 0 });
    },
    onStart: () => {
      gamesThisSession++;
      trackGoal('game_start', { number: gamesThisSession });
      syncState({
        gameStarted: true, gameActive: true, gameOver: false, hintVisible: false,
        perfectStreak: 0,
      });
    },
    onGameOver: ({ win, score }) => {
      const isNewRecord = limits.updateBestScore(score);
      trackGoal('game_over', { score, win: win ? 1 : 0, number: gamesThisSession });
      syncState({
        gameActive: false, gameStarted: true, gameOver: true, win: !!win,
        perfectStreak: 0,
        ...(isNewRecord ? { bestScore: score } : {}),
      });
    },
    onLimit: ({ score = 0 } = {}) => {
      const isNewRecord = score > 0 && limits.updateBestScore(score);
      trackGoal('daily_limit_reached', { score, number: gamesThisSession });
      syncState({
        limitReached: true, hintVisible: true, hintKind: 'limit',
        perfectStreak: 0,
        ...(isNewRecord ? { bestScore: score } : {}),
      });
    },
  },
});

const tap = createPointerTap($.canvas, {
  onTap: () => {
    if (!state.gameUnlocked) return;
    if (state.limitReached) return;
    if (state.gameOver) { startNewGame(); return; }
    if (!state.gameStarted) { startNewGame(); return; }
    game.action();
    if (state.gameActive) syncState();
  },
});

function startNewGame() {
  if (state.gameActive) limits.flushSession();
  resetGameState();
  ui.render();
  game.init();
  syncState();
}

createResize({
  canvas: $.canvas,
  onResize: (w, h, dpr) => {
    renderer.resize(w, h, dpr);
    rules.setFieldSize(w, h);
    ui.setHudFontSize(w);
    game.render();
  },
});

function unlockGame() {
  if (state.gameUnlocked) return;
  updateState({ gameUnlocked: true, cookiesAccepted: true }, ui);
  tap.enable();

  if (limits.isLimitReached()) {
    updateState({ limitReached: true, hintVisible: true, hintKind: 'limit' }, ui);
  } else {
    game.showPreview();
    updateState({
      hintVisible: true, hintKind: 'start',
      gameStarted: false, gameActive: false, gameOver: false,
    }, ui);
    syncState();
  }

  ui.render();
  ui.updateTimer();
}

const intro = createIntro({ $, gameConfig, onAccept: unlockGame });
intro.init();

setInterval(() => {
  if (!state.gameUnlocked) return;
  if (!state.gameActive && !state.gameStarted && limits.isLimitReached()) {
    updateState({ limitReached: true, hintVisible: true, hintKind: 'limit' }, ui);
  }
  game.tickSession();
  ui.updateTimer();
}, 1000);

createLifecycle({
  isActive: () => state.gameActive,
  onFlush: limits.flushSession,
  onHide: () => { game.flushSession(); game.render(); },
});

$.canvas.addEventListener('contextmenu', e => e.preventDefault());

function hidePreloader() {
  document.documentElement.classList.add('ready');
}

if (document.readyState === 'complete') {
  hidePreloader();
} else {
  window.addEventListener('load', hidePreloader, { once: true });
  setTimeout(hidePreloader, 10000);
}