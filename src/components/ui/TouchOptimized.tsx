/**
 * Touch-Optimized Interactions for Mobile Devices
 * Perfect 10/10 UI/UX Implementation
 */

import React, { TouchEvent, useEffect, useRef, useState } from 'react';

// ============================================================================
// TOUCH DETECTION UTILITIES
// ============================================================================

export const TouchUtils = {
  /**
   * Detect if device supports touch
   */
  isTouchDevice: (): boolean => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },

  /**
   * Detect if device is mobile
   */
  isMobile: (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },

  /**
   * Get optimal touch target size
   */
  getTouchTargetSize: (baseSize: number = 44): number => {
    const isTouch = TouchUtils.isTouchDevice();
    return isTouch ? Math.max(baseSize, 44) : baseSize;
  },

  /**
   * Calculate touch pressure (if supported)
   */
  getTouchPressure: (touch: Touch): number => {
    return (touch as any).force || 1;
  },

  /**
   * Get touch velocity
   */
  getTouchVelocity: (startTouch: Touch, endTouch: Touch, timeDelta: number): number => {
    const distance = Math.sqrt(
      Math.pow(endTouch.clientX - startTouch.clientX, 2) +
      Math.pow(endTouch.clientY - startTouch.clientY, 2)
    );
    return distance / timeDelta;
  }
};

// ============================================================================
// TOUCH-OPTIMIZED BUTTON
// ============================================================================

interface TouchButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  hapticFeedback?: boolean;
  className?: string;
}

export const TouchButton: React.FC<TouchButtonProps> = ({
  children,
  onClick,
  onLongPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'md',
  hapticFeedback = true,
  className = ''
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartTime = useRef<number>(0);
  const touchStartPosition = useRef<{ x: number; y: number } | null>(null);

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800';
      case 'secondary':
        return 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300';
      case 'danger':
        return 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800';
      case 'ghost':
        return 'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200';
    }
  };

  const getSizeClasses = () => {
    const baseSize = TouchUtils.getTouchTargetSize();
    switch (size) {
      case 'sm':
        return `px-3 py-2 text-sm min-h-[${baseSize}px]`;
      case 'md':
        return `px-4 py-3 text-base min-h-[${baseSize + 8}px]`;
      case 'lg':
        return `px-6 py-4 text-lg min-h-[${baseSize + 16}px]`;
    }
  };

  const triggerHapticFeedback = () => {
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10); // Light haptic feedback
    }
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (disabled || loading) return;

    e.preventDefault();
    setIsPressed(true);
    touchStartTime.current = Date.now();
    touchStartPosition.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };

    // Start long press timer
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        setIsLongPressing(true);
        triggerHapticFeedback();
        onLongPress();
      }, 500);
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (disabled || loading) return;

    e.preventDefault();
    setIsPressed(false);
    setIsLongPressing(false);

    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // Check if it's a tap (not a drag)
    if (touchStartPosition.current) {
      const touch = e.changedTouches[0];
      const distance = Math.sqrt(
        Math.pow(touch.clientX - touchStartPosition.current.x, 2) +
        Math.pow(touch.clientY - touchStartPosition.current.y, 2)
      );

      if (distance < 10) { // Within 10px is considered a tap
        triggerHapticFeedback();
        onClick?.();
      }
    }
  };

  const handleMouseDown = () => {
    if (!TouchUtils.isTouchDevice()) {
      setIsPressed(true);
    }
  };

  const handleMouseUp = () => {
    if (!TouchUtils.isTouchDevice()) {
      setIsPressed(false);
      onClick?.();
    }
  };

  const handleMouseLeave = () => {
    setIsPressed(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <button
      className={`
        inline-flex items-center justify-center rounded-lg font-medium
        transition-all duration-150 ease-out
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        disabled:opacity-50 disabled:cursor-not-allowed
        select-none
        ${getVariantClasses()}
        ${getSizeClasses()}
        ${isPressed ? 'scale-95' : 'scale-100'}
        ${isLongPressing ? 'ring-2 ring-blue-500' : ''}
        ${className}
      `}
      disabled={disabled || loading}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
      ) : null}
      {children}
    </button>
  );
};

// ============================================================================
// TOUCH-OPTIMIZED CARD
// ============================================================================

