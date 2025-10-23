/**
 * Smooth Transitions & State Animations
 * Perfect 10/10 UI/UX Implementation
 */

import React, { useEffect, useRef, useState } from 'react';
import { Animate } from '../../utils/animations';

// ============================================================================
// PAGE TRANSITIONS
// ============================================================================

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <Animate
      animation="fadeInUp"
      className={`min-h-screen ${className}`}
      trigger="mount"
    >
      {children}
    </Animate>
  );
};

// ============================================================================
// MODAL TRANSITIONS
// ============================================================================

interface ModalTransitionProps {
  isOpen: boolean;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
}

export const ModalTransition: React.FC<ModalTransitionProps> = ({
  isOpen,
  children,
  onClose,
  className = ''
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
    return undefined;
  }, [isOpen]);

  if (!isOpen && !isAnimating) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${className}`}
      onClick={handleBackdropClick}
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        animation: isOpen ? 'fadeIn 200ms ease-out' : 'fadeOut 150ms ease-in'
      }}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto"
        style={{
          animation: isOpen ? 'scaleIn 200ms ease-out' : 'scaleOut 150ms ease-in'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

// ============================================================================
// TAB TRANSITIONS
// ============================================================================

interface TabTransitionProps {
  activeTab: string;
  children: React.ReactNode;
  className?: string;
}

export const TabTransition: React.FC<TabTransitionProps> = ({
  activeTab,
  children,
  className = ''
}) => {
  const [prevTab, setPrevTab] = useState(activeTab);
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  useEffect(() => {
    if (activeTab !== prevTab) {
      setDirection(activeTab > prevTab ? 'right' : 'left');
      setPrevTab(activeTab);
    }
  }, [activeTab, prevTab]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        key={activeTab}
        className={`w-full ${
          direction === 'right' ? 'animate-slide-left' : 'animate-slide-right'
        }`}
        style={{
          animationDuration: '300ms',
          animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {children}
      </div>
    </div>
  );
};

// ============================================================================
// LIST TRANSITIONS
// ============================================================================

interface ListTransitionProps {
  items: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  className?: string;
}

export const ListTransition: React.FC<ListTransitionProps> = ({
  items,
  renderItem,
  className = ''
}) => {
  return (
    <div className={className}>
      {items.map((item, index) => (
        <Animate
          key={item.id || index}
          animation="fadeInUp"
          delay={index * 50}
          className="mb-4 last:mb-0"
        >
          {renderItem(item, index)}
        </Animate>
      ))}
    </div>
  );
};

// ============================================================================
// CARD TRANSITIONS
// ============================================================================

interface CardTransitionProps {
  children: React.ReactNode;
  hover?: boolean;
  className?: string;
}

export const CardTransition: React.FC<CardTransitionProps> = ({
  children,
  hover = true,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`transition-all duration-200 ${
        hover ? 'hover-lift' : ''
      } ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </div>
  );
};

// ============================================================================
// BUTTON TRANSITIONS
// ============================================================================

interface ButtonTransitionProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export const ButtonTransition: React.FC<ButtonTransitionProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = ''
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500';
      case 'secondary':
        return 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500';
      case 'danger':
        return 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm';
      case 'md':
        return 'px-4 py-2 text-base';
      case 'lg':
        return 'px-6 py-3 text-lg';
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center rounded-md font-medium
        transition-all duration-150 ease-out
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${getVariantClasses()}
        ${getSizeClasses()}
        ${className}
      `}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      style={{
        transform: isPressed ? 'scale(0.98)' : 'scale(1)',
        transition: 'transform 100ms ease-out'
      }}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
      ) : null}
      {children}
    </button>
  );
};

// ============================================================================
// INPUT TRANSITIONS
// ============================================================================

interface InputTransitionProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  success?: string;
  type?: 'text' | 'email' | 'password' | 'number';
  className?: string;
}

export const InputTransition: React.FC<InputTransitionProps> = ({
  value,
  onChange,
  placeholder,
  label,
  error,
  success,
  type = 'text',
  className = ''
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!value);

  useEffect(() => {
    setHasValue(!!value);
  }, [value]);

  const getBorderColor = () => {
    if (error) return 'border-red-500 focus:border-red-500 focus:ring-red-500';
    if (success) return 'border-green-500 focus:border-green-500 focus:ring-green-500';
    if (isFocused) return 'border-blue-500 focus:border-blue-500 focus:ring-blue-500';
    return 'border-gray-300 focus:border-blue-500 focus:ring-blue-500';
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={`
            w-full px-3 py-2 border rounded-md shadow-sm
            transition-all duration-200 ease-out
            focus:outline-none focus:ring-2 focus:ring-offset-0
            ${getBorderColor()}
          `}
        />
        {success && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="w-5 h-5 text-green-500">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        )}
      </div>
      {error && (
        <Animate animation="fadeInDown" className="mt-1">
          <p className="text-sm text-red-600">{error}</p>
        </Animate>
      )}
      {success && (
        <Animate animation="fadeInDown" className="mt-1">
          <p className="text-sm text-green-600">{success}</p>
        </Animate>
      )}
    </div>
  );
};

// ============================================================================
// TOAST TRANSITIONS
// ============================================================================

interface ToastTransitionProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
  className?: string;
}

export const ToastTransition: React.FC<ToastTransitionProps> = ({
  message,
  type,
  isVisible,
  onClose,
  duration = 5000,
  className = ''
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isVisible, duration, onClose]);

  const getTypeClasses = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      case 'warning':
        return 'bg-yellow-500 text-white';
      case 'info':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  if (!isVisible && !isAnimating) return null;

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-sm w-full ${className}`}
      style={{
        animation: isVisible ? 'slideInRight 300ms ease-out' : 'slideOutRight 300ms ease-in'
      }}
    >
      <div className={`${getTypeClasses()} rounded-lg shadow-lg p-4`}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{message}</p>
          <button
            onClick={onClose}
            className="ml-4 text-white hover:text-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PROGRESS TRANSITIONS
