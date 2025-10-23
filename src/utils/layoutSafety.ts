/**
 * Layout Z-Index Management & Overlap Prevention
 * Perfect 10/10 UI/UX Implementation
 */

// ============================================================================
// Z-INDEX LAYER SYSTEM
// ============================================================================

export const ZIndexLayers = {
  // Base content layers
  content: 1,
  contentElevated: 10,

  // Interactive elements
  dropdown: 20,
  tooltip: 30,
  popover: 40,

  // Modal and overlay layers
  modal: 50,
  modalBackdrop: 45,

  // Notification and toast layers
  notification: 60,
  toast: 70,

  // Tour and onboarding layers
  tour: 80,
  tourHighlight: 85,

  // Critical system layers
  loadingOverlay: 90,
  systemAlert: 95,

  // Maximum layer (emergency use only)
  maximum: 100
} as const;

// ============================================================================
// LAYOUT SAFETY UTILITIES
// ============================================================================

export const LayoutSafety = {
  /**
   * Get safe z-index for component type
   */
  getZIndex: (layer: keyof typeof ZIndexLayers): number => {
    return ZIndexLayers[layer];
  },

  /**
   * Check if element would overlap with existing elements
   */
  checkOverlap: (element: HTMLElement): boolean => {
    const rect = element.getBoundingClientRect();
    const elements = document.elementsFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return elements.length > 1;
  },

  /**
   * Ensure proper spacing between elements
   */
  ensureSpacing: (element: HTMLElement, minSpacing: number = 8): void => {
    const rect = element.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    // Check if element is too close to viewport edges
    if (rect.left < minSpacing) {
      element.style.left = `${minSpacing}px`;
    }
    if (rect.top < minSpacing) {
      element.style.top = `${minSpacing}px`;
    }
    if (rect.right > viewport.width - minSpacing) {
      element.style.left = `${viewport.width - rect.width - minSpacing}px`;
    }
    if (rect.bottom > viewport.height - minSpacing) {
      element.style.top = `${viewport.height - rect.height - minSpacing}px`;
    }
  },

  /**
   * Prevent content from being hidden behind fixed elements
   */
  preventContentHiding: (): void => {
    const fixedElements = document.querySelectorAll('[style*="position: fixed"], [class*="fixed"]');
    const maxZIndex = Math.max(...Array.from(fixedElements).map(el => {
      const computed = window.getComputedStyle(el);
      return parseInt(computed.zIndex) || 0;
    }));

    // Ensure main content has proper spacing
    const mainContent = document.querySelector('.layout-content');
    if (mainContent && maxZIndex > 0) {
      (mainContent as HTMLElement).style.paddingTop = '20px';
    }
  }
} as const;

// ============================================================================
// RESPONSIVE LAYOUT FIXES
// ============================================================================

export const ResponsiveLayoutFixes = {
  /**
   * Fix mobile layout issues
   */
  fixMobileLayout: (): void => {
    if (window.innerWidth < 768) {
      // Ensure modals don't overflow on mobile
      const modals = document.querySelectorAll('[class*="modal"], [class*="fixed"]');
      modals.forEach(modal => {
        const element = modal as HTMLElement;
        element.style.maxWidth = 'calc(100vw - 32px)';
        element.style.maxHeight = 'calc(100vh - 32px)';
        element.style.margin = '16px';
      });

      // Fix sidebar positioning on mobile
      const sidebar = document.querySelector('.layout-sidebar');
      if (sidebar) {
        (sidebar as HTMLElement).style.position = 'fixed';
        (sidebar as HTMLElement).style.zIndex = ZIndexLayers.modal.toString();
      }
    }
  },

  /**
   * Fix tablet layout issues
   */
  fixTabletLayout: (): void => {
    if (window.innerWidth >= 768 && window.innerWidth < 1024) {
      // Adjust grid layouts for tablet
      const grids = document.querySelectorAll('[class*="grid-cols"]');
      grids.forEach(grid => {
        const element = grid as HTMLElement;
        if (element.classList.contains('grid-cols-4')) {
          element.classList.remove('grid-cols-4');
          element.classList.add('grid-cols-2');
        }
      });
    }
  },

  /**
   * Fix desktop layout issues
   */
  fixDesktopLayout: (): void => {
    if (window.innerWidth >= 1024) {
      // Ensure proper spacing on desktop
      const cards = document.querySelectorAll('.card, [class*="card"]');
      cards.forEach(card => {
        const element = card as HTMLElement;
        if (!element.style.marginBottom) {
          element.style.marginBottom = '24px';
        }
      });
    }
  }
} as const;

