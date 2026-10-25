// ============================================================
// [FILE: core/js/render.js]
// Рендер 1:1 в CSS-пикселях (как в прототипе). Без scale/offX/offY.
// VW/VH = cssW/cssH. SVG/PNG рисуются через drawImage 1:1.
// ============================================================

import { gameConfig as cfg } from '../../game/js/config.js';
import { engineConfig } from './engine-config.js';
import { readColorTokens, readFontToken } from './color-tokens.js';
import { drawProcedural } from './drawers.js';

export function createRenderer(canvas, callbacks = {}) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const onImageReady = callbacks.onImageReady ?? (() => {});

  let VW = canvas.clientWidth  || 360;
  let VH = canvas.clientHeight || 600;

  let cssW = VW, cssH = VH, dpr = 1;

  let COLORS = {};
  let FONT = 'Arial, "Helvetica Neue", Helvetica, sans-serif';

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
    FONT = readFontToken('--font-mono', 'Arial, "Helvetica Neue", Helvetica, sans-serif');
  }

  function resize(w, h, dprIn) {
    cssW = w;
    cssH = h;
    dpr = dprIn || 1;

    VW = cssW;
    VH = cssH;

    refreshColors();
    onImageReady();

    ctx.imageSmoothingEnabled = true;
  }

  function applyTransform() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ----------------------------------------------------------
  // Спецификация вписывания. Дефолт — 'fill' (картинка ровно в блок).
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
      } else { // 'fill'
        dw = innerW * spec.scale;
        dh = innerH * spec.scale;
      }

      // Без округлений: imageSmoothingEnabled=true сглаживает субпиксель
      const dx = x + (w - dw) / 2;
      const dy = y + (h - dh) / 2;

      ctx.drawImage(entry.img, dx, dy, dw, dh);
      return;
    }

    drawProcedural(ctx, x, y, w, h, { id: type, ...(cfg.BLOCK_TYPES[type] || {}) });
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, COLORS.bgGradTop || COLORS.bg);
    g.addColorStop(1, COLORS.bgGradBottom || COLORS.bg);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);
  }

  function heightOf(type) {
    const def = cfg.BLOCK_TYPES[type];
    if (!def) return VH * 0.04;
    return def.height <= 1 ? def.height * VH : def.height;
  }

  function drawBlocks(state) {
    const plateOffset = VH * (cfg.PLATE_Y_OFFSET_RATIO ?? 0.03);

    for (let i = 0; i < state.blocks.length; i++) {
      const b = state.blocks[i];
      let y = VH - plateOffset;
      for (let k = 0; k < i; k++) {
        y -= heightOf(state.blocks[k].type);
      }
      const h = heightOf(b.type);
      drawIngredientAt(Math.round(b.x), Math.round(y - h + state.cameraOffset), Math.round(b.width), Math.round(h), b.type);
    }

    if (!state.over && state.current) {
      let y = VH - plateOffset;
      for (let k = 0; k < state.blocks.length; k++) {
        y -= heightOf(state.blocks[k].type);
      }
      const h = heightOf(state.current.type);
      drawIngredientAt(
        Math.round(state.current.x),
        Math.round(y - h + state.cameraOffset),
        Math.round(state.current.width),
        Math.round(h),
        state.current.type
      );
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

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.fillStyle = COLORS.gameOverOverlay || 'rgba(243,239,232,0.93)';
    ctx.fillRect(0, VH / 2 - bandH / 2, VW, bandH);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = COLORS.gameOverTitle || '#1f1d1a';
    ctx.font = `bold 28px ${FONT}`;
    ctx.fillText('Хорошая попытка', VW / 2, VH / 2 - 14);

    ctx.font = `18px ${FONT}`;
    ctx.fillText('нажмите на экран чтобы продолжить', VW / 2, VH / 2 + 20);

    ctx.restore();
  }

  function render(state) {
    applyTransform();
    drawBackground();
    drawBlocks(state);
    drawFallingPieces(state);
    drawEffects(state);

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