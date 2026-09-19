// Hash routes, so the static files need no server-side routing:
//   #/cpu  #/gpu              lists (#/ is the processor list)
//   #/cpu/<name>  #/gpu/<name>  one product
//   #/comparar/<a>/<b>        two products of the same type side by side
//   #/como-calculamos         how the numbers are calculated

const enc = encodeURIComponent;
const typeOf = (product) => (product.isCpu === false ? 'gpu' : 'cpu');

export const paths = {
  list: (type = 'cpu') => `#/${type}`,
  detail: (product) => `#/${typeOf(product)}/${enc(product.productName)}`,
  compare: (first, second) => `#/comparar/${enc(first)}/${enc(second)}`,
  method: () => '#/como-calculamos',
};

const ROUTES = [
  ['list', /^\/?$/, () => ['cpu']],
  ['list', /^\/(cpu|gpu)$/],
  ['detail', /^\/(cpu|gpu)\/([^/]+)$/],
  ['compare', /^\/comparar\/([^/]+)\/([^/]+)$/],
  ['method', /^\/como-calculamos$/],
];

// Plain in-page anchors (like the skip link) are not routes.
export function isRoute(hash) {
  return hash === '' || hash === '#' || hash.startsWith('#/');
}

export function parse(hash) {
  const path = hash.replace(/^#/, '');

  for (const [name, pattern, fixed] of ROUTES) {
    const match = path.match(pattern);
    if (!match) continue;
    try {
      return { name, params: fixed ? fixed() : match.slice(1).map(decodeURIComponent) };
    } catch {
      break; // malformed escape sequence
    }
  }
  return { name: 'list', params: ['cpu'] };
}

export function go(hash) {
  if (location.hash !== hash) location.hash = hash;
}
