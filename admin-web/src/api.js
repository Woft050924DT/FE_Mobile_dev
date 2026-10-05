const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
let refreshInFlight;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');

  const send = (token) => {
    const requestHeaders = new Headers(headers);
    if (token) requestHeaders.set('Authorization', `Bearer ${token}`);
    return fetch(`${baseUrl}${path}`, {
      ...options,
      headers: requestHeaders,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  };
  let response = await send(localStorage.getItem('admin_access_token'));
  if (
    response.status === 401 &&
    localStorage.getItem('admin_access_token') &&
    localStorage.getItem('admin_refresh_token') &&
    path !== '/auth/login' &&
    path !== '/auth/refresh-token'
  ) {
    try {
      refreshInFlight ||= fetch(`${baseUrl}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: localStorage.getItem('admin_refresh_token') }),
      })
        .then(async (refreshResponse) => {
          const refreshed = await refreshResponse.json().catch(() => null);
          if (!refreshResponse.ok || !refreshed?.data?.accessToken) {
            throw new ApiError(refreshed?.message || 'Phiên đăng nhập đã hết hạn.', refreshResponse.status);
          }
          localStorage.setItem('admin_access_token', refreshed.data.accessToken);
          if (refreshed.data.refreshToken || refreshed.data.newRefreshToken) {
            localStorage.setItem('admin_refresh_token', refreshed.data.refreshToken || refreshed.data.newRefreshToken);
          }
          return refreshed.data.accessToken;
        })
        .finally(() => {
          refreshInFlight = undefined;
        });
      response = await send(await refreshInFlight);
    } catch {
      localStorage.removeItem('admin_access_token');
      localStorage.removeItem('admin_refresh_token');
      localStorage.removeItem('admin_profile');
      window.dispatchEvent(new Event('admin:unauthorized'));
    }
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login') {
      localStorage.removeItem('admin_access_token');
      localStorage.removeItem('admin_refresh_token');
      localStorage.removeItem('admin_profile');
      window.dispatchEvent(new Event('admin:unauthorized'));
    }
    throw new ApiError(payload?.message || `Yêu cầu thất bại (${response.status})`, response.status);
  }
  return payload;
}

export function dataOf(response) {
  return response?.data;
}

export function listOf(response) {
  return Array.isArray(response?.data) ? response.data : [];
}

export function errorMessage(error) {
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi. Vui lòng thử lại.';
}
