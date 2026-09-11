/**
 * API Configuration
 * Centralized API base URL configuration (delegated to invmisApi)
 */
import { getApiBaseUrl } from '../services/invmisApi';

export { getApiBaseUrl };
export const API_BASE_URL = getApiBaseUrl();

