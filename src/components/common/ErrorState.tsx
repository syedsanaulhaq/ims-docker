
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

const ErrorState = ({ 
  message = "Something went wrong. Please try again.", 
  onRetry,
  className = '' 
}: ErrorStateProps) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
      <p className="text-gray-600 mb-4 max-w-md">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4" />
          <span>Try Again</span>
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
