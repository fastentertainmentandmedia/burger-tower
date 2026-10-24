// ============================================================
// [FILE: core/js/render.js]
// Contain-масштаб сцены. Всё (включая текст) — в виртуальных px.
// Картинки ингредиентов: fit (contain|cover|fill) + clip по блоку.
// ============================================================

import { gameConfig as cfg } from '../../game/js/config.js';
import { engineConfig } from './engine-config.js';
import { readColorTokens, readFontToken } from './color-tokens.js';
import { drawProcedural } from './drawers.js';

export function createRenderer(canvas, callbacks = {}) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const onImageReady = callbacks.onImageReady ?? (() => {});

  const VW = cfg.VIRTUAL_W;
  const VH = cfg.VIRTUAL_H;

  let cssW = VW, cssH = VH, dpr = 1;
  let scale = 1, offX = 0, offY = 0;

  let COLORS = {};
  let FONT = 'font-family: Arial, "Helvetica Neue", Helvetica, sans-serif';

  const IMG = {};
  (function loadImages() {
    for (const [id, ingr] of Object.entries(cfg.BLOCK_TYPES)) {
      const entry = { ingr, img: null, ready: false };
      if (ingr.src) {
        const img = new Image();
        img.onload  = () => { entry.ready = true; onImageReady(); };
        img.onerror = () => {};
        img.src = ingr.src;
        entry.img = img;
      }
      IMG[id] = entry;
    }
  })();

  function refreshColors() {
    COLORS = {
      ...readColorTokens(engineConfig.COLORS),
      ...readColorTokens(cfg.COLORS || {}),
    };
    FONT = readFontToken('--font-mono', 'sans-serif');
  }

  function resize(w, h, dprIn) {
    cssW = w;
    cssH = h;
    dpr = dprIn || 1;

    const rawScale = Math.min(cssW / VW, cssH / VH);
    scale = Math.max(1, Math.round(rawScale * dpr) / dpr);

    offX = (cssW - VW * scale) / 2;
    offY = cssH - VH * scale;
    refreshColors();
    onImageReady();
  }

  function applyTransform() {
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offX, dpr * offY);
  }

  // ----------------------------------------------------------
  // Спецификация вписывания. Дефолт — 'fill' (картинка ровно в блок),
  // чтобы не было гэпов и «сжатия по высоте» при обрезке.
  // Приоритет: per-type > INGREDIENT_FIT_OVERRIDES > глобальные.
  // ----------------------------------------------------------
  function getFitSpec(type) {
    const def = cfg.BLOCK_TYPES[type] || {};
    const ov  = (cfg.INGREDIENT_FIT_OVERRIDES || {})[type] || {};

    return {
      fit:     ov.fit     ?? def.fit     ?? cfg.INGREDIENT_FIT         ?? 'fill',
      scale:   ov.scale   ?? def.scale   ?? cfg.INGREDIENT_FIT_SCALE   ?? 1,
      padding: ov.padding ?? def.padding ?? cfg.INGREDIENT_FIT_PADDING ?? 0,
    };
  }

  function drawIngredientAt(x, y, w, h, type) {
    const entry = IMG[type];

    if (entry && entry.img && entry.ready) {
      const iw = entry.img.naturalWidth  || w;
      const ih = entry.img.naturalHeight || h;

      const spec = getFitSpec(type);
      const innerW = Math.max(1, w * (1 - spec.padding * 2));
      const innerH = Math.max(1, h * (1 - spec.padding * 2));

      let dw, dh;
      if (spec.fit === 'cover') {
        const s = Math.max(innerW / iw, innerH / ih) * spec.scale;
        dw = iw * s; dh = ih * s;
      } else if (spec.fit === 'contain') {
        const s = Math.min(innerW / iw, innerH / ih) * spec.scale;
        dw = iw * s; dh = ih * s;
      } else { // 'fill' (дефолт)
        dw = innerW * spec.scale;
        dh = innerH * spec.scale;
      }

      // Клип по блоку — чтобы картинка не перекрывала соседей
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();

      ctx.drawImage(entry.img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);

      ctx.restore();
      return;
    }

    drawProcedural(ctx, x, y, w, h, { id: type, ...(cfg.BLOCK_TYPES[type] || {}) });
  }

  function drawBackground() {
    // Заливаем весь canvas (экранные координаты) — без чёрных полос
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, cssH * dpr);
    g.addColorStop(0, COLORS.bgGradTop || COLORS.bg);
    g.addColorStop(1, COLORS.bgGradBottom || COLORS.bg);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cssW * dpr, cssH * dpr);

    applyTransform();
  }

  function drawBlocks(state) {
    for (let i = 0; i < state.blocks.length; i++) {
      const b = state.blocks[i];
      let y = VH - cfg.PLATE_Y_OFFSET;
      for (let k = 0; k < i; k++) {
        y -= (cfg.BLOCK_TYPES[state.blocks[k].type]?.height ?? 24);
      }
      const h = cfg.BLOCK_TYPES[b.type]?.height ?? 24;
      drawIngredientAt(b.x, y - h + state.cameraOffset, b.width, h, b.type);
    }

    if (!state.over && state.current) {
      let y = VH - cfg.PLATE_Y_OFFSET;
      for (let k = 0; k < state.blocks.length; k++) {
        y -= (cfg.BLOCK_TYPES[state.blocks[k].type]?.height ?? 24);
      }
      const h = cfg.BLOCK_TYPES[state.current.type]?.height ?? 24;
      drawIngredientAt(state.current.x, y - h + state.cameraOffset, state.current.width, h, state.current.type);
    }
  }

  function drawFallingPieces(state) {
    for (const p of state.fallingPieces) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.rotate(p.rot);
      drawIngredientAt(-p.w / 2, -p.h / 2, p.w, p.h, p.type);
      ctx.restore();
    }
  }

  function drawEffects(state) {
    for (const e of state.effects) {
      const t = Math.min(1, e.life / e.duration);
      const alpha = 1 - t;
      ctx.save();

      if (e.type === 'ring') {
        ctx.globalAlpha = alpha * 0.9;
        ctx.strokeStyle = COLORS[e.color] || COLORS.perfectRing || '#ffd23f';
        ctx.lineWidth = 3 - 2 * t;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (e.type === 'spark') {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = COLORS[e.color] || COLORS.spark || '#fff8c9';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size * (1 - t * 0.4), 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === 'text') {
        const pop = t < 0.2 ? 1.3 - (t / 0.2) * 0.3 : 1;
        ctx.globalAlpha = alpha;
        ctx.translate(e.x, e.y);
        ctx.scale(pop, pop);
        ctx.font = `bold 22px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 4;
        ctx.strokeStyle = COLORS[e.stroke] || COLORS.perfectStroke || '#5a3a10';
        ctx.strokeText(e.text, 0, 0);
        ctx.fillStyle = COLORS[e.color] || COLORS.perfectText || '#ffde59';
        ctx.fillText(e.text, 0, 0);
      } else if (e.type === 'glow') {
        ctx.globalAlpha = alpha * 0.6;
        const grad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.w * 0.9);
        grad.addColorStop(0, COLORS[e.color] || COLORS.perfectGlow || 'rgba(255,255,200,0.75)');
        grad.addColorStop(1, 'rgba(255,255,220,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(e.x, e.y, e.w * 0.9, 26, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawGameOver(state, alpha) {
    if (alpha <= 0) return;

    const bandH = 110;
    const centerY = (cssH / 2 - offY) / scale;   // ← центр canvas в виртуальных px

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.fillStyle = COLORS.gameOverOverlay || 'rgba(243,239,232,0.93)';
    ctx.fillRect(0, centerY - bandH / 2, VW, bandH);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cx = VW / 2;

    ctx.fillStyle = COLORS.gameOverTitle || '#1f1d1a';
    ctx.font = `bold 28px ${FONT}`;
    ctx.fillText('Хорошая попытка', cx, centerY - 14);

    ctx.font = `18px ${FONT}`;
    ctx.fillText('нажмите на экран чтобы продолжить', cx, centerY + 20);

    ctx.restore();
  }

  function render(state) {
    drawBackground();

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, VW, VH);
    ctx.clip();

    drawBlocks(state);
    drawFallingPieces(state);
    drawEffects(state);

    ctx.restore();

    if (state.over) {
      const CR = cfg.CRUMBLE || {};
      const delay   = CR.OVERLAY_DELAY_MS ?? 700;
      const fadeDur = CR.OVERLAY_FADE_MS  ?? 300;
      const elapsed = state.nowMs - state.crumbleStart;
      const a = Math.max(0, Math.min(1, (elapsed - delay) / fadeDur));
      drawGameOver(state, a);
    }
  }

  function getTapZones() {
    return [{ pos: 0, x: VW / 2, y: VH / 2, radius: Math.max(VW, VH) }];
  }

  refreshColors();

  return {
    render, resize, refreshColors,
    getTapZones,
    getTapRadius: () => Math.max(VW, VH),
    getFieldSize: () => ({ w: VW, h: VH }),
  };
}