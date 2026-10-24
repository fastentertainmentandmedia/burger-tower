// ============================================================
// [FILE: core/js/rules.js]
// Механика stacker. Читает типы блоков и параметры из gameConfig.
// Поддержка BASE_TYPES + BASE_TOP_PAIRS (extra-bun) + SPAWN_ANTI_REPEAT.
// ============================================================

import { gameConfig as cfg } from '../../game/js/config.js';

// ----------------------------------------------------------
// Base-типы (основания): случайно выбирается один на партию.
// Extra-bun: привязаны к base через BASE_TOP_PAIRS.
// Обычные ингредиенты: все, кто не base и не extra-bun.
// ----------------------------------------------------------
const BASE_TYPES = Array.isArray(cfg.BASE_TYPES)
  ? cfg.BASE_TYPES
  : (cfg.BASE_TYPE ? [cfg.BASE_TYPE] : ['bun']);

const BASE_TYPE_SET = new Set(BASE_TYPES);

const BASE_TOP_PAIRS = cfg.BASE_TOP_PAIRS || {};
const BASE_TOP_SET   = new Set(Object.values(BASE_TOP_PAIRS));

const TYPE_IDS = Object.keys(cfg.BLOCK_TYPES).filter(
  id => !BASE_TYPE_SET.has(id) && !BASE_TOP_SET.has(id)
);

function pickBaseType() {
  return BASE_TYPES[Math.floor(Math.random() * BASE_TYPES.length)];
}

// ----------------------------------------------------------
// Дефолты для CRUMBLE (если клиент не задал)
// ----------------------------------------------------------
const CRUMBLE_DEFAULTS = {
  OVERLAY_DELAY_MS:  700,
  OVERLAY_FADE_MS:   300,
  SETTLE_EXTRA_MS:   400,
  VY_MIN:            1.5,
  VY_MAX:            3.0,
  VX_MIN:            0.6,
  VX_MAX:            1.8,
  VX_CULPRIT_MIN:    1.5,
  VX_CULPRIT_MAX:    3.5,
  VR_RANGE:          0.12,
  VR_CULPRIT_RANGE:  0.2,
  FADE_AT:           40,
  FADE_SPAN:         80,
  GRAVITY:           null,
};

const CRUMBLE = { ...CRUMBLE_DEFAULTS, ...(cfg.CRUMBLE || {}) };

function rand(min, max) { return min + Math.random() * (max - min); }

function heightOf(type) {
  return cfg.BLOCK_TYPES[type]?.height ?? 24;
}