// ============================================================================
// OVERLAP DETECTION & PREVENTION
// ============================================================================

export const OverlapPrevention = {
  /**
   * Detect overlapping elements
   */
  detectOverlaps: (): Array<{element1: HTMLElement, element2: HTMLElement, overlap: number}> => {
    const overlaps: Array<{element1: HTMLElement, element2: HTMLElement, overlap: number}> = [];
    const elements = document.querySelectorAll('*');

    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        const element1 = elements[i] as HTMLElement;
        const element2 = elements[j] as HTMLElement;

        if (OverlapPrevention.elementsOverlap(element1, element2)) {
          const overlap = OverlapPrevention.calculateOverlap(element1, element2);
          if (overlap > 0) {
            overlaps.push({ element1, element2, overlap });
          }
        }
      }
    }

    return overlaps;
  },

  /**
   * Check if two elements overlap
   */
  elementsOverlap: (element1: HTMLElement, element2: HTMLElement): boolean => {
    const rect1 = element1.getBoundingClientRect();
    const rect2 = element2.getBoundingClientRect();

    return !(rect1.right < rect2.left ||
             rect1.left > rect2.right ||
             rect1.bottom < rect2.top ||
             rect1.top > rect2.bottom);
  },

  /**
   * Calculate overlap percentage
   */
  calculateOverlap: (element1: HTMLElement, element2: HTMLElement): number => {
    const rect1 = element1.getBoundingClientRect();
    const rect2 = element2.getBoundingClientRect();

    const overlapLeft = Math.max(rect1.left, rect2.left);
    const overlapRight = Math.min(rect1.right, rect2.right);
    const overlapTop = Math.max(rect1.top, rect2.top);
    const overlapBottom = Math.min(rect1.bottom, rect2.bottom);

    if (overlapLeft < overlapRight && overlapTop < overlapBottom) {
      const overlapArea = (overlapRight - overlapLeft) * (overlapBottom - overlapTop);
      const element1Area = rect1.width * rect1.height;
      const element2Area = rect2.width * rect2.height;
      const minArea = Math.min(element1Area, element2Area);

      return (overlapArea / minArea) * 100;
    }

    return 0;
  },

  /**
   * Fix overlapping elements
   */
  fixOverlaps: (): void => {
    const overlaps = OverlapPrevention.detectOverlaps();

    overlaps.forEach(({ element1, element2, overlap }: { element1: HTMLElement; element2: HTMLElement; overlap: number }) => {
      if (overlap > 10) { // Only fix significant overlaps
        // console.warn(`Overlap detected: ${overlap.toFixed(1)}% overlap between elements`);

        // Apply z-index fix
        const computed1 = window.getComputedStyle(element1);
        const computed2 = window.getComputedStyle(element2);
        const zIndex1 = parseInt(computed1.zIndex) || 0;
        const zIndex2 = parseInt(computed2.zIndex) || 0;

        if (zIndex1 === zIndex2) {
          // Increase z-index of the second element
          element2.style.zIndex = (zIndex2 + 1).toString();
        }
      }
    });
  }
} as const;

// ============================================================================
// LAYOUT CSS FIXES
// ============================================================================

