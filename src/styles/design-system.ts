// ============================================================================
// DESIGN SYSTEM - Zoho Books Inspired
// Professional, Clean, Minimal
// ============================================================================

export const DesignSystem = {
  // ============================================================================
  // COLOR PALETTE - Minimal & Professional
  // ============================================================================
  colors: {
    // Primary - Brand color (minimal use)
    primary: {
      50: '#F0F9FF',
      100: '#E0F2FE',
      500: '#0EA5E9',  // Primary brand color
      600: '#0284C7',  // Hover state
      700: '#0369A1',  // Active state
    },

    // Neutrals - Main UI colors
    neutral: {
      0: '#FFFFFF',    // Pure white
      50: '#FAFAFA',   // Background
      100: '#F5F5F5',  // Cards, secondary backgrounds
      200: '#E5E5E5',  // Borders, dividers
      300: '#D4D4D4',  // Disabled text
      400: '#A3A3A3',  // Placeholder text
      500: '#737373',  // Secondary text
      600: '#525252',  // Body text
      700: '#404040',  // Headings
      800: '#262626',  // Primary text
      900: '#171717',  // Strong emphasis
    },

    // Semantic colors - Used sparingly
    success: {
      50: '#F0FDF4',
      500: '#22C55E',
      600: '#16A34A',
    },
    warning: {
      50: '#FFFBEB',
      500: '#F59E0B',
      600: '#D97706',
    },
    error: {
      50: '#FEF2F2',
      500: '#EF4444',
      600: '#DC2626',
    },
    info: {
      50: '#EFF6FF',
      500: '#3B82F6',
      600: '#2563EB',
    },
  },

  // ============================================================================
  // TYPOGRAPHY - Clean & Readable
  // ============================================================================
  typography: {
    fonts: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace',
    },

    sizes: {
      xs: '0.75rem',    // 12px - Labels
      sm: '0.875rem',   // 14px - Secondary text
      base: '0.9375rem', // 15px - Body text
      lg: '1rem',       // 16px - Headings
      xl: '1.125rem',   // 18px - Page titles
      '2xl': '1.25rem', // 20px - Section headers
      '3xl': '1.5rem',  // 24px - Main headings
    },

    weights: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },

  // ============================================================================
  // SPACING - Consistent & Predictable
  // ============================================================================
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '0.75rem',   // 12px
    lg: '1rem',      // 16px
    xl: '1.5rem',    // 24px
    '2xl': '2rem',   // 32px
    '3xl': '3rem',   // 48px
  },

  // ============================================================================
  // BORDERS & RADIUS - Subtle & Clean
  // ============================================================================
  borders: {
    width: '1px',
    color: '#E5E5E5', // neutral-200
    radius: {
      none: '0',
      sm: '0.25rem',   // 4px
      md: '0.375rem',  // 6px
      lg: '0.5rem',    // 8px
      full: '9999px',
    },
  },

  // ============================================================================
  // SHADOWS - Minimal & Subtle
  // ============================================================================
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    lg: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  },

  // ============================================================================
  // LAYOUT - Structure & Organization
  // ============================================================================
  layout: {
    sidebar: {
      width: '240px',
      collapsedWidth: '64px',
    },
    header: {
      height: '64px',
    },
    content: {
      maxWidth: '1440px',
      padding: '24px',
    },
  },
};

// ============================================================================
// COMPONENT CLASSES - Reusable Tailwind Classes
// ============================================================================

export const ComponentClasses = {
  // Cards
  card: 'bg-white border border-neutral-200 rounded-lg shadow-sm',
  cardHeader: 'px-6 py-4 border-b border-neutral-200',
  cardBody: 'px-6 py-4',

  // Buttons
  buttonPrimary: 'px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-md hover:bg-primary-600 transition-colors',
  buttonSecondary: 'px-4 py-2 bg-white text-neutral-700 text-sm font-medium border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors',
  buttonText: 'px-4 py-2 text-neutral-700 text-sm font-medium hover:bg-neutral-100 rounded-md transition-colors',

  // Inputs
  input: 'px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
  select: 'px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',

  // Tables
  table: 'w-full border-collapse',
  tableHeader: 'bg-neutral-50 border-b border-neutral-200',
  tableHeaderCell: 'px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider',
  tableRow: 'border-b border-neutral-200 hover:bg-neutral-50 transition-colors',
  tableCell: 'px-6 py-4 text-sm text-neutral-800',

  // Tabs
  tabList: 'flex border-b border-neutral-200',
  tab: 'px-6 py-3 text-sm font-medium text-neutral-600 border-b-2 border-transparent hover:text-neutral-800 hover:border-neutral-300 transition-colors',
  tabActive: 'px-6 py-3 text-sm font-medium text-primary-600 border-b-2 border-primary-500',

  // Badges
  badgeSuccess: 'px-2 py-1 text-xs font-medium text-success-600 bg-success-50 rounded-full',
  badgeWarning: 'px-2 py-1 text-xs font-medium text-warning-600 bg-warning-50 rounded-full',
  badgeError: 'px-2 py-1 text-xs font-medium text-error-600 bg-error-50 rounded-full',
  badgeNeutral: 'px-2 py-1 text-xs font-medium text-neutral-600 bg-neutral-100 rounded-full',

  // Page layout
  pageHeader: 'mb-6',
  pageTitle: 'text-2xl font-semibold text-neutral-900',
  pageSubtitle: 'text-sm text-neutral-600 mt-1',

  // Section
  section: 'mb-8',
  sectionHeader: 'mb-4',
  sectionTitle: 'text-lg font-semibold text-neutral-800',
};

// ============================================================================
// USAGE GUIDELINES
// ============================================================================

export const DesignGuidelines = {
  colors: {
    usage: 'Use neutral colors for 90% of the UI. Reserve primary color for key actions only.',
    donts: [
      'Don\'t use multiple bright colors',
      'Don\'t use gradients except for specific features',
      'Don\'t use colored backgrounds for cards',
    ],
    dos: [
      'Use white/neutral-100 for backgrounds',
      'Use neutral-800/900 for text',
      'Use primary-500 only for CTA buttons',
      'Use semantic colors (success/error) sparingly',
    ],
  },

  spacing: {
    usage: 'Use consistent spacing multiples of 4px (0.25rem)',
    pattern: 'sm (8px) → md (12px) → lg (16px) → xl (24px) → 2xl (32px)',
  },

  typography: {
    hierarchy: 'Establish clear hierarchy through size and weight, not color',
    readability: 'Maintain 15-16px base font size for body text',
  },

  layout: {
    structure: 'Use whitespace generously. Don\'t cram content.',
    grid: 'Align to 8px grid for visual consistency',
  },
};
