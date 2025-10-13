/**
 * Rate Limiter for Authentication and API Calls
 * Prevents brute force attacks and API abuse
 */

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lastAttempt: number;
  blocked: boolean;
  blockExpiry?: number;
}

class RateLimiter {
  private attempts: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up old entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if an action is allowed for the given identifier
   */
  isAllowed(identifier: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const entry = this.attempts.get(identifier);

    if (!entry) {
      // First attempt
      this.attempts.set(identifier, {
        attempts: 1,
        firstAttempt: now,
        lastAttempt: now,
        blocked: false
      });
      return true;
    }

    // Check if still blocked
    if (entry.blocked && entry.blockExpiry && now < entry.blockExpiry) {
      return false;
    }

    // Reset if window has expired
    if (now - entry.firstAttempt > config.windowMs) {
      this.attempts.set(identifier, {
        attempts: 1,
        firstAttempt: now,
        lastAttempt: now,
        blocked: false
      });
      return true;
    }

    // Check if max attempts exceeded
    if (entry.attempts >= config.maxAttempts) {
      // Block the identifier
      this.attempts.set(identifier, {
        ...entry,
        blocked: true,
        blockExpiry: now + config.blockDurationMs
      });
      return false;
    }

    // Increment attempts
    this.attempts.set(identifier, {
      ...entry,
      attempts: entry.attempts + 1,
      lastAttempt: now
    });

    return true;
  }

  /**
   * Get remaining attempts for an identifier
   */
  getRemainingAttempts(identifier: string, config: RateLimitConfig): number {
    const entry = this.attempts.get(identifier);
    if (!entry) return config.maxAttempts;

    const now = Date.now();
    
    // If window expired, reset
    if (now - entry.firstAttempt > config.windowMs) {
      return config.maxAttempts;
    }

    return Math.max(0, config.maxAttempts - entry.attempts);
  }

  /**
   * Get time until unblocked (in milliseconds)
   */
  getTimeUntilUnblocked(identifier: string): number {
    const entry = this.attempts.get(identifier);
    if (!entry || !entry.blocked || !entry.blockExpiry) {
      return 0;
    }

    const now = Date.now();
    return Math.max(0, entry.blockExpiry - now);
  }

  /**
   * Reset rate limit for an identifier
   */
  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [identifier, entry] of this.attempts.entries()) {
      // Remove old entries
      if (now - entry.lastAttempt > maxAge) {
        this.attempts.delete(identifier);
        continue;
      }

      // Remove unblocked entries
      if (entry.blocked && entry.blockExpiry && now > entry.blockExpiry) {
        this.attempts.delete(identifier);
      }
    }
  }

  /**
   * Get statistics for monitoring
   */
  getStats(): { totalIdentifiers: number; blockedIdentifiers: number } {
    let blockedCount = 0;
    const now = Date.now();

    for (const entry of this.attempts.values()) {
      if (entry.blocked && entry.blockExpiry && now < entry.blockExpiry) {
        blockedCount++;
      }
    }

    return {
      totalIdentifiers: this.attempts.size,
      blockedIdentifiers: blockedCount
    };
  }

  /**
   * Destroy the rate limiter and clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.attempts.clear();
  }
}

// Create singleton instance
export const rateLimiter = new RateLimiter();

// Predefined configurations
export const rateLimitConfigs = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 30 * 60 * 1000 // 30 minutes
  },
  
  api: {
    maxAttempts: 100,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 5 * 60 * 1000 // 5 minutes
  },
  
  telegram: {
    maxAttempts: 10,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 10 * 60 * 1000 // 10 minutes
  }
};

export default rateLimiter;
