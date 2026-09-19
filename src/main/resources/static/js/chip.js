// Desktop-only illustration of a processor chip. illustration-host.js imports this module
// dynamically and only on large screens with a fine pointer, so phones never download or run it.
//
// It draws whatever `visual` categories.js describes: for a CPU, one lit die cell per core;
// for a laptop or integrated GPU, lit cells that follow the performance index. The moving
// packets speed up with the clock and grow in number with `lanes`.

import { h, svg } from './dom.js';
import { attachTilt, createLoop } from './motion.js';

const SIZE = 520;
const CENTER = SIZE / 2;
const PACKAGE = { x: 160, size: 200 };
const DIE = { x: 196, size: 128, pad: 10, gap: 4 };
const PINS_PER_SIDE = 10;
const PIN_PITCH = 17;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function gridSizeFor(count) {
  if (!count || count <= 4) return 2;
  if (count <= 9) return 3;
  if (count <= 16) return 4;
  if (count <= 36) return 6;
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

export function mount(container, { reducedMotion }) {
  const { root, sides, cellLayer } = buildSvg();
  const caption = h('p', { class: 'illustration-caption' });
  const stage = h('div', { class: 'illustration-stage' }, root, caption);
  container.replaceChildren(stage);

  const allPaths = sides.flatMap(({ group, paths }) => paths.map((path) => ({ group, path, length: path.getTotalLength() })));

  let cells = [];
  let idle = true;
  let packets = [];
  let speed = 55;

  function layoutCells(n) {
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

  function lightCells(count) {
    cells.forEach((cell, i) => {
      if (!reducedMotion) cell.style.transitionDelay = `${i * 25}ms`;
      // Defer one frame so the transition runs from the unlit state.
      requestAnimationFrame(() => cell.classList.toggle('is-on', i < count));
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

  const loop = createLoop(stage, (dt, time) => {
    for (const packet of packets) {
      packet.travelled += speed * packet.speedFactor * dt;
      if (packet.travelled >= packet.length) spawn(packet, false);

      const along = packet.inward ? packet.length - packet.travelled : packet.travelled;
      const point = packet.path.getPointAtLength(along);
      packet.el.setAttribute('x', point.x - 3.5);
      packet.el.setAttribute('y', point.y - 3.5);
    }

    // Idle state: a single cell walks across the die until a product is shown.
    if (idle && cells.length) {
      const active = Math.floor(time / 320) % cells.length;
      cells.forEach((cell, i) => cell.classList.toggle('is-scan', i === active));
    }
  }, { enabled: !reducedMotion });

  const detachTilt = attachTilt(root, { enabled: !reducedMotion });

  function show(visual) {
    idle = !visual || visual.idle;

    if (idle) {
      layoutCells(4);
      speed = 55;
      setPacketCount(reducedMotion ? 0 : 12);
      caption.replaceChildren();
    } else {
      const n = visual.grid ?? gridSizeFor(visual.lit);
      layoutCells(n);
      lightCells(Math.min(visual.lit, n * n));
      speed = 55 * clamp(visual.clockGHz / 4, 0.6, 1.6);
      setPacketCount(reducedMotion ? 0 : clamp(visual.lanes, 6, 28));
      caption.replaceChildren(h('strong', { text: visual.title }), visual.detail);
    }

    loop.start();
  }

  function destroy() {
    loop.destroy();
    detachTilt();
    container.replaceChildren();
  }

  return { show, destroy };
}