export function createRules() {

  const VW = cfg.VIRTUAL_W;
  const VH = cfg.VIRTUAL_H;

  const pieceGravity = (CRUMBLE.GRAVITY != null) ? CRUMBLE.GRAVITY : cfg.GRAVITY;

  let blocks = [];
  let current = null;
  let direction = 1;
  let speed = cfg.INITIAL_SPEED;
  let score = 0;
  let over = false;
  let perfectStreak = 0;
  let cameraOffset = 0;
  let fallingPieces = [];
  let effects = [];
  let crumbleStart = 0;
  let nowMs = 0;

  // Base + extra-bun текущей партии
  let chosenBaseType = null;
  let chosenTopType  = null;

  // Антиповтор
  let lastSpawnedType = null;
  let recentSpawns = [];

  function blockTopY(index) {
    let y = VH - cfg.PLATE_Y_OFFSET;
    for (let i = 0; i < index; i++) y -= heightOf(blocks[i].type);
    return y + cameraOffset;
  }

  // ----------------------------------------------------------
  // Выбор типа для обычного спавна (с антиповтором)
  // ----------------------------------------------------------
  function pushRecent(type) {
    const n = cfg.SPAWN_ANTI_REPEAT || 0;
    if (n <= 0) return;
    recentSpawns.push(type);
    while (recentSpawns.length > n) recentSpawns.shift();
  }

  function pickTypeAvoidingRecent() {
    const banned = new Set(recentSpawns);
    const pool = [];
    for (const id of TYPE_IDS) {
      if (banned.has(id)) continue;
      const w = cfg.BLOCK_TYPES[id].weight || 0;
      for (let i = 0; i < w; i++) pool.push(id);
    }
    if (pool.length === 0) {
      // fallback: игнорируем антиповтор
      const all = [];
      for (const id of TYPE_IDS) {
        const w = cfg.BLOCK_TYPES[id].weight || 0;
        for (let i = 0; i < w; i++) all.push(id);
      }
      return all.length ? all[Math.floor(Math.random() * all.length)] : TYPE_IDS[0];
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function spawnNewBlock() {
    const last = blocks[blocks.length - 1];
    let w = last.width;
    if (w < cfg.MIN_BLOCK_WIDTH) w = cfg.MIN_BLOCK_WIDTH;
    const fromLeft = Math.random() < 0.5;
    const x = fromLeft ? -w : VW;
    direction = fromLeft ? 1 : -1;

    let type;
    const canTop = chosenTopType
      && lastSpawnedType !== chosenTopType
      && Math.random() < (cfg.BUN_CHANCE || 0);

    if (canTop) {
      type = chosenTopType;
    } else {
      type = pickTypeAvoidingRecent();
    }

    lastSpawnedType = type;
    if (type !== chosenTopType) {
      pushRecent(type);
    }

    current = { x, width: w, type };
  }

  // ----------------------------------------------------------
  // Куски
  // ----------------------------------------------------------
  function spawnPiece(x, y, w, h, type, side, opts = {}) {
    fallingPieces.push({
      x, y, w, h, type,
      vx: side * rand(CRUMBLE.VX_MIN, CRUMBLE.VX_MAX) + (Math.random() - 0.5) * 1.5,
      vy: -rand(CRUMBLE.VY_MIN, CRUMBLE.VY_MAX),
      rot: 0,
      vr: (Math.random() - 0.5) * CRUMBLE.VR_RANGE,
      alpha: 1,
      fadeAt: opts.fadeAt ?? (VH - 40),
      fadeSpan: opts.fadeSpan ?? 60,
    });
  }

  function createFallingPieces(origX, origW, finalX, finalW, y, h, type) {
    if (finalX > origX + 0.5) {
      const pw = finalX - origX;
      if (pw > 1) spawnPiece(origX, y, pw, h, type, -1);
    }
    const origRight = origX + origW;
    const finalRight = finalX + finalW;
    if (origRight > finalRight + 0.5) {
      const pw = origRight - finalRight;
      if (pw > 1) spawnPiece(finalRight, y, pw, h, type, 1);
    }
  }

  // ----------------------------------------------------------
  // Рассыпание башни при game over.
  // ----------------------------------------------------------
  function crumbleTower(cameraAtCrash) {
    const cam = cameraAtCrash || 0;

    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const h = heightOf(b.type);

      let top = VH - cfg.PLATE_Y_OFFSET;
      for (let k = 0; k < i; k++) top -= heightOf(blocks[k].type);
      const screenY = top - h + cam;

      const centerX = VW / 2;
      const bx = b.x + b.width / 2;
      const rel = (bx - centerX) / (VW / 2 || 1);
      const side = rel === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(rel);

      fallingPieces.push({
        x: b.x,
        y: screenY,
        w: b.width,
        h,
        type: b.type,
        vx: side * rand(CRUMBLE.VX_MIN, CRUMBLE.VX_MAX),
        vy: rand(CRUMBLE.VY_MIN, CRUMBLE.VY_MAX),
        rot: 0,
        vr: (Math.random() - 0.5) * CRUMBLE.VR_RANGE,
        alpha: 1,
        fadeAt: VH + CRUMBLE.FADE_AT,
        fadeSpan: CRUMBLE.FADE_SPAN,
      });
    }

    blocks = [];
    current = null;
  }

  function triggerPerfectEffects(cx, cy, w) {
    effects.push({ type: 'ring', x: cx, y: cy, r: 4, maxR: Math.max(38, w * 0.7), life: 0, duration: 380, color: 'perfectRing' });
    effects.push({ type: 'ring', x: cx, y: cy, r: 2, maxR: Math.max(60, w * 1.0), life: 0, duration: 520, color: 'perfectRing' });
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI * 2 * i) / 10 + Math.random() * 0.4;
      const spd = 1.8 + Math.random() * 2.4;
      effects.push({
        type: 'spark', x: cx, y: cy,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 1,
        size: 2 + Math.random() * 2.5,
        life: 0, duration: 420 + Math.random() * 200, color: 'spark',
      });
    }
    effects.push({
      type: 'text', x: cx, y: cy - 8, life: 0, duration: 900,
      text: perfectStreak + 1 > 1
        ? `+${Math.min(1 + perfectStreak, cfg.PERFECT_BONUS_MAX)} PERFECT!`
        : 'PERFECT!',
      color: 'perfectText', stroke: 'perfectStroke',
    });
    effects.push({ type: 'glow', x: cx, y: cy, w, life: 0, duration: 300, color: 'perfectGlow' });
  }

  function triggerGameOver(currentBlock) {
    over = true;
    crumbleStart = nowMs;

    const cam = cameraOffset;

    if (currentBlock) {
      const h = heightOf(currentBlock.type);
      let top = VH - cfg.PLATE_Y_OFFSET;
      for (let k = 0; k < blocks.length; k++) top -= heightOf(blocks[k].type);
      const screenY = top - h + cam;
      fallingPieces.push({
        x: currentBlock.x,
        y: screenY,
        w: currentBlock.width,
        h,
        type: currentBlock.type,
        vx: direction * rand(CRUMBLE.VX_CULPRIT_MIN, CRUMBLE.VX_CULPRIT_MAX),
        vy: rand(CRUMBLE.VY_MIN, CRUMBLE.VY_MAX),
        rot: 0,
        vr: (Math.random() - 0.5) * CRUMBLE.VR_CULPRIT_RANGE,
        alpha: 1,
        fadeAt: VH + CRUMBLE.FADE_AT,
        fadeSpan: CRUMBLE.FADE_SPAN,
      });
    }

    crumbleTower(cam);
    cameraOffset = 0;
  }

  function placeBlock() {
    if (over || !current) return { event: null };

    const last = blocks[blocks.length - 1];
    const oL = Math.max(current.x, last.x);
    const oR = Math.min(current.x + current.width, last.x + last.width);
    const oW = oR - oL;

    const topY = blockTopY(blocks.length);
    const h = heightOf(current.type);

    if (oW <= 0) {
      triggerGameOver(current);
      return { event: 'gameover' };
    }

    const lastC = last.x + last.width / 2;
    const curC  = current.x + current.width / 2;
    const isPerfect = Math.abs(lastC - curC) <= cfg.PERFECT_TOLERANCE;

    let finalX = isPerfect ? last.x : oL;
    let finalW = isPerfect ? current.width : oW;

    if (finalW < cfg.MIN_BLOCK_WIDTH) {
      triggerGameOver(current);
      return { event: 'gameover' };
    }

    let event = 'score';

    if (isPerfect) {
      triggerPerfectEffects(finalX + finalW / 2, topY - h / 2, finalW);
      perfectStreak++;
      const bonus = Math.min(1 + perfectStreak - 1, cfg.PERFECT_BONUS_MAX);
      score += bonus;
      event = 'perfect';
    } else {
      perfectStreak = 0;
      createFallingPieces(current.x, current.width, finalX, finalW, topY - h, h, current.type);
      score += cfg.SCORE_PER_BLOCK;
    }

    blocks.push({ x: finalX, width: finalW, type: current.type });
    speed = Math.min(speed + cfg.SPEED_INCREMENT, cfg.MAX_SPEED);
    spawnNewBlock();
    return { event };
  }

  function updateFallingPieces() {
    for (let i = fallingPieces.length - 1; i >= 0; i--) {
      const p = fallingPieces[i];
      p.vy += pieceGravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;

      if (p.y > VH + 200) { fallingPieces.splice(i, 1); continue; }
      if (p.y > p.fadeAt) {
        p.alpha = Math.max(0, (p.fadeAt + p.fadeSpan - p.y) / p.fadeSpan);
        if (p.alpha <= 0) fallingPieces.splice(i, 1);
      }
    }
  }

  function updateEffects(dt) {
    for (let i = effects.length - 1; i >= 0; i--) {
      const e = effects[i];
      e.life += dt;
      if (e.life >= e.duration) { effects.splice(i, 1); continue; }
      if (e.type === 'ring') {
        const t = e.life / e.duration;
        e.r = 4 + (e.maxR - 4) * (1 - Math.pow(1 - t, 3));
      } else if (e.type === 'spark') {
        e.vy += 0.12;
        e.x += e.vx;
        e.y += e.vy;
        e.vx *= 0.98;
      } else if (e.type === 'text') {
        e.y -= dt * 0.04;
      }
    }
  }

  function updateCamera() {
    if (blocks.length === 0) return;
    let baseTop = VH - cfg.PLATE_Y_OFFSET;
    for (let i = 0; i < blocks.length; i++) baseTop -= heightOf(blocks[i].type);
    const screenTop = baseTop + cameraOffset;
    if (screenTop < cfg.TOP_MARGIN) {
      cameraOffset += (cfg.TOP_MARGIN - screenTop) * cfg.CAMERA_LERP + 0.5;
    }
  }

  function tick(dt) {
    nowMs += dt;

    if (current && !over) {
      current.x += direction * speed * (dt / 16.6667);
      if (direction === 1 && current.x > VW) {
        current.x = VW;
        direction = -1;
      } else if (direction === -1 && current.x + current.width < 0) {
        current.x = -current.width;
        direction = 1;
      }
    }

    updateFallingPieces();
    updateEffects(dt);
    if (!over) updateCamera();

    return { event: null };
  }

  function reset() {
    chosenBaseType = pickBaseType();
    chosenTopType  = BASE_TOP_PAIRS[chosenBaseType] || null;
    lastSpawnedType = null;
    recentSpawns = [];

    blocks = [{
      x: (VW - cfg.BASE_BLOCK_WIDTH) / 2,
      width: cfg.BASE_BLOCK_WIDTH,
      type: chosenBaseType,
    }];
    fallingPieces = [];
    effects = [];
    cameraOffset = 0;
    perfectStreak = 0;
    score = 0;
    speed = cfg.INITIAL_SPEED;
    direction = 1;
    over = false;
    crumbleStart = 0;
    nowMs = 0;
    spawnNewBlock();
    return getState();
  }

  function showPreview() { return reset(); }

  function action() {
    if (over) return { event: null };
    return placeBlock();
  }

  function getScore() { return score; }
  function isOver()   { return over; }

  function getState() {
    return {
      blocks, current, direction, speed, score, over,
      perfectStreak, cameraOffset, fallingPieces, effects,
      crumbleStart,
      crumbleDelayMs: CRUMBLE.OVERLAY_DELAY_MS,
      nowMs,
      chosenBaseType,
      chosenTopType,
    };
  }

  // Инициализация модуля
  chosenBaseType = pickBaseType();
  chosenTopType  = BASE_TOP_PAIRS[chosenBaseType] || null;
  blocks = [{
    x: (VW - cfg.BASE_BLOCK_WIDTH) / 2,
    width: cfg.BASE_BLOCK_WIDTH,
    type: chosenBaseType,
  }];
  spawnNewBlock();

  return {
    reset, showPreview, tick, action,
    setFieldSize: () => {},
    getScore, isOver, getState,

    isSettled: () => {
      if (!over) return false;
      const elapsed = nowMs - crumbleStart;
      if (elapsed < CRUMBLE.OVERLAY_DELAY_MS + CRUMBLE.SETTLE_EXTRA_MS) return false;
      if (fallingPieces.length > 0) return false;
      return true;
    },
  };
}