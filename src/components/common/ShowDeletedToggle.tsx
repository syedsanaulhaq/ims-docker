import React from 'react';

interface ShowDeletedToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}

export const ShowDeletedToggle: React.FC<ShowDeletedToggleProps> = ({ 
  checked, 
  onChange,
  label = "Show deleted records",
  className = ''
}) => {
  return (
    <label className={`flex items-center cursor-pointer ${className}`}>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div className={`block w-10 h-6 rounded-full transition ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${checked ? 'transform translate-x-4' : ''}`}></div>
      </div>
      <span className="ml-3 text-sm font-medium text-gray-700">
        {label}
      </span>
    </label>
  );
};
