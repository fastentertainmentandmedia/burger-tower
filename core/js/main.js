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
    onScore: (score) => { syncState({ score }); },
    onPerfect: () => { trackGoal('perfect_hit'); },
    onStart: () => {
      gamesThisSession++;
      trackGoal('game_start', { number: gamesThisSession });
      syncState({
        gameStarted: true, gameActive: true, gameOver: false, hintVisible: false,
      });
    },
    onGameOver: ({ win, score }) => {
      const isNewRecord = limits.updateBestScore(score);
      trackGoal('game_over', { score, win: win ? 1 : 0, number: gamesThisSession });
      syncState({
        gameActive: false, gameStarted: true, gameOver: true, win: !!win,
        ...(isNewRecord ? { bestScore: score } : {}),
      });
    },
    onLimit: ({ score = 0 } = {}) => {
      const isNewRecord = score > 0 && limits.updateBestScore(score);
      trackGoal('daily_limit_reached', { score, number: gamesThisSession });
      syncState({
        limitReached: true, hintVisible: true, hintKind: 'limit',
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

document.documentElement.classList.add('ready');