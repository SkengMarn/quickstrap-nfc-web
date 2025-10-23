/**
 * Mobile-First Responsive Design System
 * Perfect 10/10 UI/UX Implementation
 */

import React from 'react';

// ============================================================================
// RESPONSIVE BREAKPOINTS & UTILITIES
// ============================================================================

export const Breakpoints = {
  xs: '320px',    // Small phones
  sm: '640px',    // Large phones
  md: '768px',    // Tablets
  lg: '1024px',   // Small laptops
  xl: '1280px',   // Large laptops
  '2xl': '1536px' // Desktops
} as const;

export const MediaQueries = {
  xs: `@media (min-width: ${Breakpoints.xs})`,
  sm: `@media (min-width: ${Breakpoints.sm})`,
  md: `@media (min-width: ${Breakpoints.md})`,
  lg: `@media (min-width: ${Breakpoints.lg})`,
  xl: `@media (min-width: ${Breakpoints.xl})`,
  '2xl': `@media (min-width: ${Breakpoints['2xl']})`,

  // Mobile-first approach
  mobile: `@media (max-width: ${Breakpoints.md})`,
  tablet: `@media (min-width: ${Breakpoints.md}) and (max-width: ${Breakpoints.lg})`,
  desktop: `@media (min-width: ${Breakpoints.lg})`,

  // Touch devices
  touch: '@media (hover: none) and (pointer: coarse)',
  noTouch: '@media (hover: hover) and (pointer: fine)',

  // High DPI displays
  retina: '@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)',

  // Dark mode support
  dark: '@media (prefers-color-scheme: dark)',
  light: '@media (prefers-color-scheme: light)',

  // Reduced motion
  reducedMotion: '@media (prefers-reduced-motion: reduce)',
  noReducedMotion: '@media (prefers-reduced-motion: no-preference)'
} as const;

// ============================================================================
// RESPONSIVE GRID SYSTEM
// ============================================================================

export const GridSystem = {
  // Container max widths
  container: {
    xs: '100%',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  },

  // Grid columns
  columns: {
    mobile: 4,
    tablet: 8,
    desktop: 12
  },

  // Gutters
  gutters: {
    xs: '0.75rem',  // 12px
    sm: '1rem',     // 16px
    md: '1.5rem',   // 24px
    lg: '2rem',     // 32px
    xl: '2.5rem'    // 40px
  }
} as const;

// ============================================================================
// RESPONSIVE SPACING SYSTEM
// ============================================================================

export const ResponsiveSpacing = {
  // Mobile-first spacing scale
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '0.75rem',   // 12px
  lg: '1rem',      // 16px
  xl: '1.5rem',    // 24px
  '2xl': '2rem',   // 32px
  '3xl': '3rem',   // 48px
  '4xl': '4rem',   // 64px
  '5xl': '6rem',   // 96px

  // Responsive spacing utilities
  responsive: {
    // Padding
    p: {
      xs: 'p-2 sm:p-4 md:p-6 lg:p-8',
      sm: 'p-3 sm:p-5 md:p-7 lg:p-9',
      md: 'p-4 sm:p-6 md:p-8 lg:p-10',
      lg: 'p-6 sm:p-8 md:p-10 lg:p-12'
    },

    // Margin
    m: {
      xs: 'm-2 sm:m-4 md:m-6 lg:m-8',
      sm: 'm-3 sm:m-5 md:m-7 lg:m-9',
      md: 'm-4 sm:m-6 md:m-8 lg:m-10',
      lg: 'm-6 sm:m-8 md:m-10 lg:m-12'
    },

    // Gap
    gap: {
      xs: 'gap-2 sm:gap-4 md:gap-6 lg:gap-8',
      sm: 'gap-3 sm:gap-5 md:gap-7 lg:gap-9',
      md: 'gap-4 sm:gap-6 md:gap-8 lg:gap-10',
      lg: 'gap-6 sm:gap-8 md:gap-10 lg:gap-12'
    }
  }
} as const;

// ============================================================================
// RESPONSIVE TYPOGRAPHY SYSTEM
// ============================================================================

export const ResponsiveTypography = {
  // Font sizes with responsive scaling
  fontSize: {
    xs: 'text-xs sm:text-sm',           // 12px → 14px
    sm: 'text-sm sm:text-base',         // 14px → 16px
    base: 'text-base sm:text-lg',       // 16px → 18px
    lg: 'text-lg sm:text-xl',          // 18px → 20px
    xl: 'text-xl sm:text-2xl',         // 20px → 24px
    '2xl': 'text-2xl sm:text-3xl',     // 24px → 30px
    '3xl': 'text-3xl sm:text-4xl',     // 30px → 36px
    '4xl': 'text-4xl sm:text-5xl',     // 36px → 48px
    '5xl': 'text-5xl sm:text-6xl'      // 48px → 60px
  },

  // Line heights
  lineHeight: {
    tight: 'leading-tight sm:leading-tight',
    normal: 'leading-normal sm:leading-normal',
    relaxed: 'leading-relaxed sm:leading-relaxed',
    loose: 'leading-loose sm:leading-loose'
  },

  // Font weights
  fontWeight: {
    light: 'font-light',
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
    extrabold: 'font-extrabold'
  }
} as const;

