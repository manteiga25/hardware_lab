// Thin client for the Spring Boot API. Paths are relative to the page so the
// front-end keeps working if the application is deployed under a context path.

export class ApiError extends Error {
  constructor(status) {
    super(`API respondeu com o estado ${status}`);
    this.status = status;
  }
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Spring Security keeps the CSRF token in the XSRF-TOKEN cookie (set on the first page
// load) and expects it back in the X-XSRF-TOKEN header on requests that change data.
function csrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function request(method, path, { params = {}, body, signal } = {}) {
  const url = new URL(`API/${path}`, document.baseURI);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.append(key, value);
  }

  const headers = { Accept: 'application/json' };
  if (!SAFE_METHODS.has(method)) {
    const token = csrfToken();
    if (token) headers['X-XSRF-TOKEN'] = token;
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(url, {
    method,
    signal,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  });

  // The API answers 404 both for an unknown product and for a search without results.
  if (response.status === 404) return null;
  if (!response.ok) throw new ApiError(response.status);
  if (response.status === 204) return null;

  return response.json();
}

export async function searchProducts(params, signal) {
  return (await request('GET', 'search', { params, signal })) ?? [];
}

export function getProduct(name, signal) {
  return request('GET', 'product', { params: { name }, signal });
}

export async function getPair(name, compareName, signal) {
  return (await request('GET', 'products', { params: { name, compare_name: compareName }, signal })) ?? [];
}

// Highest (slowest) CPU ranking position, needed to turn a position into a 0-100 index.
// GPUs do not need it: their score is already on a fixed 0-1000 scale.
export async function getMaxRank() {
  const [slowest] = await searchProducts({ isCpu: true, sort: 'rank,desc', size: 1 });
  return slowest?.spec?.computeRank ?? null;
}
