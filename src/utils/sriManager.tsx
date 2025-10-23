/**
 * Subresource Integrity (SRI) Management
 * Ensures external resources haven't been tampered with
 */

import React from 'react';

interface SRIResource {
  url: string;
  integrity: string;
  crossorigin?: 'anonymous' | 'use-credentials';
  type?: 'script' | 'style' | 'image' | 'font';
}

class SRIManager {
  private readonly resourceMap: Map<string, SRIResource> = new Map();
  private readonly integrityCache: Map<string, string> = new Map();

  constructor() {
    this.initializeDefaultResources();
  }

  /**
   * Initialize default resources with known integrity hashes
   */
  private initializeDefaultResources(): void {
    // Add known CDN resources with their integrity hashes
    // These should be updated when CDN versions change

    // Example: Google Fonts
    this.addResource({
      url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
      integrity: 'sha384-...', // This would be the actual hash
      crossorigin: 'anonymous',
      type: 'style'
    });

    // Example: External scripts (if any)
    // this.addResource({
    //   url: 'https://cdn.example.com/library.js',
    //   integrity: 'sha384-...',
    //   crossorigin: 'anonymous',
    //   type: 'script'
    // });
  }

  /**
   * Add a resource with SRI
   */
  addResource(resource: SRIResource): void {
    this.resourceMap.set(resource.url, resource);
  }

  /**
   * Get resource with integrity attributes
   */
  getResource(url: string): SRIResource | null {
    return this.resourceMap.get(url) || null;
  }

