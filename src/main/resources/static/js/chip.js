// Desktop-only hero illustration. main.js imports this module dynamically and only when
// the device has a large screen and a fine pointer, so phones never download or run it.
//
// The die shows one lit cell per core of the last processor picked, and the moving
// packets speed up with its turbo clock and grow in number with its threads.

import { h, svg } from './dom.js';
import * as fmt from './format.js';
import * as m from './metrics.js';

const SIZE = 520;
const CENTER = SIZE / 2;
const PACKAGE = { x: 160, size: 200 };
const DIE = { x: 196, size: 128, pad: 10, gap: 4 };
const PINS_PER_SIDE = 10;
const PIN_PITCH = 17;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function gridSizeFor(cores) {
  if (!cores || cores <= 4) return 2;
  if (cores <= 9) return 3;
  if (cores <= 16) return 4;
  if (cores <= 36) return 6;
  return 8;
}

// Traces for the top side in local coordinates; the other sides are the same group rotated.
// Bend height grows towards the centre and end points fan out, so traces never cross.
function tracePaths(side) {
  const paths = [];
  const first = CENTER - ((PINS_PER_SIDE - 1) * PIN_PITCH) / 2;
  const pinTip = PACKAGE.x - 14;

  for (let i = 0; i < PINS_PER_SIDE; i++) {
    if ((side + i) % 5 === 0) continue;

    const x = first + i * PIN_PITCH;
    const fromCentre = i - (PINS_PER_SIDE - 1) / 2;
    const bendY = pinTip - (14 + (4.5 - Math.abs(fromCentre)) * 12);
    const endX = CENTER + fromCentre * PIN_PITCH * 1.9;
    const endY = 34 + ((i + side) % 3) * 18;

    paths.push({ d: `M ${x} ${pinTip} V ${bendY} H ${endX} V ${endY}`, endX, endY });
  }
  return paths;
}

function buildSvg() {
  const root = svg('svg', { viewBox: `0 0 ${SIZE} ${SIZE}`, class: 'chip-svg', focusable: 'false' });
  const sides = [];

  for (let side = 0; side < 4; side++) {
    const group = svg('g', { transform: `rotate(${side * 90} ${CENTER} ${CENTER})` });
    const paths = [];

    for (const trace of tracePaths(side)) {
      const path = svg('path', { d: trace.d, class: 'chip-trace' });
      group.append(path, svg('circle', { cx: trace.endX, cy: trace.endY, r: 4, class: 'chip-via' }));
      paths.push(path);
    }

    const first = CENTER - ((PINS_PER_SIDE - 1) * PIN_PITCH) / 2;
    for (let i = 0; i < PINS_PER_SIDE; i++) {
      group.append(svg('rect', { x: first + i * PIN_PITCH - 3.5, y: PACKAGE.x - 14, width: 7, height: 14, rx: 1.5, class: 'chip-pin' }));
    }

    root.append(group);
    sides.push({ group, paths });
  }

  root.append(
    svg('rect', { x: PACKAGE.x, y: PACKAGE.x, width: PACKAGE.size, height: PACKAGE.size, rx: 14, class: 'chip-package' }),
    svg('circle', { cx: PACKAGE.x + 18, cy: PACKAGE.x + 18, r: 4, class: 'chip-notch' }),
    svg('rect', { x: DIE.x, y: DIE.x, width: DIE.size, height: DIE.size, rx: 6, class: 'chip-die' }),
  );

  const cellLayer = svg('g');
  root.append(cellLayer);

  return { root, sides, cellLayer };
}

