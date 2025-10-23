/**
 * Animation & Micro-Interactions System
 * Perfect 10/10 UI/UX Implementation
 */

import * as React from 'react';

// ============================================================================
// ANIMATION TIMING & EASING
// ============================================================================

export const AnimationTiming = {
  // Duration scale
  duration: {
    instant: '0ms',
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
    slowest: '700ms'
  },

  // Easing functions
  easing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',

    // Custom cubic-bezier curves
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    gentle: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
  },

  // Stagger delays
  stagger: {
    xs: '50ms',
    sm: '100ms',
    md: '150ms',
    lg: '200ms',
    xl: '250ms'
  }
} as const;

// ============================================================================
// ANIMATION PRESETS
// ============================================================================

export const AnimationPresets = {
  // Fade animations
  fade: {
    in: {
      from: { opacity: 0 },
      to: { opacity: 1 },
      duration: AnimationTiming.duration.normal,
      easing: AnimationTiming.easing.smooth
    },
    out: {
      from: { opacity: 1 },
      to: { opacity: 0 },
      duration: AnimationTiming.duration.fast,
      easing: AnimationTiming.easing.smooth
    },
    inUp: {
      from: { opacity: 0, transform: 'translateY(20px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
      duration: AnimationTiming.duration.normal,
      easing: AnimationTiming.easing.smooth
    },
    inDown: {
      from: { opacity: 0, transform: 'translateY(-20px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
      duration: AnimationTiming.duration.normal,
      easing: AnimationTiming.easing.smooth
    },
    inLeft: {
      from: { opacity: 0, transform: 'translateX(-20px)' },
      to: { opacity: 1, transform: 'translateX(0)' },
      duration: AnimationTiming.duration.normal,
      easing: AnimationTiming.easing.smooth
    },
    inRight: {
      from: { opacity: 0, transform: 'translateX(20px)' },
      to: { opacity: 1, transform: 'translateX(0)' },
      duration: AnimationTiming.duration.normal,
      easing: AnimationTiming.easing.smooth
    }
  },

  // Scale animations
  scale: {
    in: {
      from: { opacity: 0, transform: 'scale(0.9)' },
      to: { opacity: 1, transform: 'scale(1)' },
      duration: AnimationTiming.duration.normal,
      easing: AnimationTiming.easing.bounce
    },
    out: {
      from: { opacity: 1, transform: 'scale(1)' },
      to: { opacity: 0, transform: 'scale(0.9)' },
      duration: AnimationTiming.duration.fast,
      easing: AnimationTiming.easing.sharp
    },
    bounce: {
      from: { opacity: 0, transform: 'scale(0.3)' },
      to: { opacity: 1, transform: 'scale(1)' },
      duration: AnimationTiming.duration.slower,
      easing: AnimationTiming.easing.bounce
    }
  },

  // Slide animations
  slide: {
    up: {
      from: { transform: 'translateY(100%)' },
      to: { transform: 'translateY(0)' },
      duration: AnimationTiming.duration.normal,
      easing: AnimationTiming.easing.smooth
    },
    down: {
      from: { transform: 'translateY(-100%)' },
      to: { transform: 'translateY(0)' },
      duration: AnimationTiming.duration.normal,
      easing: AnimationTiming.easing.smooth
    },
    left: {
      from: { transform: 'translateX(-100%)' },
      to: { transform: 'translateX(0)' },
      duration: AnimationTiming.duration.normal,
      easing: AnimationTiming.easing.smooth
    },
    right: {
      from: { transform: 'translateX(100%)' },
      to: { transform: 'translateX(0)' },
      duration: AnimationTiming.duration.normal,
      easing: AnimationTiming.easing.smooth
    }
  },

  // Rotation animations
  rotate: {
    in: {
      from: { opacity: 0, transform: 'rotate(-180deg) scale(0.8)' },
      to: { opacity: 1, transform: 'rotate(0deg) scale(1)' },
      duration: AnimationTiming.duration.slower,
      easing: AnimationTiming.easing.elastic
    },
    spin: {
      from: { transform: 'rotate(0deg)' },
      to: { transform: 'rotate(360deg)' },
      duration: '1000ms',
      easing: AnimationTiming.easing.linear,
      iterationCount: 'infinite'
    }
  },

  // Special effects
  special: {
    shimmer: {
      from: { backgroundPosition: '-200% 0' },
      to: { backgroundPosition: '200% 0' },
      duration: '2000ms',
      easing: AnimationTiming.easing.linear,
      iterationCount: 'infinite'
    },
    pulse: {
      from: { opacity: 1 },
      to: { opacity: 0.5 },
      duration: '1000ms',
      easing: AnimationTiming.easing.easeInOut,
      iterationCount: 'infinite',
      direction: 'alternate'
    },
    wiggle: {
      from: { transform: 'rotate(0deg)' },
      to: { transform: 'rotate(3deg)' },
      duration: '100ms',
      easing: AnimationTiming.easing.easeInOut,
      iterationCount: 'infinite',
      direction: 'alternate'
    }
  }
} as const;

// ============================================================================
// MICRO-INTERACTIONS
// ============================================================================

export const MicroInteractions = {
  // Button interactions
  button: {
    hover: {
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      duration: AnimationTiming.duration.fast,
      easing: AnimationTiming.easing.smooth
    },
    active: {
      transform: 'translateY(0)',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      duration: AnimationTiming.duration.instant,
      easing: AnimationTiming.easing.sharp
    },
    focus: {
      outline: '2px solid #3b82f6',
      outlineOffset: '2px',
      duration: AnimationTiming.duration.fast,
      easing: AnimationTiming.easing.smooth
    }
  },

  // Card interactions
  card: {
    hover: {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
      duration: AnimationTiming.duration.normal,
      easing: AnimationTiming.easing.smooth
    },
    tap: {
      transform: 'scale(0.98)',
      duration: AnimationTiming.duration.fast,
      easing: AnimationTiming.easing.sharp
    }
  },

  // Input interactions
  input: {
    focus: {
      borderColor: '#3b82f6',
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
      duration: AnimationTiming.duration.fast,
      easing: AnimationTiming.easing.smooth
    },
    error: {
      borderColor: '#ef4444',
      boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)',
      duration: AnimationTiming.duration.fast,
      easing: AnimationTiming.easing.smooth
    },
    success: {
      borderColor: '#22c55e',
      boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.1)',
      duration: AnimationTiming.duration.fast,
      easing: AnimationTiming.easing.smooth
    }
  },

  // Modal interactions
  modal: {
    backdrop: {
      from: { opacity: 0 },
      to: { opacity: 1 },
      duration: AnimationTiming.duration.normal,
      easing: AnimationTiming.easing.smooth
    },
    content: {
      from: { opacity: 0, transform: 'scale(0.9) translateY(-20px)' },
      to: { opacity: 1, transform: 'scale(1) translateY(0)' },
      duration: AnimationTiming.duration.normal,
      easing: AnimationTiming.easing.smooth
    }
  },

  // List interactions
  list: {
    itemEnter: {
      from: { opacity: 0, transform: 'translateX(-20px)' },
      to: { opacity: 1, transform: 'translateX(0)' },
      duration: AnimationTiming.duration.normal,
      easing: AnimationTiming.easing.smooth
    },
    itemExit: {
      from: { opacity: 1, transform: 'translateX(0)' },
      to: { opacity: 0, transform: 'translateX(20px)' },
      duration: AnimationTiming.duration.fast,
      easing: AnimationTiming.easing.sharp
    }
  },

  // Loading interactions
  loading: {
    spinner: {
      from: { transform: 'rotate(0deg)' },
      to: { transform: 'rotate(360deg)' },
      duration: '1000ms',
      easing: AnimationTiming.easing.linear,
      iterationCount: 'infinite'
    },
    dots: {
      from: { opacity: 0.3 },
      to: { opacity: 1 },
      duration: '600ms',
      easing: AnimationTiming.easing.easeInOut,
      iterationCount: 'infinite',
      direction: 'alternate'
    }
  }
} as const;