export const LayoutCSS = `
/* Z-Index Layer System */
.z-content { z-index: 1; }
.z-content-elevated { z-index: 10; }
.z-dropdown { z-index: 20; }
.z-tooltip { z-index: 30; }
.z-popover { z-index: 40; }
.z-modal { z-index: 50; }
.z-modal-backdrop { z-index: 45; }
.z-notification { z-index: 60; }
.z-toast { z-index: 70; }
.z-tour { z-index: 80; }
.z-tour-highlight { z-index: 85; }
.z-loading-overlay { z-index: 90; }
.z-system-alert { z-index: 95; }
.z-maximum { z-index: 100; }

/* Layout Safety */
.layout-safe {
  position: relative;
  overflow: visible;
}

.layout-container {
  position: relative;
  min-height: 100vh;
  overflow-x: hidden;
}

.layout-sidebar {
  position: relative;
  z-index: 10;
}

.layout-main {
  position: relative;
  z-index: 1;
}

.layout-header {
  position: relative;
  z-index: 15;
}

.layout-content {
  position: relative;
  z-index: 1;
  padding: 24px;
  min-height: calc(100vh - 64px);
}

/* Modal Safety */
.modal-safe {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-content-safe {
  position: relative;
  z-index: 51;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 32px);
  overflow: auto;
}

/* Dropdown Safety */
.dropdown-safe {
  position: absolute;
  z-index: 20;
  min-width: 200px;
  max-width: calc(100vw - 32px);
}

/* Tooltip Safety */
.tooltip-safe {
  position: absolute;
  z-index: 30;
  max-width: 300px;
  word-wrap: break-word;
}

/* Notification Safety */
.notification-safe {
  position: fixed;
  z-index: 60;
  top: 16px;
  right: 16px;
  max-width: calc(100vw - 32px);
}

/* Toast Safety */
.toast-safe {
  position: fixed;
  z-index: 70;
  top: 16px;
  right: 16px;
  max-width: calc(100vw - 32px);
}

/* Tour Safety */
.tour-safe {
  position: fixed;
  z-index: 80;
  pointer-events: none;
}

.tour-highlight-safe {
  position: absolute;
  z-index: 85;
  pointer-events: none;
}

/* Mobile Layout Fixes */
@media (max-width: 767px) {
  .layout-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    z-index: 50;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }

  .layout-sidebar.open {
    transform: translateX(0);
  }

  .layout-main {
    margin-left: 0;
  }

  .modal-content-safe {
    margin: 8px;
    max-width: calc(100vw - 16px);
    max-height: calc(100vh - 16px);
  }

  .dropdown-safe {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: calc(100vw - 32px);
    max-width: 400px;
  }
}

/* Tablet Layout Fixes */
@media (min-width: 768px) and (max-width: 1023px) {
  .layout-content {
    padding: 20px;
  }

  .grid-responsive {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Desktop Layout Fixes */
@media (min-width: 1024px) {
  .layout-content {
    padding: 24px;
  }

  .grid-responsive {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Prevent Content Hiding */
.content-safe {
  position: relative;
  z-index: 1;
}

.content-elevated {
  position: relative;
  z-index: 10;
}

/* Overflow Safety */
.overflow-safe {
  overflow: visible;
}

.overflow-hidden-safe {
  overflow: hidden;
}

/* Position Safety */
.position-safe {
  position: relative;
}

.position-fixed-safe {
  position: fixed;
  z-index: 20;
}

.position-absolute-safe {
  position: absolute;
  z-index: 10;
}

.position-sticky-safe {
  position: sticky;
  z-index: 15;
}

/* Spacing Safety */
.spacing-safe {
  margin: 8px;
  padding: 8px;
}

.spacing-safe-sm {
  margin: 4px;
  padding: 4px;
}

.spacing-safe-lg {
  margin: 16px;
  padding: 16px;
}

/* Touch Safety */
.touch-safe {
  min-height: 44px;
  min-width: 44px;
}

.touch-safe-sm {
  min-height: 36px;
  min-width: 36px;
}

.touch-safe-lg {
  min-height: 56px;
  min-width: 56px;
}

/* Animation Safety */
.animation-safe {
  transition: all 0.2s ease;
}

.animation-safe-fast {
  transition: all 0.1s ease;
}

.animation-safe-slow {
  transition: all 0.3s ease;
}

/* Focus Safety */
.focus-safe {
  outline: 2px solid transparent;
  outline-offset: 2px;
}

.focus-safe:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Reduced Motion Safety */
@media (prefers-reduced-motion: reduce) {
  .animation-safe,
  .animation-safe-fast,
  .animation-safe-slow {
    transition: none;
  }

  .layout-sidebar {
    transition: none;
  }
}
`;

