import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSession } from '@/contexts/SessionContext';
import { getApiBaseUrl } from '@/services/invmisApi';

/**
 * SSO Login Page
 * Handles automatic authentication when user comes from Digital System
 * No loading screen - silent authentication in background
 */
export default function SSOLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { initializeSession } = useSession();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setError('No authentication token provided');
      // Redirect to DS login after 2 seconds
      setTimeout(() => {
        window.location.href = import.meta.env.VITE_DS_LOGIN_URL || 'http://172.20.150.34/Account/Login';
      }, 2000);
      return;
    }

    // Silently validate token with backend (no loading screen)
    authenticateWithToken(token);
  }, [searchParams]);

  const authenticateWithToken = async (token: string) => {
    try {
      // Validate token with backend
      const response = await fetch(`${getApiBaseUrl()}/auth/sso-validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Invalid or expired token');
      }

      const data = await response.json();

      if (data.success && data.user) {
        // Store user in auth context
        await login(data.user);
        
        // Refresh session to get IMS roles and permissions
        await initializeSession();
        
        // Store token in localStorage for API calls
        localStorage.setItem('sso_token', token);
        
        // Immediately redirect to personal dashboard (no delay)
        navigate('/personal-dashboard', { replace: true });
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error) {
      console.error('❌ SSO Authentication error:', error);
      setError(error instanceof Error ? error.message : 'Authentication failed');
      
      // Redirect to DS login after showing error briefly
      setTimeout(() => {
        window.location.href = import.meta.env.VITE_DS_LOGIN_URL || 'http://172.20.150.34/Account/Login';
      }, 2000);
    }
  };

  // Only show error state - no loading screen
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              Authentication Failed
            </h3>
            <p className="mt-2 text-sm text-gray-500">{error}</p>
            <p className="mt-2 text-xs text-gray-400">Redirecting to Digital System login...</p>
          </div>
        </div>
      </div>
    );
  }

  // Return null during authentication (no visible UI)
  return null;
}
