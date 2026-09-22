import * as api from './api.js';
import { h } from './dom.js';
import { CURRENCY_NOTE, SITE_NAME, number, shortName } from './format.js';
import { CATEGORIES, categoryOf } from './categories.js';
import { go, isRoute, parse, paths } from './router.js';
import { selection } from './selection.js';
import { placeIllustration, showOnIllustration } from './illustration-host.js';
import { createAssistant } from './views/assistant.js';
import { createList } from './views/list.js';
import { renderDetail } from './views/detail.js';
import { renderCompare } from './views/compare.js';

const $ = (id) => document.getElementById(id);
const main = $('conteudo');

const maxRankReady = api.getMaxRank()
  .then((value) => {
    // Only there when the "Como calculamos" page is part of index.html.
    const note = document.querySelector('[data-max-rank-note]');
    if (value && note) note.textContent = ` (neste momento, ${number(value)})`;
    return value;
  })
  .catch(() => null);

$('currency-note').textContent = CURRENCY_NOTE;

/* Views --------------------------------------------------------------- */

// One list per category, each keeping its own filters, page and scroll position.
const lists = Object.fromEntries(Object.values(CATEGORIES).map((category) => {
  const list = createList(category, {
    maxRankReady,
    // While searching by name, the illustration previews the first result.
    onResults: (products, query) => {
      if (current?.name === 'list' && current.type === category.key) {
        showOnIllustration(category.illustration(query && products.length ? products[0] : null));
      }
    },
  });
  main.insertBefore(list.root, main.firstChild);
  return [category.key, list];
}));

const assistant = createAssistant();
main.append(assistant.root);

const views = Object.fromEntries([...document.querySelectorAll('[data-view]')].map((el) => [el.dataset.view, el]));

/* Routing ------------------------------------------------------------- */

let current = null; // { name, type }
const listScroll = { cpu: 0, gpu: 0 };
let movedWithinApp = false;

// "Voltar" returns to wherever the visitor came from inside the site, or to the list.
function back() {
  if (movedWithinApp) history.back();
  else go(paths.list(current?.type ?? 'cpu'));
}

const context = {
  maxRankReady,
  back,
  placeIllustration,
};

async function route() {
  if (!isRoute(location.hash)) return;

  const { name, params } = parse(location.hash);
  const previous = current;
  if (previous?.name === 'list') listScroll[previous.type] = scrollY;
  if (previous) movedWithinApp = true;

  // The type is known from the URL for lists and product pages; comparisons find it out after loading.
  const type = name === 'list' || name === 'detail' ? params[0] : null;
  const next = { name, type };
  current = next;

  const viewKey = name === 'list' ? `list-${type}` : name;
  // A page that is not in index.html (the method page is optional) falls back to the list.
  if (!views[viewKey]) {
    go(paths.list());
    return;
  }

  for (const [key, el] of Object.entries(views)) el.hidden = key !== viewKey;
  updateNav();
  updateTray();

  if (name === 'list') {
    const category = CATEGORIES[type];
    document.title = `${category.nav} | ${SITE_NAME}`;
    placeIllustration(lists[type].illustrationSlot, category.illustration(null));
    lists[type].enter();
    scrollTo({ top: listScroll[type], behavior: 'instant' });
  } else {
    placeIllustration(null);
    scrollTo({ top: 0, behavior: 'instant' });

    if (name === 'detail') {
      const product = await renderDetail(views.detail, params[1], context);
      if (product && current === next) next.type = categoryOf(product).key;
    }
    if (name === 'compare') {
      const products = await renderCompare(views.compare, params[0], params[1], context);
      if (products && current === next) next.type = categoryOf(products[0]).key;
    }
    if (name === 'assistant') {
      document.title = `Assistente | ${SITE_NAME}`;
      assistant.enter();
    }
    if (name === 'method') document.title = `Como calculamos | ${SITE_NAME}`;

    if (current === next) {
      updateNav();
      updateTray();
    }
  }

  // Move keyboard and screen reader focus to the new page's heading (not on first load,
  // and not if the visitor already moved on while this page was loading).
  if (previous && current === next) {
    views[viewKey].querySelector('h1')?.focus({ preventScroll: true });
  }
}

// "page" on the list itself; "true" marks the section a product or comparison belongs to.
function updateNav() {
  document.querySelectorAll('[data-nav]').forEach((link) => {
    const key = link.dataset.nav;
    if (current.name === 'list' && key === current.type) link.setAttribute('aria-current', 'page');
    else if ((current.name === 'method' || current.name === 'assistant') && key === current.name) link.setAttribute('aria-current', 'page');
    else if ((current.name === 'detail' || current.name === 'compare') && key === current.type) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  });
}

addEventListener('hashchange', route);

// The skip link must not change the hash, which is used for routing.
document.querySelector('[data-skip]').addEventListener('click', (event) => {
  event.preventDefault();
  main.focus();
});

/* Comparison tray ----------------------------------------------------- */

const tray = $('tray');
const trayItems = $('tray-items');
const trayHint = $('tray-hint');
const trayCompare = $('tray-compare');

// Shown on lists and product pages, with the products picked in that category.
function updateTray() {
  const type = current?.type;
  const onPage = current && (current.name === 'list' || current.name === 'detail');
  const items = type ? selection.items(type) : [];
  const visible = Boolean(onPage && items.length);
  tray.hidden = !visible;
  document.body.classList.toggle('has-tray', visible);
  if (!visible) return;

  const { g } = CATEGORIES[type];
  trayItems.replaceChildren(...items.map((p) => h('li', { class: 'tray-item' },
    h('span', { class: 'tray-name', text: shortName(p), title: p.productName }),
    h('button', {
      type: 'button',
      class: 'tray-remove',
      'aria-label': `Remover ${p.productName} da comparação`,
      text: '×',
      onclick: () => selection.remove(type, p.productName),
    }))));

  const ready = items.length === 2;
  trayHint.textContent = `Escolhe mais ${g.aOne} para comparar.`;
  trayHint.hidden = ready;
  trayCompare.hidden = !ready;
}

trayCompare.addEventListener('click', () => {
  const [first, second] = selection.items(current.type);
  go(paths.compare(first.productName, second.productName));
});

selection.subscribe((type) => {
  updateTray();
  lists[type].refreshSelection();
});

route();