// ============================================================================
// ANIMATION UTILITIES
// ============================================================================

export const AnimationUtils = {
  /**
   * Create CSS animation keyframes
   */
  createKeyframes: (name: string, keyframes: Record<string, any>) => {
    const keyframeString = Object.entries(keyframes)
      .map(([percentage, styles]) => {
        const styleString = Object.entries(styles)
          .map(([property, value]) => `${property}: ${value}`)
          .join('; ');
        return `${percentage} { ${styleString} }`;
      })
      .join(' ');

    return `@keyframes ${name} { ${keyframeString} }`;
  },

  /**
   * Generate CSS animation property
   */
  createAnimation: (name: string, options: {
    duration?: string;
    easing?: string;
    delay?: string;
    iterationCount?: string | number;
    direction?: string;
    fillMode?: string;
  } = {}) => {
    const {
      duration = AnimationTiming.duration.normal,
      easing = AnimationTiming.easing.smooth,
      delay = '0ms',
      iterationCount = '1',
      direction = 'normal',
      fillMode = 'both'
    } = options;

    return `${name} ${duration} ${easing} ${delay} ${iterationCount} ${direction} ${fillMode}`;
  },

  /**
   * Create staggered animation delays
   */
  createStagger: (index: number, staggerDelay: string = AnimationTiming.stagger.sm) => {
    return `${parseInt(staggerDelay) * index}ms`;
  },

  /**
   * Generate transition property
   */
  createTransition: (properties: string[], options: {
    duration?: string;
    easing?: string;
    delay?: string;
  } = {}) => {
    const {
      duration = AnimationTiming.duration.normal,
      easing = AnimationTiming.easing.smooth,
      delay = '0ms'
    } = options;

    return properties
      .map(prop => `${prop} ${duration} ${easing} ${delay}`)
      .join(', ');
  }
} as const;

