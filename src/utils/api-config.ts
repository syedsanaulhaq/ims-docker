/**
 * API Configuration
 * Centralized API base URL configuration
 */

export const getApiBaseUrl = (): string => {
  // Use environment variable if available, otherwise default to localhost:3001
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
};

export const API_BASE_URL = getApiBaseUrl();
