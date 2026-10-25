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
  limitBestStreak:   'limitBestStreak',
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

// ------------------------------------------------------------
// Аналитика: client из ?ref= / ?client=
// ------------------------------------------------------------
const client = getClient();

(function loadGoatCounter() {
  window.goatcounter = { allow_local: true };
  const script = document.createElement('script');
  script.async = true;
  script.src = gameConfig.ASSETS.goatcounter;
  script.setAttribute('data-goatcounter', 'https://fastentertainmentandmedia.goatcounter.com/count');
  script.setAttribute('data-goatcounter-settings', '{"allow_local": true}');
  document.head.appendChild(script);
})();

(function loadMetrika() {
  let loaded = false;
  function init() {
    if (loaded) return;
    loaded = true;
    (function(m,e,t,r,i,k,a){
      m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
      m[i].l=1*new Date();
      for (var j = 0; j < document.scripts.length; j++) {
        if (document.scripts[j].src === r) { return; }
      }
      k=e.createElement(t), a=e.getElementsByTagName(t)[0];
      k.async = 1; k.src = r;
      a.parentNode.insertBefore(k, a);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');

    window.ym(113332587, 'init', {
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
      webvisor: true,
    });
  }

  const onInteraction = () => {
    document.removeEventListener('pointerdown', onInteraction);
    document.removeEventListener('keydown', onInteraction);
    setTimeout(init, 500);
  };
  document.addEventListener('pointerdown', onInteraction, { once: true });
  document.addEventListener('keydown', onInteraction, { once: true });

  window.addEventListener('load', () => {
    setTimeout(init, 5000);
  }, { once: true });
})();

// ------------------------------------------------------------

const limits = createPlayerLimits(gameConfig, DEBUG_DISABLE_LIMIT);
limits.initPlayer();
state.bestScore = limits.getBestScore();

trackGoal('game_loaded', {
  type: limits.isReturning() ? 'returning' : 'new',
  client,
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
      const streak = snap?.perfectStreak ?? 0;
      trackGoal('perfect_hit', { streak, client });
      limits.updateBestStreak(streak);
      syncState({ perfectStreak: streak });
    },
    onStart: () => {
      gamesThisSession++;
      trackGoal('game_start', { number: gamesThisSession, client });
      syncState({
        gameStarted: true, gameActive: true, gameOver: false, hintVisible: false,
        perfectStreak: 0,
      });
    },
    onGameOver: ({ win, score }) => {
      const isNewRecord = limits.updateBestScore(score);
      trackGoal('game_over', {
        score,
        win: win ? 1 : 0,
        number: gamesThisSession,
        streak: state.perfectStreak ?? 0,
        client,
      });
      syncState({
        gameActive: false, gameStarted: true, gameOver: true, win: !!win,
        perfectStreak: 0,
        ...(isNewRecord ? { bestScore: score } : {}),
      });
    },
    onLimit: ({ score = 0 } = {}) => {
      const isNewRecord = score > 0 && limits.updateBestScore(score);
      trackGoal('daily_limit_reached', { score, number: gamesThisSession, client });
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