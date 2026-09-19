// Desktop-only illustration of a graphics card. illustration-host.js imports this module
// dynamically and only on large screens with a fine pointer, so phones never download or run it.
//
// The number of fans and how fast they spin follow the card's power draw (TDP), as described
// by categories.js: small cards get one fan, the most power-hungry get three.

import { h, svg } from './dom.js';
import { attachTilt, createLoop } from './motion.js';

const WIDTH = 520;
const HEIGHT = 280;
const BODY = { x: 28, y: 36, width: 470, height: 176 };
const FAN_Y = BODY.y + BODY.height / 2;
const BLADES = 9;

const FAN_LAYOUTS = {
  1: { radius: 74, xs: [263] },
  2: { radius: 72, xs: [155, 371] },
  3: { radius: 62, xs: [120, 263, 406] },
};

function buildSvg() {
  const root = svg('svg', { viewBox: `0 0 ${WIDTH} ${HEIGHT}`, class: 'card-svg', focusable: 'false' });

  // I/O bracket with display ports
  root.append(svg('rect', { x: 12, y: 22, width: 16, height: 222, rx: 3, class: 'card-bracket' }));
  for (const y of [64, 104, 144]) {
    root.append(svg('rect', { x: 16, y, width: 8, height: 26, rx: 2, class: 'card-port' }));
  }

  // PCIe edge connector with its key notch
  const pcie = svg('g');
  pcie.append(svg('rect', { x: 150, y: BODY.y + BODY.height, width: 250, height: 20, rx: 2, class: 'card-pcie' }));
  for (let x = 156; x < 396; x += 8) {
    if (x > 184 && x < 200) continue;
    pcie.append(svg('rect', { x, y: BODY.y + BODY.height + 6, width: 4, height: 12, rx: 1, class: 'card-pcie-pin' }));
  }
  root.append(pcie);

  root.append(
    svg('rect', { x: BODY.x, y: BODY.y, width: BODY.width, height: BODY.height, rx: 16, class: 'card-body' }),
    svg('rect', { x: BODY.x + 20, y: BODY.y + BODY.height - 14, width: 110, height: 4, rx: 2, class: 'card-accent' }),
  );

  const fanLayer = svg('g');
  root.append(fanLayer);
  return { root, fanLayer };
}

function buildFan(cx, radius) {
  const hub = radius * 0.28;
  const rotor = svg('g', { class: 'fan-rotor' });

  // Swept blades from the hub towards the ring.
  for (let i = 0; i < BLADES; i++) {
    const d = [
      `M ${hub * 0.9} -5`,
      `Q ${radius * 0.55} ${-radius * 0.38} ${radius * 0.88} ${-radius * 0.14}`,
      `L ${radius * 0.88} ${radius * 0.1}`,
      `Q ${radius * 0.55} ${-radius * 0.08} ${hub * 0.9} 6`,
      'Z',
    ].join(' ');
    rotor.append(svg('path', { d, class: 'fan-blade', transform: `rotate(${(360 / BLADES) * i})` }));
  }
  rotor.append(svg('circle', { r: hub, class: 'fan-hub' }));

  const group = svg('g', { transform: `translate(${cx} ${FAN_Y})` });
  group.append(svg('circle', { r: radius, class: 'fan-ring' }), rotor);
  return { group, rotor, angle: Math.random() * 360 };
}

export function mount(container, { reducedMotion }) {
  const { root, fanLayer } = buildSvg();
  const caption = h('p', { class: 'illustration-caption' });
  const stage = h('div', { class: 'illustration-stage' }, root, caption);
  container.replaceChildren(stage);

  let fans = [];
  let fanCount = 0;
  let degreesPerSecond = 0;

  function setFans(count) {
    if (count === fanCount) return;
    fanCount = count;
    const layout = FAN_LAYOUTS[count] ?? FAN_LAYOUTS[2];
    fans = layout.xs.map((x) => buildFan(x, layout.radius));
    fanLayer.replaceChildren(...fans.map((fan) => fan.group));
    fans.forEach((fan) => fan.rotor.setAttribute('transform', `rotate(${fan.angle})`));
  }

  const loop = createLoop(stage, (dt) => {
    for (const fan of fans) {
      fan.angle = (fan.angle + degreesPerSecond * dt) % 360;
      fan.rotor.setAttribute('transform', `rotate(${fan.angle})`);
    }
  }, { enabled: !reducedMotion });

  const detachTilt = attachTilt(root, { enabled: !reducedMotion });

  function show(visual) {
    if (!visual || visual.idle) {
      setFans(2);
      degreesPerSecond = 0.35 * 360;
      caption.replaceChildren();
    } else {
      setFans(visual.fans);
      degreesPerSecond = visual.revPerSecond * 360;
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
