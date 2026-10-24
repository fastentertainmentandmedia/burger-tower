// ============================================================
// [FILE: core/js/controls/pointer-tap.js]
// ============================================================

export function createPointerTap(canvas, callbacks) {
  const onTap = callbacks.onTap ?? (() => {});
  let enabled = false;

  function toLogical(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function fire(clientX, clientY) {
    if (!enabled) return;
    onTap(toLogical(clientX, clientY));
  }

  function handlePointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    fire(e.clientX, e.clientY);
  }

  function handleTouchStart(e) {
    if (e.touches.length === 0) return;
    e.preventDefault();
    const t = e.touches[0];
    fire(t.clientX, t.clientY);
  }

  const supportsPointer = typeof window !== 'undefined' && 'PointerEvent' in window;

  if (supportsPointer) {
    canvas.addEventListener('pointerdown', handlePointerDown, { passive: false });
  } else {
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  }

  return {
    enable()  { enabled = true; },
    disable() { enabled = false; },
    isEnabled: () => enabled,
    destroy() {
      if (supportsPointer) {
        canvas.removeEventListener('pointerdown', handlePointerDown);
      } else {
        canvas.removeEventListener('touchstart', handleTouchStart);
      }
    },
  };
}