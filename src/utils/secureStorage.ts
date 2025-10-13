/**
 * Secure Storage Utility
 * Encrypts sensitive data before storing in localStorage
 */

interface SecureStorageOptions {
  encrypt?: boolean;
  expiry?: number; // milliseconds
}

class SecureStorage {
  private readonly prefix = 'qs_secure_';
  private readonly key = 'quickstrap_storage_key';

  /**
   * Simple encryption using base64 and XOR (for basic obfuscation)
   * In production, use proper encryption library like crypto-js
   */
  private encrypt(data: string): string {
    const key = this.key;
    let encrypted = '';
    for (let i = 0; i < data.length; i++) {
      encrypted += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(encrypted);
  }

  private decrypt(encryptedData: string): string {
    try {
      const encrypted = atob(encryptedData);
      const key = this.key;
      let decrypted = '';
      for (let i = 0; i < encrypted.length; i++) {
        decrypted += String.fromCharCode(encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      return '';
    }
  }

  /**
   * Store data securely
   */
  setItem(key: string, value: any, options: SecureStorageOptions = {}): void {
    try {
      const data = {
        value,
        timestamp: Date.now(),
        expiry: options.expiry ? Date.now() + options.expiry : null
      };

      const serialized = JSON.stringify(data);
      const finalValue = options.encrypt !== false ? this.encrypt(serialized) : serialized;
      
      localStorage.setItem(this.prefix + key, finalValue);
    } catch (error) {
      console.error('Secure storage setItem failed:', error);
    }
  }

  /**
   * Retrieve data securely
   */
  getItem(key: string, encrypted: boolean = true): any {
    try {
      const stored = localStorage.getItem(this.prefix + key);
      if (!stored) return null;

      const serialized = encrypted ? this.decrypt(stored) : stored;
      if (!serialized) return null;

      const data = JSON.parse(serialized);

      // Check expiry
      if (data.expiry && Date.now() > data.expiry) {
        this.removeItem(key);
        return null;
      }

      return data.value;
    } catch (error) {
      console.error('Secure storage getItem failed:', error);
      return null;
    }
  }

  /**
   * Remove item
   */
  removeItem(key: string): void {
    localStorage.removeItem(this.prefix + key);
  }

  /**
   * Clear all secure storage items
   */
  clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Check if item exists and is not expired
   */
  hasItem(key: string): boolean {
    return this.getItem(key) !== null;
  }
}

export const secureStorage = new SecureStorage();

// Legacy localStorage wrapper for gradual migration
export const legacyStorage = {
  setItem: (key: string, value: string) => {
    console.warn(`SECURITY: Using insecure localStorage for ${key}. Consider migrating to secureStorage.`);
    localStorage.setItem(key, value);
  },
  getItem: (key: string) => {
    return localStorage.getItem(key);
  },
  removeItem: (key: string) => {
    localStorage.removeItem(key);
  }
};
