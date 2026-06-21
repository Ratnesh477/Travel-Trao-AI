const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: Status ${response.status}`);
  }

  return response.json();
}

export const authApi = {
  register: (body: any) => apiCall('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  login: (body: any) => apiCall('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
};

export const tripApi = {
  list: () => apiCall('/api/trips'),
  get: (id: string) => apiCall(`/api/trips/${id}`),
  create: (body: any) => apiCall('/api/trips', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  update: (id: string, body: any) => apiCall(`/api/trips/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  }),
  regenerateDay: (id: string, dayNumber: number, instruction: string) => apiCall(`/api/trips/${id}/regenerate-day`, {
    method: 'POST',
    body: JSON.stringify({ dayNumber, instruction }),
  }),
  delete: (id: string) => apiCall(`/api/trips/${id}`, {
    method: 'DELETE',
  }),
};
