/**
 * Secure Storage Utility
 * Uses Web Crypto API for proper encryption
 */

interface SecureStorageOptions {
  encrypt?: boolean;
  expiry?: number; // milliseconds
}

class SecureStorage {
  private readonly prefix = 'qs_secure_';
  private readonly keyName = 'quickstrap_storage_key';

  /**
   * Get or create encryption key using Web Crypto API
   */
  private async getEncryptionKey(): Promise<CryptoKey> {
    try {
      // Try to get existing key from IndexedDB
      const existingKey = await this.getKeyFromStorage();
      if (existingKey) {
        return existingKey;
      }

      // Generate new key
      const key = await crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256,
        },
        true, // extractable
        ['encrypt', 'decrypt']
      );

      // Store key in IndexedDB
      await this.storeKeyInStorage(key);
      return key;
    } catch (error) {
      console.error('Failed to get encryption key:', error);
      throw new Error('Encryption not available');
    }
  }

  /**
   * Store encryption key in IndexedDB
   */
  private async storeKeyInStorage(key: CryptoKey): Promise<void> {
    try {
      const exportedKey = await crypto.subtle.exportKey('raw', key);
      const keyArray = new Uint8Array(exportedKey);
      localStorage.setItem(this.keyName, Array.from(keyArray).join(','));
    } catch (error) {
      console.error('Failed to store encryption key:', error);
    }
  }

  /**
   * Get encryption key from storage
   */
  private async getKeyFromStorage(): Promise<CryptoKey | null> {
    try {
      const storedKey = localStorage.getItem(this.keyName);
      if (!storedKey) return null;

      const keyArray = new Uint8Array(storedKey.split(',').map(Number));
      return await crypto.subtle.importKey(
        'raw',
        keyArray,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      console.error('Failed to get key from storage:', error);
      return null;
    }
  }

  /**
   * Encrypt data using AES-GCM
   */
  private async encrypt(data: string): Promise<string> {
    try {
      const key = await this.getEncryptionKey();
      const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
      const encodedData = new TextEncoder().encode(data);

      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encodedData
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);

      // Convert to base64
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt data using AES-GCM
   */
  private async decrypt(encryptedData: string): Promise<string> {
    try {
      const key = await this.getEncryptionKey();

      // Convert from base64
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );

      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      return '';
    }
  }

  /**
   * Store data securely
   */
  async setItem(key: string, value: any, options: SecureStorageOptions = {}): Promise<void> {
    try {
      const data = {
        value,
        timestamp: Date.now(),
        expiry: options.expiry ? Date.now() + options.expiry : null
      };

      const serialized = JSON.stringify(data);
      const finalValue = options.encrypt !== false ? await this.encrypt(serialized) : serialized;

      localStorage.setItem(this.prefix + key, finalValue);
    } catch (error) {
      console.error('Secure storage setItem failed:', error);
      // Fallback to unencrypted storage with warning
      console.warn('Falling back to unencrypted storage for key:', key);
      localStorage.setItem(this.prefix + key, JSON.stringify({ value, timestamp: Date.now(), expiry: null }));
    }
  }

  /**
   * Retrieve data securely
   */
  async getItem(key: string, encrypted: boolean = true): Promise<any> {
    try {
      const stored = localStorage.getItem(this.prefix + key);
      if (!stored) return null;

      const serialized = encrypted ? await this.decrypt(stored) : stored;
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
  async hasItem(key: string): Promise<boolean> {
    const item = await this.getItem(key);
    return item !== null;
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