export function mountChip(container, { reducedMotion }) {
  const { root, sides, cellLayer } = buildSvg();
  const caption = h('p', { class: 'chip-caption' });
  const stage = h('div', { class: 'chip-stage' }, root, caption);
  container.replaceChildren(stage);

  const allPaths = sides.flatMap(({ group, paths }) => paths.map((path) => ({ group, path, length: path.getTotalLength() })));

  let cells = [];
  let product = null;
  let packets = [];
  let speed = 55;
  let frame = 0;
  let visible = true;
  let lastTime = 0;

  function layoutCells(cores) {
    const n = gridSizeFor(cores);
    const size = (DIE.size - DIE.pad * 2 - DIE.gap * (n - 1)) / n;
    cellLayer.replaceChildren();
    cells = [];

    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        const cell = svg('rect', {
          x: DIE.x + DIE.pad + col * (size + DIE.gap),
          y: DIE.x + DIE.pad + row * (size + DIE.gap),
          width: size,
          height: size,
          rx: Math.min(3, size / 6),
          class: 'chip-cell',
        });
        cellLayer.append(cell);
        cells.push(cell);
      }
    }
  }

  function lightCores(cores) {
    cells.forEach((cell, i) => {
      if (!reducedMotion) cell.style.transitionDelay = `${i * 25}ms`;
      // Defer one frame so the transition runs from the unlit state.
      requestAnimationFrame(() => cell.classList.toggle('is-on', i < cores));
    });
  }

  function spawn(packet, anywhere) {
    const target = allPaths[Math.floor(Math.random() * allPaths.length)];
    if (packet.group !== target.group) target.group.append(packet.el);
    packet.group = target.group;
    packet.path = target.path;
    packet.length = target.length;
    packet.inward = Math.random() < 0.5;
    packet.travelled = anywhere ? Math.random() * target.length : 0;
    packet.speedFactor = 0.75 + Math.random() * 0.5;
  }

  function setPacketCount(count) {
    while (packets.length > count) packets.pop().el.remove();
    while (packets.length < count) {
      const packet = { el: svg('rect', { width: 7, height: 7, rx: 1.5, class: 'chip-packet' }) };
      spawn(packet, true);
      packets.push(packet);
    }
  }

  function step(time) {
    frame = 0;
    const dt = Math.min((time - (lastTime || time)) / 1000, 0.05);
    lastTime = time;

    for (const packet of packets) {
      packet.travelled += speed * packet.speedFactor * dt;
      if (packet.travelled >= packet.length) spawn(packet, false);

      const along = packet.inward ? packet.length - packet.travelled : packet.travelled;
      const point = packet.path.getPointAtLength(along);
      packet.el.setAttribute('x', point.x - 3.5);
      packet.el.setAttribute('y', point.y - 3.5);
    }

    // Idle state: a single cell walks across the die until a processor is picked.
    if (!product && cells.length) {
      const active = Math.floor(time / 320) % cells.length;
      cells.forEach((cell, i) => cell.classList.toggle('is-scan', i === active));
    }

    schedule();
  }

  function schedule() {
    if (!frame && visible && !reducedMotion) frame = requestAnimationFrame(step);
  }

  // Pause entirely while the hero is scrolled out of view.
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    lastTime = 0;
    if (visible) schedule();
    else if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  });
  observer.observe(stage);

  // Small tilt towards the pointer while it moves over the hero.
  const hero = container.closest('.hero') ?? container;
  function onPointerMove(event) {
    const rect = hero.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    root.style.transform = `rotateX(${clamp(-y * 10, -6, 6)}deg) rotateY(${clamp(x * 12, -7, 7)}deg)`;
  }
  function onPointerLeave() {
    root.style.transform = '';
  }
  if (!reducedMotion) {
    hero.addEventListener('pointermove', onPointerMove);
    hero.addEventListener('pointerleave', onPointerLeave);
  }

  function show(next) {
    product = next;
    const cores = next ? m.cores(next) ?? 0 : 0;
    layoutCells(next ? cores : 16);

    if (next) {
      lightCores(Math.min(cores, cells.length));
      const boost = m.boostClock(next) ?? m.baseClock(next) ?? 3;
      speed = 55 * clamp(boost / 4, 0.6, 1.6);
      setPacketCount(reducedMotion ? 0 : clamp(Math.round((m.threads(next) ?? 4) * 0.6), 6, 28));

      const specs = [fmt.plural(cores, 'núcleo', 'núcleos')];
      if (m.threads(next)) specs.push(fmt.plural(m.threads(next), 'thread', 'threads'));
      if (m.boostClock(next)) specs.push(`até ${fmt.ghz(m.boostClock(next))}`);
      caption.replaceChildren(h('strong', { text: next.productName }), specs.join(', '));
    } else {
      speed = 55;
      setPacketCount(reducedMotion ? 0 : 12);
      caption.replaceChildren();
    }

    schedule();
  }

  function destroy() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    observer.disconnect();
    hero.removeEventListener('pointermove', onPointerMove);
    hero.removeEventListener('pointerleave', onPointerLeave);
    container.replaceChildren();
  }

  show(null);
  return { show, destroy };
}