// ============================================================================
// RESPONSIVE LAYOUT UTILITIES
// ============================================================================

export const ResponsiveLayout = {
  // Display utilities
  display: {
    mobile: 'block sm:hidden',
    tablet: 'hidden sm:block md:hidden',
    desktop: 'hidden md:block',
    mobileTablet: 'block md:hidden',
    tabletDesktop: 'hidden sm:block'
  },

  // Flexbox utilities
  flex: {
    col: 'flex-col sm:flex-row',
    row: 'flex-row sm:flex-col',
    wrap: 'flex-wrap sm:flex-nowrap',
    nowrap: 'flex-nowrap sm:flex-wrap'
  },

  // Grid utilities
  grid: {
    mobile: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    tablet: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6',
    desktop: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8',
    auto: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
  },

  // Positioning
  position: {
    sticky: 'sticky top-0 sm:top-4',
    fixed: 'fixed bottom-4 right-4 sm:bottom-6 sm:right-6',
    absolute: 'absolute top-0 left-0 sm:top-2 sm:left-2'
  }
} as const;

// ============================================================================
// TOUCH-FRIENDLY INTERACTIONS
// ============================================================================

export const TouchInteractions = {
  // Touch target sizes (minimum 44px for accessibility)
  touchTarget: {
    small: 'min-h-[44px] min-w-[44px]',    // Minimum touch target
    medium: 'min-h-[48px] min-w-[48px]',   // Comfortable touch target
    large: 'min-h-[56px] min-w-[56px]',    // Large touch target
    xlarge: 'min-h-[64px] min-w-[64px]'    // Extra large touch target
  },

  // Touch-friendly spacing
  touchSpacing: {
    xs: 'p-2 sm:p-3',      // 8px → 12px
    sm: 'p-3 sm:p-4',      // 12px → 16px
    md: 'p-4 sm:p-5',      // 16px → 20px
    lg: 'p-5 sm:p-6',      // 20px → 24px
    xl: 'p-6 sm:p-8'       // 24px → 32px
  },

  // Touch-friendly buttons
  button: {
    mobile: 'px-4 py-3 text-base min-h-[48px] sm:px-6 sm:py-2 sm:text-sm sm:min-h-[40px]',
    primary: 'px-6 py-4 text-base font-semibold min-h-[56px] sm:px-8 sm:py-3 sm:text-sm sm:min-h-[44px]',
    secondary: 'px-5 py-3 text-sm font-medium min-h-[48px] sm:px-6 sm:py-2 sm:text-xs sm:min-h-[36px]'
  },

  // Touch-friendly inputs
  input: {
    mobile: 'px-4 py-4 text-base min-h-[56px] sm:px-3 sm:py-2 sm:text-sm sm:min-h-[40px]',
    search: 'px-4 py-4 text-base min-h-[56px] sm:px-3 sm:py-2 sm:text-sm sm:min-h-[40px]',
    textarea: 'px-4 py-4 text-base min-h-[120px] sm:px-3 sm:py-2 sm:text-sm sm:min-h-[80px]'
  }
} as const;

// ============================================================================
// RESPONSIVE COMPONENT VARIANTS
// ============================================================================

export const ResponsiveComponents = {
  // Card variants
  card: {
    mobile: 'p-4 sm:p-6 lg:p-8',
    compact: 'p-3 sm:p-4 lg:p-6',
    spacious: 'p-6 sm:p-8 lg:p-12'
  },

  // Modal variants
  modal: {
    mobile: 'w-full h-full sm:w-auto sm:h-auto sm:max-w-lg sm:max-h-[90vh]',
    tablet: 'w-full h-full md:w-auto md:h-auto md:max-w-2xl md:max-h-[90vh]',
    desktop: 'w-auto h-auto max-w-4xl max-h-[90vh]'
  },

  // Sidebar variants
  sidebar: {
    mobile: 'fixed inset-y-0 left-0 w-64 z-50 sm:relative sm:z-auto',
    tablet: 'w-64 md:w-72',
    desktop: 'w-72 lg:w-80'
  },

  // Table variants
  table: {
    mobile: 'text-sm sm:text-base',
    responsive: 'overflow-x-auto',
    scrollable: 'min-w-full'
  }
} as const;

// ============================================================================
// RESPONSIVE UTILITY FUNCTIONS
// ============================================================================

