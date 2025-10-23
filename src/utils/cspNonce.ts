/**
 * CSP Nonce Generation Utility
 * Generates cryptographically secure nonces for Content Security Policy
 */

/**
 * Generate a cryptographically secure random nonce
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get or create a nonce for the current session
 * Stores the nonce in sessionStorage to persist across page reloads
 */
export function getCSPNonce(): string {
  const storageKey = 'csp-nonce';
  let nonce = sessionStorage.getItem(storageKey);

  if (!nonce) {
    nonce = generateNonce();
    sessionStorage.setItem(storageKey, nonce);
  }

  return nonce;
}

/**
 * Set the CSP nonce in the document meta tag
 * This allows inline scripts with the matching nonce to execute
 */
export function setCSPNonceInDocument(): void {
  const nonce = getCSPNonce();

  // Remove existing nonce meta tag
  const existingMeta = document.querySelector('meta[name="csp-nonce"]');
  if (existingMeta) {
    existingMeta.remove();
  }

  // Create new nonce meta tag
  const meta = document.createElement('meta');
  meta.name = 'csp-nonce';
  meta.content = nonce;
  document.head.appendChild(meta);

  // Also set as a global variable for easy access
  (window as any).__CSP_NONCE__ = nonce;
}

/**
 * Get the current CSP nonce from the document
 */
export function getCSPNonceFromDocument(): string | null {
  const meta = document.querySelector('meta[name="csp-nonce"]');
  return meta ? meta.getAttribute('content') : null;
}

/**
 * Create a script element with the correct nonce
 */
export function createScriptWithNonce(code: string): HTMLScriptElement {
  const script = document.createElement('script');
  const nonce = getCSPNonceFromDocument();

  if (nonce) {
    script.nonce = nonce;
  }

  script.textContent = code;
  return script;
}



