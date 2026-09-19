// Up to two products of each type picked from the lists to compare (a processor can only
// be compared with a processor). Kept for the browser tab's session so a reload does not
// lose it; storage failures just mean it is not kept.

const STORAGE_KEY = 'hardware-lab-compare';
const MAX = 2;

let items = load();
const listeners = new Set();

function load() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    return {
      cpu: Array.isArray(saved?.cpu) ? saved.cpu.slice(0, MAX) : [],
      gpu: Array.isArray(saved?.gpu) ? saved.gpu.slice(0, MAX) : [],
    };
  } catch {
    return { cpu: [], gpu: [] };
  }
}

function update(type, next) {
  items = { ...items, [type]: next };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Private mode or blocked storage: the selection still works for this page view.
  }
  listeners.forEach((listener) => listener(type));
}

export const selection = {
  items: (type) => items[type],
  has: (type, name) => items[type].some((p) => p.productName === name),
  isFull: (type) => items[type].length >= MAX,
  toggle(type, product) {
    if (this.has(type, product.productName)) this.remove(type, product.productName);
    else if (!this.isFull(type)) update(type, [...items[type], product]);
  },
  remove(type, name) {
    update(type, items[type].filter((p) => p.productName !== name));
  },
  subscribe(listener) {
    listeners.add(listener);
  },
};
