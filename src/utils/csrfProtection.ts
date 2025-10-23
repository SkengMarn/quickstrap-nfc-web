/**
 * CSRF Protection Utility
 * Implements CSRF token generation and validation
 */

import React from 'react';

interface CSRFToken {
  token: string;
  timestamp: number;
  expiresAt: number;
}

class CSRFProtection {
  private readonly tokenKey = 'csrf_token';
  private readonly tokenExpiry = 24 * 60 * 60 * 1000; // 24 hours
  private readonly headerName = 'X-CSRF-Token';

  /**
   * Generate a cryptographically secure CSRF token
   */
  private generateToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get or create a CSRF token for the current session
   */
  getToken(): string {
    try {
      const stored = sessionStorage.getItem(this.tokenKey);
      if (stored) {
        const tokenData: CSRFToken = JSON.parse(stored);

        // Check if token is still valid
        if (Date.now() < tokenData.expiresAt) {
          return tokenData.token;
        }
      }

      // Generate new token
      const token = this.generateToken();
      const tokenData: CSRFToken = {
        token,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.tokenExpiry
      };

      sessionStorage.setItem(this.tokenKey, JSON.stringify(tokenData));
      return token;
    } catch (error) {
      console.error('Failed to get CSRF token:', error);
      return this.generateToken();
    }
  }

  /**
   * Validate a CSRF token
   */
  validateToken(token: string): boolean {
    try {
      const stored = sessionStorage.getItem(this.tokenKey);
      if (!stored) return false;

      const tokenData: CSRFToken = JSON.parse(stored);

      // Check if token matches and is not expired
      return token === tokenData.token && Date.now() < tokenData.expiresAt;
    } catch (error) {
      console.error('Failed to validate CSRF token:', error);
      return false;
    }
  }

  /**
   * Get CSRF token for use in HTTP headers
   */
  getTokenHeader(): Record<string, string> {
    return {
      [this.headerName]: this.getToken()
    };
  }

  /**
   * Validate CSRF token from request headers
   */
  validateTokenFromHeaders(headers: Headers): boolean {
    const token = headers.get(this.headerName);
    return token ? this.validateToken(token) : false;
  }

  /**
   * Validate CSRF token from form data
   */
  validateTokenFromForm(formData: FormData): boolean {
    const token = formData.get('csrf_token') as string;
    return token ? this.validateToken(token) : false;
  }

  /**
   * Clear CSRF token (for logout)
   */
  clearToken(): void {
    sessionStorage.removeItem(this.tokenKey);
  }

  /**
   * Get token for use in forms
   */
  getTokenForForm(): string {
    return this.getToken();
  }

  /**
   * Create a secure fetch wrapper that includes CSRF token
   */
  async secureFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = this.getToken();

    const headers = new Headers(options.headers);
    headers.set(this.headerName, token);

    return fetch(url, {
      ...options,
      headers
    });
  }

  /**
   * Create form data with CSRF token
   */
  createSecureFormData(data: Record<string, any> = {}): FormData {
    const formData = new FormData();

    // Add CSRF token
    formData.append('csrf_token', this.getToken());

    // Add other data
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    return formData;
  }
}

export const csrfProtection = new CSRFProtection();

/**
 * React hook for CSRF token
 */
export function useCSRFToken(): string {
  return csrfProtection.getToken();
}

/**
 * Higher-order component to add CSRF token to forms
 */
export function withCSRFProtection<T extends Record<string, any>>(
  Component: React.ComponentType<T>
): React.ComponentType<T> {
  return function CSRFProtectedComponent(props: T) {
    const token = csrfProtection.getToken();

    return React.createElement('div', { 'data-csrf-token': token },
      React.createElement(Component, props)
    );
  };
}

/**
 * Utility to add CSRF token to Supabase requests
 * Note: Supabase handles CSRF internally, but this adds extra protection
 */
export function addCSRFToSupabaseRequest(requestInit: RequestInit): RequestInit {
  const token = csrfProtection.getToken();

  return {
    ...requestInit,
    headers: {
      ...requestInit.headers,
      'X-CSRF-Token': token
    }
  };
}
