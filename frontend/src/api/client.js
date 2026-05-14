const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

let authToken = localStorage.getItem('job_token') || '';

export function setToken(token) {
  authToken = token || '';
  if (token) {
    localStorage.setItem('job_token', token);
  } else {
    localStorage.removeItem('job_token');
  }
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const isForm = options.body instanceof FormData;

  if (!isForm) {
    headers.set('Content-Type', 'application/json');
  }

  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body: isForm || typeof options.body === 'string' ? options.body : JSON.stringify(options.body || {})
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

export const api = {
  signup: (payload) => request('/api/auth/signup', { method: 'POST', body: payload }),
  signin: (payload) => request('/api/auth/signin', { method: 'POST', body: payload }),
  me: () => request('/api/auth/me'),
  updateProfile: (payload) => request('/api/profile', { method: 'PUT', body: payload }),
  uploadResume: (file) => {
    const form = new FormData();
    form.append('resume', file);
    return request('/api/profile/resume', { method: 'POST', body: form });
  },
  getTodayJobs: (refresh = false) => request(`/api/jobs/today${refresh ? '?refresh=1' : ''}`),
  refreshJobs: () => request('/api/jobs/refresh', { method: 'POST' }),
  setMatchStatus: (matchId, status) => request(`/api/jobs/${matchId}/status`, { method: 'PATCH', body: { status } }),
  apply: (matchId) => request(`/api/jobs/${matchId}/apply`, { method: 'POST' })
};