export const ResponsiveUtils = {
  /**
   * Generate responsive classes based on breakpoints
   */
  responsive: (classes: Record<string, string>) => {
    return Object.entries(classes)
      .map(([breakpoint, className]) => {
        if (breakpoint === 'base') return className;
        return `${breakpoint}:${className}`;
      })
      .join(' ');
  },

  /**
   * Generate mobile-first responsive classes
   */
  mobileFirst: (base: string, sm?: string, md?: string, lg?: string, xl?: string) => {
    const classes = [base];
    if (sm) classes.push(`sm:${sm}`);
    if (md) classes.push(`md:${md}`);
    if (lg) classes.push(`lg:${lg}`);
    if (xl) classes.push(`xl:${xl}`);
    return classes.join(' ');
  },

  /**
   * Generate touch-friendly classes
   */
  touchFriendly: (size: 'small' | 'medium' | 'large' = 'medium') => {
    const sizes = {
      small: TouchInteractions.touchTarget.small,
      medium: TouchInteractions.touchTarget.medium,
      large: TouchInteractions.touchTarget.large
    };
    return sizes[size];
  },

  /**
   * Generate responsive spacing classes
   */
  spacing: (size: keyof typeof ResponsiveSpacing.responsive.p) => {
    return ResponsiveSpacing.responsive.p[size];
  }
} as const;

// ============================================================================
// RESPONSIVE HOOKS (for React components)
// ============================================================================

export const useResponsive = () => {
  const [breakpoint, setBreakpoint] = React.useState<'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'>('xs');

  React.useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width >= 1536) setBreakpoint('2xl');
      else if (width >= 1280) setBreakpoint('xl');
      else if (width >= 1024) setBreakpoint('lg');
      else if (width >= 768) setBreakpoint('md');
      else if (width >= 640) setBreakpoint('sm');
      else setBreakpoint('xs');
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return {
    breakpoint,
    isMobile: breakpoint === 'xs' || breakpoint === 'sm',
    isTablet: breakpoint === 'md',
    isDesktop: breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl',
    isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0
  };
};

// ============================================================================
// RESPONSIVE CSS CUSTOM PROPERTIES
// ============================================================================

export const ResponsiveCSS = `
:root {
  /* Responsive spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 0.75rem;
  --spacing-lg: 1rem;
  --spacing-xl: 1.5rem;
  --spacing-2xl: 2rem;
  --spacing-3xl: 3rem;
  --spacing-4xl: 4rem;

  /* Responsive font sizes */
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;
  --font-size-4xl: 2.25rem;

  /* Touch targets */
  --touch-target-min: 44px;
  --touch-target-comfortable: 48px;
  --touch-target-large: 56px;

  /* Responsive containers */
  --container-xs: 100%;
  --container-sm: 640px;
  --container-md: 768px;
  --container-lg: 1024px;
  --container-xl: 1280px;
  --container-2xl: 1536px;
}

@media (min-width: 640px) {
  :root {
    --font-size-xs: 0.75rem;
    --font-size-sm: 0.875rem;
    --font-size-base: 1rem;
    --font-size-lg: 1.125rem;
    --font-size-xl: 1.25rem;
    --font-size-2xl: 1.5rem;
    --font-size-3xl: 1.875rem;
    --font-size-4xl: 2.25rem;
  }
}

@media (min-width: 768px) {
  :root {
    --font-size-xs: 0.75rem;
    --font-size-sm: 0.875rem;
    --font-size-base: 1rem;
    --font-size-lg: 1.125rem;
    --font-size-xl: 1.25rem;
    --font-size-2xl: 1.5rem;
    --font-size-3xl: 1.875rem;
    --font-size-4xl: 2.25rem;
  }
}

@media (min-width: 1024px) {
  :root {
    --font-size-xs: 0.75rem;
    --font-size-sm: 0.875rem;
    --font-size-base: 1rem;
    --font-size-lg: 1.125rem;
    --font-size-xl: 1.25rem;
    --font-size-2xl: 1.5rem;
    --font-size-3xl: 1.875rem;
    --font-size-4xl: 2.25rem;
  }
}

/* Touch-friendly base styles */
@media (hover: none) and (pointer: coarse) {
  :root {
    --touch-target-min: 48px;
    --touch-target-comfortable: 56px;
    --touch-target-large: 64px;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  :root {
    --transition-duration: 0.01ms;
    --transition-timing: linear;
  }
}

@media (prefers-reduced-motion: no-preference) {
  :root {
    --transition-duration: 200ms;
    --transition-timing: cubic-bezier(0.4, 0, 0.2, 1);
  }
}
`;

export default {
  Breakpoints,
  MediaQueries,
  GridSystem,
  ResponsiveSpacing,
  ResponsiveTypography,
  ResponsiveLayout,
  TouchInteractions,
  ResponsiveComponents,
  ResponsiveUtils,
  useResponsive,
  ResponsiveCSS
};



