// ============================================================
// [FILE: core/js/color-utils.js]
// ============================================================

export function parseColor(color) {
  if (!color) return null;
  color = color.trim();

  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) hex = hex.split('').map(ch => ch + ch).join('');
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 1,
      };
    }
    if (hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: parseInt(hex.slice(6, 8), 16) / 255,
      };
    }
    return null;
  }

  const m = color.match(/^rgba?\(([^)]+)\)$/);
  if (!m) return null;
  const parts = m[1].split(',').map(s => parseFloat(s.trim()));
  if (parts.length < 3) return null;
  return {
    r: parts[0], g: parts[1], b: parts[2],
    a: parts.length >= 4 ? parts[3] : 1,
  };
}

export function withAlpha(color, a) {
  const c = parseColor(color);
  if (!c) return color;
  return `rgba(${c.r},${c.g},${c.b},${a})`;
}

export function mixColor(c1, c2, t) {
  const a = parseColor(c1);
  const b = parseColor(c2);
  if (!a || !b) return c1;
  t = Math.max(0, Math.min(1, t));
  const r  = Math.round(a.r + (b.r - a.r) * t);
  const g  = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  const al = a.a + (b.a - a.a) * t;
  return `rgba(${r},${g},${bl},${al})`;
}