  /**
   * Generate integrity hash for a resource
   */
  async generateIntegrity(url: string, algorithm: 'sha256' | 'sha384' | 'sha512' = 'sha384'): Promise<string> {
    try {
      // Check cache first
      const cacheKey = `${url}_${algorithm}`;
      if (this.integrityCache.has(cacheKey)) {
        return this.integrityCache.get(cacheKey)!;
      }

      // Fetch resource
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch resource: ${response.status}`);
      }

      const content = await response.text();

      // Generate hash
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest(algorithm.toUpperCase(), data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashBase64 = btoa(String.fromCharCode(...hashArray));

      const integrity = `${algorithm}-${hashBase64}`;

      // Cache the result
      this.integrityCache.set(cacheKey, integrity);

      return integrity;
    } catch (error) {
      console.error('Failed to generate integrity hash:', error);
      throw new Error('Failed to generate integrity hash');
    }
  }

  /**
   * Verify resource integrity
   */
  async verifyIntegrity(url: string, expectedIntegrity: string): Promise<boolean> {
    try {
      const actualIntegrity = await this.generateIntegrity(url);
      return actualIntegrity === expectedIntegrity;
    } catch (error) {
      console.error('Failed to verify integrity:', error);
      return false;
    }
  }

  /**
   * Create script element with SRI
   */
  createSecureScriptElement(resource: SRIResource): HTMLScriptElement {
    const script = document.createElement('script');
    script.src = resource.url;
    script.integrity = resource.integrity;
    script.crossOrigin = resource.crossorigin || 'anonymous';
    script.referrerPolicy = 'strict-origin-when-cross-origin';

    return script;
  }

  /**
   * Create link element with SRI
   */
  createSecureLinkElement(resource: SRIResource): HTMLLinkElement {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = resource.url;
    link.integrity = resource.integrity;
    link.crossOrigin = resource.crossorigin || 'anonymous';
    link.referrerPolicy = 'strict-origin-when-cross-origin';

    return link;
  }

  /**
   * Load external script with SRI verification
   */
  async loadSecureScript(resource: SRIResource): Promise<void> {
    return new Promise((resolve, reject) => {
      // Verify integrity before loading
      this.verifyIntegrity(resource.url, resource.integrity)
        .then(isValid => {
          if (!isValid) {
            reject(new Error('Resource integrity verification failed'));
            return;
          }

          const script = this.createSecureScriptElement(resource);

          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load script'));

          document.head.appendChild(script);
        })
        .catch(reject);
    });
  }

  /**
   * Load external stylesheet with SRI verification
   */
  async loadSecureStylesheet(resource: SRIResource): Promise<void> {
    return new Promise((resolve, reject) => {
      // Verify integrity before loading
      this.verifyIntegrity(resource.url, resource.integrity)
        .then(isValid => {
          if (!isValid) {
            reject(new Error('Resource integrity verification failed'));
            return;
          }

          const link = this.createSecureLinkElement(resource);

          link.onload = () => resolve();
          link.onerror = () => reject(new Error('Failed to load stylesheet'));

          document.head.appendChild(link);
        })
        .catch(reject);
    });
  }

  /**
   * Get all resources for CSP reporting
   */
  getAllResources(): SRIResource[] {
    return Array.from(this.resourceMap.values());
  }

  /**
   * Update CSP to include SRI resources
   */
  generateCSPWithSRI(): string {
    const resources = this.getAllResources();
    const scriptSources = resources.filter(r => r.type === 'script').map(r => r.url);
    const styleSources = resources.filter(r => r.type === 'style').map(r => r.url);
    const fontSources = resources.filter(r => r.type === 'font').map(r => r.url);

    let csp = "default-src 'self';";

    if (scriptSources.length > 0) {
      csp += ` script-src 'self' 'nonce-{random}' ${scriptSources.join(' ')};`;
    }

    if (styleSources.length > 0) {
      csp += ` style-src 'self' 'unsafe-inline' ${styleSources.join(' ')};`;
    }

    if (fontSources.length > 0) {
      csp += ` font-src 'self' ${fontSources.join(' ')};`;
    }

    return csp;
  }

  /**
   * Monitor resource loading for security events
   */
  setupResourceMonitoring(): void {
    // Monitor script loading
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName: string) {
      const element = originalCreateElement.call(this, tagName);

      if (tagName.toLowerCase() === 'script') {
        element.addEventListener('error', (event) => {
          console.warn('Script loading failed:', (event.target as HTMLScriptElement).src);
          // Log security event
          // TODO: Import auditLogger if needed
          console.error('Security violation:', {
            type: 'script_load_failed',
            message: 'External script failed to load',
            severity: 'medium',
            category: 'resource_tampering',
            scriptSrc: (event.target as HTMLScriptElement).src
          });
        });
      }

      return element;
    };

    // Monitor link loading
    const originalCreateElementNS = document.createElementNS.bind(document);
    document.createElementNS = function(namespaceURI: any, qualifiedName: any): any {
      const element = originalCreateElementNS(namespaceURI, qualifiedName);

      if (qualifiedName.toLowerCase() === 'link') {
        element.addEventListener('error', (event) => {
          console.warn('Stylesheet loading failed:', (event.target as HTMLLinkElement).href);
          // Log security event
          // TODO: Import auditLogger if needed
          console.error('Security violation:', {
            type: 'stylesheet_load_failed',
            message: 'External stylesheet failed to load',
            severity: 'medium',
            category: 'resource_tampering',
            stylesheetHref: (event.target as HTMLLinkElement).href
          });
        });
      }

      return element;
    };
  }

  /**
   * Validate all loaded resources
   */
  async validateAllResources(): Promise<{ valid: number; invalid: number; errors: string[] }> {
    const resources = this.getAllResources();
    const results = await Promise.allSettled(
      resources.map(async (resource) => {
        return this.verifyIntegrity(resource.url, resource.integrity);
      })
    );

    let valid = 0;
    let invalid = 0;
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        valid++;
      } else {
        invalid++;
        errors.push(`Resource ${resources[index].url} failed integrity check`);
      }
    });

    return { valid, invalid, errors };
  }

  /**
   * Get resource statistics
   */
  getResourceStats(): {
    totalResources: number;
    resourcesByType: Record<string, number>;
    resourcesByOrigin: Record<string, number>;
  } {
    const resources = this.getAllResources();
    const resourcesByType: Record<string, number> = {};
    const resourcesByOrigin: Record<string, number> = {};

    resources.forEach(resource => {
      const type = resource.type || 'unknown';
      resourcesByType[type] = (resourcesByType[type] || 0) + 1;

      try {
        const origin = new URL(resource.url).origin;
        resourcesByOrigin[origin] = (resourcesByOrigin[origin] || 0) + 1;
      } catch {
        resourcesByOrigin['invalid-url'] = (resourcesByOrigin['invalid-url'] || 0) + 1;
      }
    });

    return {
      totalResources: resources.length,
      resourcesByType,
      resourcesByOrigin
    };
  }
}

export const sriManager = new SRIManager();

/**
 * React hook for secure resource loading
 */
export function useSecureResource(resource: SRIResource) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!resource) return;

    setLoading(true);
    setError(null);

    const loadResource = async () => {
      try {
        if (resource.type === 'script') {
          await sriManager.loadSecureScript(resource);
        } else if (resource.type === 'style') {
          await sriManager.loadSecureStylesheet(resource);
        }
        setLoaded(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load resource');
      } finally {
        setLoading(false);
      }
    };

    loadResource();
  }, [resource]);

  return { loading, error, loaded };
}

/**
 * Higher-order component for secure resource loading
 */
export function withSecureResources<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  resources: SRIResource[]
): React.ComponentType<T> {
  return function SecureResourceComponent(props: T) {
    const [resourcesLoaded, setResourcesLoaded] = React.useState(false);
    const [loadingError, setLoadingError] = React.useState<string | null>(null);

    React.useEffect(() => {
      const loadAllResources = async () => {
        try {
          await Promise.all(
            resources.map(async (resource) => {
              if (resource.type === 'script') {
                await sriManager.loadSecureScript(resource);
              } else if (resource.type === 'style') {
                await sriManager.loadSecureStylesheet(resource);
              }
            })
          );
          setResourcesLoaded(true);
        } catch (error) {
          setLoadingError(error instanceof Error ? error.message : 'Failed to load resources');
        }
      };

      loadAllResources();
    }, []);

    if (loadingError) {
      return <div>Failed to load required resources: {loadingError}</div>;
    }

    if (!resourcesLoaded) {
      return <div>Loading secure resources...</div>;
    }

    return <Component {...props} />;
  };
}
