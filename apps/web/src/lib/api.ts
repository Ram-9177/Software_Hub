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

  const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '/api';

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorBody.message || `Request failed with status ${response.status}`);
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
    if (err?.name === 'TypeError' && err?.message?.includes('fetch')) {
      throw new Error('Unable to connect to the server. Please check your network connection.');
    }
    throw err;
  }
}
