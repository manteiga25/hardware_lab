// Helpers shared by the desktop-only illustrations (chip.js and gpu-card.js).

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// requestAnimationFrame loop that only runs while `element` is on screen.
// step(dtSeconds, timeMs) is called on every frame.
export function createLoop(element, step, { enabled }) {
  let frame = 0;
  let visible = true;
  let lastTime = 0;

  function tick(time) {
    frame = 0;
    const dt = Math.min((time - (lastTime || time)) / 1000, 0.05);
    lastTime = time;
    step(dt, time);
    start();
  }

  function start() {
    if (!frame && visible && enabled) frame = requestAnimationFrame(tick);
  }

  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    lastTime = 0;
    if (visible) start();
    else stop();
  });
  observer.observe(element);

  return {
    start,
    destroy() {
      stop();
      observer.disconnect();
    },
  };
}

// Small tilt of `target` towards the pointer while it moves over the surrounding header.
export function attachTilt(target, { enabled }) {
  const area = target.closest('[data-tilt-area]');
  if (!area || !enabled) return () => {};

  function onMove(event) {
    const rect = area.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    target.style.transform = `rotateX(${clamp(-y * 10, -6, 6)}deg) rotateY(${clamp(x * 12, -7, 7)}deg)`;
  }
  function onLeave() {
    target.style.transform = '';
  }

  area.addEventListener('pointermove', onMove);
  area.addEventListener('pointerleave', onLeave);
  return () => {
    area.removeEventListener('pointermove', onMove);
    area.removeEventListener('pointerleave', onLeave);
  };
}
