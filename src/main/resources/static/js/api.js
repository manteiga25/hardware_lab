// Thin client for the Spring Boot API. Paths are relative to the page so the
// front-end keeps working if the application is deployed under a context path.

export class ApiError extends Error {
  constructor(status) {
    super(`API respondeu com o estado ${status}`);
    this.status = status;
  }
}

async function get(path, params = {}, signal) {
  const url = new URL(`API/${path}`, document.baseURI);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.append(key, value);
  }

  const response = await fetch(url, {
    signal,
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  });

  // The API answers 404 both for an unknown product and for a search without results.
  if (response.status === 404) return null;
  if (!response.ok) throw new ApiError(response.status);

  return response.json();
}

export async function searchProducts(params, signal) {
  return (await get('search', params, signal)) ?? [];
}

export function getProduct(name, signal) {
  return get('product', { name }, signal);
}

export async function getPair(name, compareName, signal) {
  return (await get('products', { name, compare_name: compareName }, signal)) ?? [];
}

// Highest (slowest) position in the ranking, needed to turn a position into a 0-100 index.
export async function getMaxRank() {
  const [slowest] = await searchProducts({ sort: 'rank,desc', size: 1 });
  return slowest?.spec?.computeRank ?? null;
}