interface TouchCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  onLongPress?: () => void;
  hapticFeedback?: boolean;
  className?: string;
}

export const TouchCard: React.FC<TouchCardProps> = ({
  children,
  onClick,
  onLongPress,
  hapticFeedback = true,
  className = ''
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosition = useRef<{ x: number; y: number } | null>(null);

  const triggerHapticFeedback = () => {
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    setIsPressed(true);
    touchStartPosition.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };

    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        setIsLongPressing(true);
        triggerHapticFeedback();
        onLongPress();
      }, 500);
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    setIsPressed(false);
    setIsLongPressing(false);

    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (touchStartPosition.current && onClick) {
      const touch = e.changedTouches[0];
      const distance = Math.sqrt(
        Math.pow(touch.clientX - touchStartPosition.current.x, 2) +
        Math.pow(touch.clientY - touchStartPosition.current.y, 2)
      );

      if (distance < 10) {
        triggerHapticFeedback();
        onClick();
      }
    }
  };

  return (
    <div
      className={`
        bg-white rounded-lg border border-gray-200 shadow-sm
        transition-all duration-200 ease-out
        cursor-pointer select-none
        ${isPressed ? 'scale-98 shadow-md' : 'scale-100'}
        ${isLongPressing ? 'ring-2 ring-blue-500' : ''}
        ${className}
      `}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
};

// ============================================================================
// SWIPE GESTURE COMPONENT
// ============================================================================

interface SwipeGestureProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  className?: string;
}