// ============================================================================
// ANIMATION COMPONENTS
// ============================================================================

interface AnimateProps {
  children: React.ReactNode;
  animation: keyof typeof AnimationPresets | string;
  delay?: number;
  duration?: string;
  easing?: string;
  iterationCount?: string | number;
  direction?: string;
  fillMode?: string;
  trigger?: 'hover' | 'click' | 'focus' | 'mount' | 'inView';
  className?: string;
  style?: React.CSSProperties;
}

export const Animate: React.FC<AnimateProps> = ({
  children,
  animation,
  delay = 0,
  duration,
  easing,
  iterationCount,
  direction,
  fillMode,
  trigger = 'mount',
  className = '',
  style = {}
}) => {
  const [isVisible, setIsVisible] = React.useState(trigger === 'mount');
  const elementRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (trigger === 'mount') {
      setIsVisible(true);
      return undefined; // Explicit return for mount case
    } else if (trigger === 'inView') {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        },
        { threshold: 0.1 }
      );

      if (elementRef.current) {
        observer.observe(elementRef.current);
      }

      return () => observer.disconnect();
    }
    return undefined;
  }, [trigger]);

  const getAnimationStyle = (): React.CSSProperties => {
    // For simple string animations (custom CSS animation names)
    if (typeof animation === 'string') {
      return {
        animationName: animation,
        animationDuration: duration || AnimationTiming.duration.normal,
        animationTimingFunction: easing || AnimationTiming.easing.smooth,
        animationDelay: `${delay}ms`,
        animationIterationCount: iterationCount || '1',
        animationDirection: direction || 'normal',
        animationFillMode: fillMode || 'both'
      };
    }

    // For preset animations, use default timing
    return {
      animationName: animation as string,
      animationDuration: duration || AnimationTiming.duration.normal,
      animationTimingFunction: easing || AnimationTiming.easing.smooth,
      animationDelay: `${delay}ms`,
      animationIterationCount: iterationCount || '1',
      animationDirection: direction || 'normal',
      animationFillMode: fillMode || 'both'
    };
  };

  return (
    <div
      ref={elementRef}
      className={className}
      style={{
        ...style,
        ...(isVisible ? getAnimationStyle() : {})
      }}
    >
      {children}
    </div>
  );
};

// ============================================================================
// STAGGER ANIMATION COMPONENT
// ============================================================================

interface StaggerProps {
  children: React.ReactNode[];
  animation: keyof typeof AnimationPresets | string;
  staggerDelay?: string;
  className?: string;
}

