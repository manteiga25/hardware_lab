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
  return (await request('GET', 'compare', { params: { name, compare_name: compareName }, signal })) ?? [];
}

/**
 * The agent answers as a stream of Server-Sent Events, one token per event.
 * EventSource is not used on purpose: it reopens the connection when the stream ends (asking
 * the same question again) and it drops the space after "data:", which would glue words
 * together. Reading the body keeps every token exactly as it arrives.
 */
export async function* streamAgent(query, signal) {
  const url = new URL('api/agent', document.baseURI);
  url.searchParams.set('query', query);

  const response = await fetch(url, {
    signal,
    credentials: 'same-origin',
    headers: { Accept: 'text/event-stream' },
  });
  if (!response.ok) throw new ApiError(response.status);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

    let end;
    while ((end = buffer.indexOf('\n\n')) !== -1) {
      const event = eventText(buffer.slice(0, end));
      buffer = buffer.slice(end + 2);
      if (event) yield event;
    }
  }

  const last = eventText(buffer);
  if (last) yield last;
}

function eventText(event) {
  return event
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    // No trimming: a leading space is part of the word.
    .map((line) => line.slice('data:'.length))
    .join('\n');
}

// Highest (slowest) CPU ranking position, needed to turn a position into a 0-100 index.
// GPUs do not need it: their score is already on a fixed 0-1000 scale.
export async function getMaxRank() {
  const [slowest] = await searchProducts({ isCpu: true, sort: 'rank,desc', size: 1 });
  return slowest?.spec?.computeRank ?? null;
}
