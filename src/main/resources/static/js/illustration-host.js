// Places the animated illustration (chip or graphics card) in the visible page.
// The modules are imported only when the device has a large screen and a fine pointer,
// so phones never download or run them.

const desktop = matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

const MODULES = {
  chip: () => import('./chip.js'),
  card: () => import('./gpu-card.js'),
};

let slot = null;
let visual = null;
let mounted = null; // { slot, kind, reduced, instance }
let version = 0;

// visual comes from categories.js: { kind: 'chip' | 'card', idle?, ... }
export function placeIllustration(nextSlot, nextVisual = null) {
  slot = nextSlot;
  visual = nextVisual;
  sync();
}

export function showOnIllustration(nextVisual) {
  visual = nextVisual;
  sync();
}

async function sync() {
  const current = ++version;
  const wanted = desktop.matches && slot !== null && visual !== null;

  if (mounted && (!wanted
      || mounted.slot !== slot
      || mounted.kind !== visual.kind
      || mounted.reduced !== reduceMotion.matches)) {
    mounted.instance.destroy();
    mounted = null;
  }
  if (!wanted) return;
  if (mounted) {
    mounted.instance.show(visual);
    return;
  }

  const kind = visual.kind;
  const { mount } = await MODULES[kind]();
  if (current !== version) return; // placed somewhere else while loading

  mounted = { slot, kind, reduced: reduceMotion.matches, instance: mount(slot, { reducedMotion: reduceMotion.matches }) };
  mounted.instance.show(visual);
}

desktop.addEventListener('change', sync);
reduceMotion.addEventListener('change', sync);
