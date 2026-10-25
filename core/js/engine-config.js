// ============================================================
// [FILE: core/js/engine-config.js]
// Константы движка. Игровые — в game/js/config.js.
// ============================================================

export const engineConfig = {
  MAX_DPR: 1.5, //2
  FIELD_ASPECT: 0.6,

  HUD_TOP_H_RATIO:   0.09,
  HUD_PADDING_RATIO: 0.03,

  TEXTURE_ENABLED: false,

  TIMER_WARN_RATIO:     0.50,
  TIMER_DANGER_RATIO:   0.20,
  TIMER_CRITICAL_RATIO: 0.10,

  COLORS: {
    bg:              { var: '--color-field-bg',     fallback: '#fdf8ed' },
    hudLabel:        { var: '--color-text-dim',     fallback: '#6b6459' },
    hudValue:        { var: '--color-text-accent',  fallback: '#1f1d1a' },
    timerNormal:     { var: '--color-timer-normal', fallback: '#3f9142' },
    timerWarning:    { var: '--color-timer-warning',fallback: '#d89a1a' },
    timerDanger:     { var: '--color-timer-danger', fallback: '#c93a2e' },
    gameOverOverlay: { var: '--color-gameover-bg',    fallback: 'rgba(243,239,232,0.93)' },
    gameOverTitle:   { var: '--color-gameover-title', fallback: '#1f1d1a' },
    gameOverText:    { var: '--color-gameover-text',  fallback: '#1f1d1a' },
  },
};