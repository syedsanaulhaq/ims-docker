// Global fetch wrapper to handle API URL configuration
// This automatically replaces localhost URLs with the correct production URL

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // If running on production server (not localhost)
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return window.location.origin;
    }
  }
  
  // Check for environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  
  // Default to localhost for development
  return 'http://localhost:3001';
};

const BASE_URL = getBaseUrl();

// Store original fetch
const originalFetch = window.fetch;

// Override global fetch
window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // Convert input to string if it's a Request or URL object
  let url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const originalUrl = url;
  
  // If URL is relative (starts with /), prepend the base URL
  if (typeof url === 'string' && url.startsWith('/')) {
    url = BASE_URL + url;
  } else {
    const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    if (isProduction && typeof url === 'string' && /(localhost|127\.0\.0\.1):\d+/.test(url)) {
      // Replace any localhost or loopback IP with a port with the production BASE_URL
      url = url.replace(/https?:\/\/(localhost|127\.0\.0\.1):\d+/, BASE_URL);
    }
  }

  console.log(`[Fetch Wrapper] Original: ${originalUrl} -> Final: ${url} (BASE_URL: ${BASE_URL})`);

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