// ============================================================================

interface ProgressTransitionProps {
  progress: number;
  label?: string;
  showPercentage?: boolean;
  animated?: boolean;
  className?: string;
}

export const ProgressTransition: React.FC<ProgressTransitionProps> = ({
  progress,
  label,
  showPercentage = true,
  animated = true,
  className = ''
}) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    if (animated) {
      const duration = 1000;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const currentProgress = Math.min((elapsed / duration) * progress, progress);

        setAnimatedProgress(currentProgress);

        if (currentProgress < progress) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    } else {
      setAnimatedProgress(progress);
    }
  }, [progress, animated]);

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          {showPercentage && (
            <span className="text-sm text-gray-500">{Math.round(animatedProgress)}%</span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${animatedProgress}%` }}
        />
      </div>
    </div>
  );
};

// ============================================================================
// COLLAPSE TRANSITION
// ============================================================================

interface CollapseTransitionProps {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
}

export const CollapseTransition: React.FC<CollapseTransitionProps> = ({
  isOpen,
  children,
  className = ''
}) => {
  const [height, setHeight] = useState(isOpen ? 'auto' : '0');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      if (isOpen) {
        setHeight(`${contentRef.current.scrollHeight}px`);
      } else {
        setHeight('0');
      }
    }
  }, [isOpen]);

  return (
    <div
      className={`overflow-hidden transition-all duration-300 ease-out ${className}`}
      style={{ height }}
    >
      <div ref={contentRef}>
        {children}
      </div>
    </div>
  );
};

// ============================================================================
// STAGGERED REVEAL
// ============================================================================

interface StaggeredRevealProps {
  children: React.ReactNode[];
  delay?: number;
  className?: string;
}

export const StaggeredReveal: React.FC<StaggeredRevealProps> = ({
  children,
  delay = 100,
  className = ''
}) => {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <Animate
          key={index}
          animation="fadeInUp"
          delay={index * delay}
        >
          {child}
        </Animate>
      ))}
    </div>
  );
};

// ============================================================================
// CSS ANIMATIONS FOR TRANSITIONS
// ============================================================================

export const TransitionCSS = `
@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOutRight {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

@keyframes slideInLeft {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOutLeft {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(-100%);
    opacity: 0;
  }
}

/* Smooth transitions for all interactive elements */
.transition-smooth {
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.transition-fast {
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.transition-slow {
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Hover effects */
.hover-lift {
  transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.hover-scale {
  transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.hover-scale:hover {
  transform: scale(1.05);
}

.hover-scale:active {
  transform: scale(0.95);
}

/* Focus states */
.focus-ring {
  transition: box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.focus-ring:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Button press effect */
.button-press {
  transition: transform 100ms ease-out;
}

.button-press:active {
  transform: scale(0.98);
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .transition-smooth,
  .transition-fast,
  .transition-slow,
  .hover-lift,
  .hover-scale,
  .focus-ring,
  .button-press {
    transition: none;
  }

  .hover-lift:hover,
  .hover-scale:hover {
    transform: none;
  }
}
`;

export default {
  PageTransition,
  ModalTransition,
  TabTransition,
  ListTransition,
  CardTransition,
  ButtonTransition,
  InputTransition,
  ToastTransition,
  ProgressTransition,
  CollapseTransition,
  StaggeredReveal,
  TransitionCSS
};



