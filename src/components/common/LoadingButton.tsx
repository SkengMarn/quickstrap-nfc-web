import React from 'react';
import { BeatLoader } from 'react-spinners';

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
}

const variantClasses = {
  primary: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  secondary: 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500',
  danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
};

const LoadingButton: React.FC<LoadingButtonProps> = ({
  children,
  isLoading = false,
  loadingText = 'Processing...',
  variant = 'primary',
  fullWidth = false,
  disabled = false,
  className = '',
  type = 'button',
  ...props
}) => {
  const baseClasses = 'inline-flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const variantClass = variantClasses[variant] || variantClasses.primary;
  const widthClass = fullWidth ? 'w-full' : '';
  
  return (
    <button
      type={type as "button" | "submit" | "reset" | undefined}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClass} ${widthClass} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <BeatLoader size={8} color="#ffffff" className="mr-2" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default LoadingButton;
