import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, LogIn, CreditCard, Lock } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { useSession } from '@/contexts/SessionContext';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const { initializeSession } = useSession();
  const navigate = useNavigate();

  // Handle autofill styling
  useEffect(() => {
    const handleAutofill = () => {
      const inputs = document.querySelectorAll('input[type="text"], input[type="password"]') as NodeListOf<HTMLInputElement>;
      inputs.forEach(input => {
        const style = window.getComputedStyle(input);
        // Force recompute styles for autofilled inputs
        if (input.value) {
          input.style.backgroundColor = 'transparent !important';
          input.style.WebkitTextFillColor = '#ffffff';
        }
      });
    };

    // Listen for autofill
    const timerId = setInterval(handleAutofill, 100);
    return () => clearInterval(timerId);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      setIsLoading(false);
      return;
    }

    try {
      const result = await login(username.trim(), password);
      
      if (result.success) {
        await initializeSession();
        navigate('/personal-dashboard', { replace: true });
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="w-full min-h-screen flex flex-wrap justify-center items-center p-4"
      style={{
        backgroundImage: "url('/fyq04rbamaa9f_j.jpg')",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed',
        position: 'relative'
      }}
    >
      {/* Overlay */}
      <div 
        className="absolute w-full h-full top-0 left-0 z-0"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)' }}
      ></div>

      {/* Login Container */}
      <div 
        className="w-full max-w-lg rounded-2xl overflow-hidden p-10 relative z-10"
        style={{
          background: 'linear-gradient(to bottom, #197B75, #197B75)',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
        }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div 
            className="w-32 h-32 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#197B75' }}
          >
            <img 
              src="/ecp logo png white.png" 
              alt="ECP Logo"
              className="w-28 h-28 object-contain"
            />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-center text-white text-xl font-bold mb-8 uppercase tracking-wide">
          ECP Inventory Management System
        </h1>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-400/30 text-white p-3 rounded text-sm">
              {error}
            </div>
          )}

          {/* Username Field */}
          <div className="relative border-b-2 border-white flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-white flex-shrink-0" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full bg-transparent text-white text-base placeholder-white/70 border-0 px-0 py-3 focus:outline-none focus:placeholder-transparent"
              style={{
                WebkitTextFillColor: '#ffffff',
                WebkitBoxShadow: 'inset 0 0 0 1000px rgba(0,0,0,0)',
                backgroundColor: 'transparent !important'
              }}
              required
            />
          </div>

          {/* Password Field */}
          <div className="relative border-b-2 border-white flex items-center gap-3">
            <Lock className="h-5 w-5 text-white flex-shrink-0" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-transparent text-white text-base placeholder-white/70 border-0 px-0 py-3 focus:outline-none focus:placeholder-transparent"
              style={{
                WebkitTextFillColor: '#ffffff',
                WebkitBoxShadow: 'inset 0 0 0 1000px rgba(0,0,0,0)',
                backgroundColor: 'transparent !important'
              }}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-white hover:text-white/80 transition-colors flex-shrink-0"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {/* Remember Me */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 cursor-pointer"
            />
            <label htmlFor="remember" className="text-white text-sm font-medium cursor-pointer">
              Remember me
            </label>
          </div>

          {/* Login Button */}
          <div className="flex justify-center pt-4">
            <Button 
              type="submit" 
              className="px-12 py-3 font-semibold rounded-full transition-all duration-300"
              style={{ 
                backgroundColor: '#20ad6b',
                color: '#555555'
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                <span>Login</span>
              )}
            </Button>
          </div>
        </form>

        {/* Development Info */}
        <div className="mt-8 pt-6 border-t border-white/30 text-center">
          <p className="text-white/80 text-xs mb-2">Development Access:</p>
          <p className="text-white text-xs"><strong>Admin:</strong> admin / admin</p>
          <p className="text-white text-xs"><strong>Example CNIC:</strong> 4130423170445</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
