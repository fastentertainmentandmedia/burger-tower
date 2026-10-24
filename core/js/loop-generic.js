// ============================================================
// [FILE: core/js/loop-generic.js]
// Контракт rules:
//   reset/showPreview/tick(dt)/action(payload)/getState/getScore/isOver
//   опционально isSettled() — когда анимация gameover завершена
//   tick/action возвращают { event: 'score'|'perfect'|'gameover'|null }
// ============================================================

export function createLoop({ rules, renderer, limits, callbacks }) {

  let rafId = null;
  let active = false;
  let started = false;
  let over = false;
  let limitHit = false;
  let paused = false;
  let gameOverPending = false;
  let lastTs = 0;

  const MAX_DT = 100;

  function frame(ts) {
    // --- режим «gameover-анимация» ---
    if (gameOverPending && !paused) {
      if (!lastTs) lastTs = ts;
      let dt = ts - lastTs;
      lastTs = ts;
      if (dt < 0) dt = 0;
      if (dt > MAX_DT) dt = MAX_DT;

      rules.tick(dt);
      renderer.render(rules.getState());

      if (rules.isSettled && rules.isSettled()) {
        gameOverPending = false;
        finalizeGameOver();
        return;
      }
      rafId = requestAnimationFrame(frame);
      return;
    }

    if (!active || paused) return;

    if (!lastTs) lastTs = ts;
    let dt = ts - lastTs;
    lastTs = ts;
    if (dt < 0) dt = 0;
    if (dt > MAX_DT) dt = MAX_DT;

    if (!rules.isOver() && limits.isLimitReached()) { end('limit'); return; }

    const result = rules.tick(dt);

    if (result && result.event === 'gameover') {
      renderer.render(rules.getState());
      enterGameOver();
      return;
    }

    if (result && (result.event === 'score' || result.event === 'perfect')) {
      callbacks.onScore?.(rules.getScore(), result.event);
    }

    renderer.render(rules.getState());
    rafId = requestAnimationFrame(frame);
  }

  function enterGameOver() {
    active = false;
    over = true;
    gameOverPending = true;
    paused = false;

    limits.endSession();

    rafId = requestAnimationFrame(frame);
  }

  function finalizeGameOver() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    lastTs = 0;
    renderer.render(rules.getState());
    callbacks.onGameOver?.({ win: false, score: rules.getScore() });
  }

  function init() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }

    if (limits.isLimitReached()) { callbacks.onLimit?.({ score: 0 }); return; }

    rules.reset();
    over = false;
    active = true;
    started = true;
    limitHit = false;
    paused = false;
    gameOverPending = false;
    lastTs = 0;

    callbacks.onScore?.(0, null);
    callbacks.onStart?.();
    renderer.render(rules.getState());

    limits.startSession();
    rafId = requestAnimationFrame(frame);
  }

  function pause() {
    if (!active || paused) return;
    paused = true;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    renderer.render({ ...rules.getState(), paused: true });
  }

  function resume() {
    if (!active || !paused) return;
    paused = false;
    lastTs = 0;
    rafId = requestAnimationFrame(frame);
    renderer.render({ ...rules.getState(), paused: false });
  }

  function end(reason, payload) {
    if (!active && reason !== 'limit') return;
    active = false;
    over = true;
    paused = false;
    gameOverPending = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    lastTs = 0;

    limits.endSession();
    renderer.render(rules.getState());

    if (reason === 'limit') {
      limitHit = true;
      callbacks.onLimit?.({ score: rules.getScore() });
    } else {
      callbacks.onGameOver?.(payload || { win: false, score: rules.getScore() });
    }
  }

  function action(payload) {
    if (!active || over || paused) return null;
    const result = rules.action(payload);

    if (result && result.event === 'gameover') {
      renderer.render(rules.getState());
      enterGameOver();
      return result;
    }
    if (result && (result.event === 'score' || result.event === 'perfect')) {
      callbacks.onScore?.(rules.getScore(), result.event);
      if (result.event === 'perfect') callbacks.onPerfect?.(rules.getState());
    }
    renderer.render(rules.getState());
    return result;
  }

  function render() { renderer.render(rules.getState()); }
  function resize(w, h, dpr) { renderer.resize(w, h, dpr); renderer.render(rules.getState()); }

  function showPreview() {
    rules.showPreview();
    active = false;
    over = false;
    started = false;
    limitHit = false;
    paused = false;
    gameOverPending = false;
    lastTs = 0;
    callbacks.onScore?.(0, null);
    renderer.render(rules.getState());
  }

  return {
    init, render, resize, showPreview, action, pause, resume,
    isActive:    () => active,
    isStarted:   () => started,
    isOver:      () => over,
    isLimitHit:  () => limitHit,
    tickSession: () => { if (active && started && !limitHit && !paused) limits.tickSession(); },
    flushSession: () => { if (active) limits.endSession(); },
  };
}