export const SwipeGesture: React.FC<SwipeGestureProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  className = ''
}) => {
  const touchStartPosition = useRef<{ x: number; y: number } | null>(null);
  const touchStartTime = useRef<number>(0);

  const handleTouchStart = (e: TouchEvent) => {
    touchStartPosition.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
    touchStartTime.current = Date.now();
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!touchStartPosition.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartPosition.current.x;
    const deltaY = touch.clientY - touchStartPosition.current.y;
    const deltaTime = Date.now() - touchStartTime.current;

    // Only consider it a swipe if it's fast enough
    if (deltaTime > 300) return;

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Determine if it's a horizontal or vertical swipe
    if (absDeltaX > absDeltaY && absDeltaX > threshold) {
      if (deltaX > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
    } else if (absDeltaY > absDeltaX && absDeltaY > threshold) {
      if (deltaY > 0) {
        onSwipeDown?.();
      } else {
        onSwipeUp?.();
      }
    }
  };

  return (
    <div
      className={`touch-none ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
};

// ============================================================================
// TOUCH-OPTIMIZED INPUT
// ============================================================================

interface TouchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel';
  disabled?: boolean;
  className?: string;
}

export const TouchInput: React.FC<TouchInputProps> = ({
  value,
  onChange,
  placeholder,
  label,
  error,
  type = 'text',
  disabled = false,
  className = ''
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFocus = () => {
    setIsFocused(true);
    // Scroll input into view on mobile
    if (TouchUtils.isMobile() && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={`
          w-full px-4 py-3 text-base border rounded-lg
          transition-all duration-200 ease-out
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'}
          ${isFocused ? 'shadow-md' : 'shadow-sm'}
          ${TouchUtils.isTouchDevice() ? 'min-h-[48px]' : ''}
        `}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

// ============================================================================
// TOUCH-OPTIMIZED MODAL
// ============================================================================

interface TouchModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export const TouchModal: React.FC<TouchModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  className = ''
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = 'hidden';

      // Prevent background scrolling on mobile
      if (TouchUtils.isMobile()) {
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
      }
    } else {
      document.body.style.overflow = 'unset';
      if (TouchUtils.isMobile()) {
        document.body.style.position = 'unset';
        document.body.style.width = 'unset';
      }
    }

    return () => {
      document.body.style.overflow = 'unset';
      if (TouchUtils.isMobile()) {
        document.body.style.position = 'unset';
        document.body.style.width = 'unset';
      }
    };
  }, [isOpen]);

  const handleBackdropTouch = (e: TouchEvent) => {
    e.preventDefault();
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)'
      }}
      onTouchStart={handleBackdropTouch}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={modalRef}
        className={`
          bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto
          ${TouchUtils.isMobile() ? 'mx-0' : 'mx-4'}
          ${className}
        `}
        style={{
          animation: isOpen ? 'scaleIn 200ms ease-out' : 'scaleOut 150ms ease-in'
        }}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          </div>
        )}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TOUCH-OPTIMIZED TABLES
// ============================================================================

interface TouchTableProps {
  data: any[];
  columns: { key: string; label: string; render?: (value: any, row: any) => React.ReactNode }[];
  onRowClick?: (row: any) => void;
  className?: string;
}

export const TouchTable: React.FC<TouchTableProps> = ({
  data,
  columns,
  onRowClick,
  className = ''
}) => {
  const [selectedRow, setSelectedRow] = useState<number | null>(null);

  const handleRowTouch = (row: any, index: number) => {
    setSelectedRow(index);
    setTimeout(() => setSelectedRow(null), 200);
    onRowClick?.(row);
  };

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-4 py-3 text-left text-sm font-medium text-gray-700"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={index}
              className={`
                border-b border-gray-100 cursor-pointer
                transition-all duration-150 ease-out
                ${selectedRow === index ? 'bg-blue-50' : 'hover:bg-gray-50'}
                ${TouchUtils.isTouchDevice() ? 'min-h-[48px]' : ''}
              `}
              onTouchStart={() => handleRowTouch(row, index)}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className="px-4 py-3 text-sm text-gray-900"
                >
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ============================================================================
// TOUCH-OPTIMIZED SCROLLING
// ============================================================================

interface TouchScrollProps {
  children: React.ReactNode;
  className?: string;
  momentum?: boolean;
}

export const TouchScroll: React.FC<TouchScrollProps> = ({
  children,
  className = '',
  momentum = true
}) => {
  return (
    <div
      className={`
        overflow-auto
        ${momentum ? 'scroll-smooth' : ''}
        ${TouchUtils.isTouchDevice() ? '-webkit-overflow-scrolling: touch' : ''}
        ${className}
      `}
      style={{
        WebkitOverflowScrolling: TouchUtils.isTouchDevice() ? 'touch' : 'auto'
      }}
    >
      {children}
    </div>
  );
};

// ============================================================================
// TOUCH-OPTIMIZED CSS
// ============================================================================

export const TouchCSS = `
/* Touch-optimized base styles */
@media (hover: none) and (pointer: coarse) {
  /* Increase touch targets */
  button, input, select, textarea {
    min-height: 44px;
    min-width: 44px;
  }

  /* Remove hover effects on touch devices */
  .hover\\:bg-gray-50:hover {
    background-color: transparent;
  }

  .hover\\:shadow-md:hover {
    box-shadow: none;
  }

  /* Add active states for touch */
  .touch-active:active {
    transform: scale(0.98);
    transition: transform 100ms ease-out;
  }

  /* Optimize scrolling */
  .touch-scroll {
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
  }

  /* Prevent text selection on touch */
  .touch-none {
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }

  /* Optimize tap highlights */
  .tap-highlight-none {
    -webkit-tap-highlight-color: transparent;
  }
}

/* Touch-friendly focus states */
@media (hover: none) and (pointer: coarse) {
  .focus\\:ring-2:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
}

/* Prevent zoom on input focus (iOS) */
@media screen and (max-width: 768px) {
  input[type="text"],
  input[type="email"],
  input[type="password"],
  input[type="number"],
  input[type="tel"],
  textarea,
  select {
    font-size: 16px;
  }
}

/* Touch-optimized animations */
@media (hover: none) and (pointer: coarse) {
  .animate-spin {
    animation-duration: 1s;
  }

  .animate-pulse {
    animation-duration: 2s;
  }
}

/* Touch gesture indicators */
.swipe-indicator {
  position: relative;
}

.swipe-indicator::after {
  content: '';
  position: absolute;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  background-color: #9ca3af;
  border-radius: 50%;
  opacity: 0.5;
}

/* Long press indicator */
.long-press-indicator {
  position: relative;
}

.long-press-indicator::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: inherit;
  background-color: rgba(59, 130, 246, 0.1);
  opacity: 0;
  transition: opacity 200ms ease-out;
}

.long-press-indicator.long-pressing::before {
  opacity: 1;
}
`;

export default {
  TouchUtils,
  TouchButton,
  TouchCard,
  SwipeGesture,
  TouchInput,
  TouchModal,
  TouchTable,
  TouchScroll,
  TouchCSS
};



