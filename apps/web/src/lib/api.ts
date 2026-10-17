import { handleMockApiRequest } from './mockApi.js';

const isGitHubPages =
  typeof window !== 'undefined' &&
  (window.location.hostname.includes('github.io') ||
    window.location.hostname.includes('githubpreview.dev'));

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // 1. Direct mock route when hosted statically on GitHub Pages or when mock is requested
  if (isGitHubPages || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_MOCK === 'true')) {
    try {
      return handleMockApiRequest<T>(endpoint, options);
    } catch (mockErr) {
      console.warn('[Mock API] Execution error:', mockErr);
      throw mockErr;
    }
  }

  // 2. Local / server-backed environment
  try {
    const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '/api';
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      localStorage.removeItem('token');
    }

    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      // If static host returns 404 HTML, gracefully fallback to mock
      if (response.status === 404 && contentType.includes('text/html')) {
        return handleMockApiRequest<T>(endpoint, options);
      }

      const errorBody = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorBody.message || 'Request failed');
    }

    // Handle file/blob downloads
    const contentType = response.headers.get('content-type');
    if (
      contentType &&
      (contentType.includes('application/pdf') ||
        contentType.includes('spreadsheetml') ||
        contentType.includes('text/csv'))
    ) {
      return (await response.blob()) as unknown as T;
    }

    return response.json();
  } catch (err: any) {
    // If backend is unreachable (network error / backend server down), fallback seamlessly to mock
    if (err?.name === 'TypeError' || err?.message?.includes('fetch')) {
      console.info(`[API] Unreachable endpoint ${endpoint}, serving from mock client.`);
      return handleMockApiRequest<T>(endpoint, options);
    }
    throw err;
  }
}
