const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function apiFetch(endpoint, options = {}) {
  // Auto-prefix with /api if not already present
  const url = endpoint.startsWith('/api') 
    ? `${API_BASE_URL}${endpoint}` 
    : `${API_BASE_URL}/api${endpoint}`;
    
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `API error: ${response.status}`);
  }

  return response;
}