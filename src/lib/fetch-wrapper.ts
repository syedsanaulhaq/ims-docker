// Global fetch wrapper to handle API URL configuration
// This automatically replaces localhost URLs with the correct production URL

const getBaseUrl = () => {
  const hostname = window.location.hostname;
  
  // Check for environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Default to localhost for development
  return '';
};

const BASE_URL = getBaseUrl();

// Store original fetch
const originalFetch = window.fetch;

// Override global fetch
window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // Convert input to string if it's a Request or URL object
  let url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  
  // If URL is relative (starts with /), prepend the base URL
  if (typeof url === 'string' && url.startsWith('/')) {
    url = BASE_URL + url;
    } else if (url.includes('localhost:3001')) {
    // Replace localhost:3001 with the configured base URL
    url = url.replace('http://localhost:3001', BASE_URL);
    }

  // Ensure session cookies are sent to backend API unless explicitly overridden.
  // This prevents accidental 401s on protected routes when callers omit credentials.
  let requestInit = init;
  const isBackendCall = typeof url === 'string' && url.startsWith(BASE_URL);
  if (isBackendCall && (!requestInit || requestInit.credentials === undefined)) {
    requestInit = {
      ...(requestInit || {}),
      credentials: 'include',
    };
  }
  
  // Call original fetch with modified URL
  return originalFetch(url, requestInit);
};

export {};