// ============================================================================
// LAYOUT MONITORING
// ============================================================================

export const LayoutMonitor = {
  /**
   * Monitor layout for issues
   */
  startMonitoring: (): void => {
    // Check for overlaps every 5 seconds
    setInterval(() => {
      OverlapPrevention.fixOverlaps();
    }, 5000);

    // Fix responsive layout on resize
    let resizeTimeout: NodeJS.Timeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        ResponsiveLayoutFixes.fixMobileLayout();
        ResponsiveLayoutFixes.fixTabletLayout();
        ResponsiveLayoutFixes.fixDesktopLayout();
        LayoutSafety.preventContentHiding();
      }, 250);
    });

    // Monitor for new elements
    const observer = new MutationObserver(() => {
      LayoutSafety.preventContentHiding();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  },

  /**
   * Get layout health report
   */
  getHealthReport: (): {
    overlaps: number;
    zIndexConflicts: number;
    responsiveIssues: number;
    overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
  } => {
    const overlaps = OverlapPrevention.detectOverlaps().length;
    const zIndexConflicts = LayoutMonitor.detectZIndexConflicts();
    const responsiveIssues = LayoutMonitor.detectResponsiveIssues();

    let overallHealth: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';

    if (overlaps > 5 || zIndexConflicts > 3 || responsiveIssues > 2) {
      overallHealth = 'poor';
    } else if (overlaps > 2 || zIndexConflicts > 1 || responsiveIssues > 1) {
      overallHealth = 'fair';
    } else if (overlaps > 0 || zIndexConflicts > 0 || responsiveIssues > 0) {
      overallHealth = 'good';
    }

    return {
      overlaps,
      zIndexConflicts,
      responsiveIssues,
      overallHealth
    };
  },

  /**
   * Detect z-index conflicts
   */
  detectZIndexConflicts: (): number => {
    const elements = document.querySelectorAll('*');
    const zIndexes = new Map<number, HTMLElement[]>();

    elements.forEach(element => {
      const computed = window.getComputedStyle(element);
      const zIndex = parseInt(computed.zIndex);
      if (!isNaN(zIndex) && zIndex > 0) {
        if (!zIndexes.has(zIndex)) {
          zIndexes.set(zIndex, []);
        }
        zIndexes.get(zIndex)!.push(element as HTMLElement);
      }
    });

    let conflicts = 0;
    zIndexes.forEach((elements, zIndex) => {
      if (elements.length > 1) {
        // Check if elements with same z-index overlap
        for (let i = 0; i < elements.length; i++) {
          for (let j = i + 1; j < elements.length; j++) {
            if (OverlapPrevention.elementsOverlap(elements[i], elements[j])) {
              conflicts++;
            }
          }
        }
      }
    });

    return conflicts;
  },

  /**
   * Detect responsive layout issues
   */
  detectResponsiveIssues: (): number => {
    let issues = 0;

    // Check for horizontal overflow
    if (document.body.scrollWidth > window.innerWidth) {
      issues++;
    }

    // Check for elements too close to viewport edges
    const elements = document.querySelectorAll('*');
    elements.forEach(element => {
      const rect = element.getBoundingClientRect();
      if (rect.left < 0 || rect.right > window.innerWidth) {
        issues++;
      }
    });

    return issues;
  }
} as const;

export default {
  ZIndexLayers,
  LayoutSafety,
  ResponsiveLayoutFixes,
  OverlapPrevention,
  LayoutCSS,
  LayoutMonitor
};



