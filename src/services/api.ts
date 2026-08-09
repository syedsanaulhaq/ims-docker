// Shared API response type for all services
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}
