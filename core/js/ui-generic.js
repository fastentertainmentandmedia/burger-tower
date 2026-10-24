// ============================================================
// [FILE: core/js/ui-generic.js]
// ============================================================

import { state } from './state.js';
import { engineConfig } from './engine-config.js';

export function createUI({ $, limits, fields = [], timer = null, hints = true }) {

  function formatTimer(ms) {
    const totalSec = Math.ceil(Math.max(0, ms) / 1000);
    const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const ss = String(totalSec % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  function render() {
    if (hints) {
      document.body.dataset.hint = state.hintVisible ? state.hintKind : 'none';
    }

    for (const f of fields) {
      const el = $[f.id];
      if (!el) continue;
      const val = typeof f.get === 'function' ? f.get(state) : state[f.key];
      el.textContent = f.format ? f.format(val) : String(val ?? '');
      if (f.dangerWhen) el.classList.toggle('is-danger', !!f.dangerWhen(state));
    }

    if ($.limitBestScore && limits) {
      $.limitBestScore.textContent = limits.getBestScore();
    }
  }

  function updateTimer() {
    if (!timer || !$.hudTimer || !limits) return;

    const ms = limits.getRemainingMs();
    $.hudTimer.textContent = formatTimer(ms);

    const limitMs = Math.max(1, timer.limitMinutes * 60 * 1000);
    const ratio = ms / limitMs;
    $.hudTimer.classList.remove('is-warning', 'is-danger', 'is-critical');

    if (ratio <= engineConfig.TIMER_CRITICAL_RATIO)      $.hudTimer.classList.add('is-critical');
    else if (ratio <= engineConfig.TIMER_DANGER_RATIO)   $.hudTimer.classList.add('is-danger');
    else if (ratio <= engineConfig.TIMER_WARN_RATIO)     $.hudTimer.classList.add('is-warning');
  }

  function setHudFontSize(w) {
    if (!$.hudLayer) return;
    const raw = w * 0.038;
    const px = Math.round(Math.min(20, Math.max(14, raw)));
    $.hudLayer.style.setProperty('--hud-font-size', px + 'px');
  }

  return { render, updateTimer, setHudFontSize };
}