export const Stagger: React.FC<StaggerProps> = ({
  children,
  animation,
  staggerDelay = AnimationTiming.stagger.sm,
  className = ''
}) => {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <Animate
          key={index}
          animation={animation}
          delay={parseInt(staggerDelay) * index}
        >
          {child}
        </Animate>
      ))}
    </div>
  );
};

// ============================================================================
// CSS ANIMATION DEFINITIONS
// ============================================================================

export const AnimationCSS = `
/* Fade animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeInLeft {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes fadeInRight {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

/* Scale animations */
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes scaleOut {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.9); }
}

@keyframes bounceIn {
  from { opacity: 0; transform: scale(0.3); }
  to { opacity: 1; transform: scale(1); }
}

/* Slide animations */
@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

@keyframes slideDown {
  from { transform: translateY(-100%); }
  to { transform: translateY(0); }
}

@keyframes slideLeft {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

@keyframes slideRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

/* Rotation animations */
@keyframes rotateIn {
  from { opacity: 0; transform: rotate(-180deg) scale(0.8); }
  to { opacity: 1; transform: rotate(0deg) scale(1); }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Special effects */
@keyframes shimmer {
  from { background-position: -200% 0; }
  to { background-position: 200% 0; }
}

@keyframes pulse {
  from { opacity: 1; }
  to { opacity: 0.5; }
}

@keyframes wiggle {
  from { transform: rotate(0deg); }
  to { transform: rotate(3deg); }
}

/* Utility classes */
.animate-fade-in { animation: fadeIn 200ms cubic-bezier(0.4, 0, 0.2, 1); }
.animate-fade-out { animation: fadeOut 150ms cubic-bezier(0.4, 0, 0.2, 1); }
.animate-fade-in-up { animation: fadeInUp 200ms cubic-bezier(0.4, 0, 0.2, 1); }
.animate-fade-in-down { animation: fadeInDown 200ms cubic-bezier(0.4, 0, 0.2, 1); }
.animate-fade-in-left { animation: fadeInLeft 200ms cubic-bezier(0.4, 0, 0.2, 1); }
.animate-fade-in-right { animation: fadeInRight 200ms cubic-bezier(0.4, 0, 0.2, 1); }

.animate-scale-in { animation: scaleIn 200ms cubic-bezier(0.68, -0.55, 0.265, 1.55); }
.animate-scale-out { animation: scaleOut 150ms cubic-bezier(0.4, 0, 0.6, 1); }
.animate-bounce-in { animation: bounceIn 500ms cubic-bezier(0.68, -0.55, 0.265, 1.55); }

.animate-slide-up { animation: slideUp 200ms cubic-bezier(0.4, 0, 0.2, 1); }
.animate-slide-down { animation: slideDown 200ms cubic-bezier(0.4, 0, 0.2, 1); }
.animate-slide-left { animation: slideLeft 200ms cubic-bezier(0.4, 0, 0.2, 1); }
.animate-slide-right { animation: slideRight 200ms cubic-bezier(0.4, 0, 0.2, 1); }

.animate-rotate-in { animation: rotateIn 500ms cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.animate-spin { animation: spin 1000ms linear infinite; }

.animate-shimmer { animation: shimmer 2000ms linear infinite; }
.animate-pulse { animation: pulse 1000ms ease-in-out infinite alternate; }
.animate-wiggle { animation: wiggle 100ms ease-in-out infinite alternate; }

/* Micro-interactions */
.hover-lift {
  transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.hover-lift:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.hover-lift:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .animate-fade-in,
  .animate-fade-out,
  .animate-fade-in-up,
  .animate-fade-in-down,
  .animate-fade-in-left,
  .animate-fade-in-right,
  .animate-scale-in,
  .animate-scale-out,
  .animate-bounce-in,
  .animate-slide-up,
  .animate-slide-down,
  .animate-slide-left,
  .animate-slide-right,
  .animate-rotate-in,
  .animate-spin,
  .animate-shimmer,
  .animate-pulse,
  .animate-wiggle {
    animation: none;
  }

  .hover-lift,
  .hover-scale,
  .focus-ring {
    transition: none;
  }
}
`;

export default {
  AnimationTiming,
  AnimationPresets,
  MicroInteractions,
  AnimationUtils,
  Animate,
  Stagger,
  AnimationCSS
};
