// ============================================================
// [FILE: core/js/drawers.js]
// Процедурные fallback-рисовалки. Работают по контракту:
//   (ctx, x, y, w, h, ingr) => void
// Если у типа в конфиге есть draw — используется он.
// Если нет — универсальный прямоугольник со скруглением.
// ============================================================

function roundRectPath(ctx, x, y, w, h, r) {
  if (w < r * 2) r = w / 2;
  if (h < r * 2) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function drawGeneric(ctx, x, y, w, h, ingr) {
  const fb = ingr.fallback || { color: '#ccc', border: '#666' };
  const r = Math.min(8, w / 2, h / 2);

  ctx.fillStyle = fb.color;
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fill();

  ctx.strokeStyle = fb.border;
  ctx.lineWidth = 1.6;
  roundRectPath(ctx, x, y, w, h, r);
  ctx.stroke();
}

export function drawProcedural(ctx, x, y, w, h, ingr) {
  if (typeof ingr.draw === 'function') {
    ingr.draw(ctx, x, y, w, h, ingr);
    return;
  }
  drawGeneric(ctx, x, y, w, h, ingr);
}

export { roundRectPath };