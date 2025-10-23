/**
 * Server-Side Rate Limiting for Supabase Edge Functions
 * Implements Redis-like rate limiting using Supabase database
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs: number;
}

interface RateLimitEntry {
  requests: number;
  windowStart: number;
  blocked: boolean;
  blockExpiry?: number;
}

class ServerRateLimiter {
  public readonly configs: Record<string, RateLimitConfig> = {
    login: {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
      blockDurationMs: 30 * 60 * 1000 // 30 minutes
    },
    api: {
      maxRequests: 100,
      windowMs: 60 * 1000, // 1 minute
      blockDurationMs: 5 * 60 * 1000 // 5 minutes
    },
    telegram: {
      maxRequests: 10,
      windowMs: 60 * 1000, // 1 minute
      blockDurationMs: 10 * 60 * 1000 // 10 minutes
    },
    upload: {
      maxRequests: 10,
      windowMs: 60 * 1000, // 1 minute
      blockDurationMs: 15 * 60 * 1000 // 15 minutes
    },
    export: {
      maxRequests: 5,
      windowMs: 60 * 1000, // 1 minute
      blockDurationMs: 10 * 60 * 1000 // 10 minutes
    }
  };

  /**
   * Check if request is allowed for the given identifier
   */
  async isAllowed(
    identifier: string,
    action: keyof typeof this.configs,
    supabase: any
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number; blocked: boolean }> {
    const config = this.configs[action];
    const now = Date.now();
    const windowStart = Math.floor(now / config.windowMs) * config.windowMs;

    try {
      // Get or create rate limit entry
      const { data: existing, error: fetchError } = await supabase
        .from('rate_limits')
        .select('*')
        .eq('identifier', identifier)
        .eq('action', action)
        .eq('window_start', windowStart)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Rate limit fetch error:', fetchError);
        // Fail open - allow request if we can't check
        return { allowed: true, remaining: config.maxRequests, resetTime: windowStart + config.windowMs, blocked: false };
      }

      if (existing) {
        // Check if still blocked
        if (existing.blocked && existing.block_expiry && now < existing.block_expiry) {
          return {
            allowed: false,
            remaining: 0,
            resetTime: existing.block_expiry,
            blocked: true
          };
        }

        // Check if window has expired (shouldn't happen with our query, but safety check)
        if (now - existing.window_start > config.windowMs) {
          // Reset the entry
          await this.resetEntry(identifier, action, windowStart, supabase);
          return { allowed: true, remaining: config.maxRequests - 1, resetTime: windowStart + config.windowMs, blocked: false };
        }

        // Check if max requests exceeded
        if (existing.requests >= config.maxRequests) {
          // Block the identifier
          await this.blockEntry(identifier, action, windowStart, now + config.blockDurationMs, supabase);
          return {
            allowed: false,
            remaining: 0,
            resetTime: now + config.blockDurationMs,
            blocked: true
          };
        }

        // Increment requests
        const { error: updateError } = await supabase
          .from('rate_limits')
          .update({
            requests: existing.requests + 1,
            last_request: now
          })
          .eq('identifier', identifier)
          .eq('action', action)
          .eq('window_start', windowStart);

        if (updateError) {
          console.error('Rate limit update error:', updateError);
          return { allowed: true, remaining: config.maxRequests, resetTime: windowStart + config.windowMs, blocked: false };
        }

        return {
          allowed: true,
          remaining: config.maxRequests - existing.requests - 1,
          resetTime: windowStart + config.windowMs,
          blocked: false
        };
      } else {
        // Create new entry
        const { error: insertError } = await supabase
          .from('rate_limits')
          .insert({
            identifier,
            action,
            window_start: windowStart,
            requests: 1,
            first_request: now,
            last_request: now,
            blocked: false
          });

        if (insertError) {
          console.error('Rate limit insert error:', insertError);
          return { allowed: true, remaining: config.maxRequests, resetTime: windowStart + config.windowMs, blocked: false };
        }

        return { allowed: true, remaining: config.maxRequests - 1, resetTime: windowStart + config.windowMs, blocked: false };
      }
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Fail open - allow request if rate limiting fails
      return { allowed: true, remaining: config.maxRequests, resetTime: windowStart + config.windowMs, blocked: false };
    }
  }

  /**
   * Reset a rate limit entry
   */
  private async resetEntry(identifier: string, action: string, windowStart: number, supabase: any): Promise<void> {
    await supabase
      .from('rate_limits')
      .upsert({
        identifier,
        action,
        window_start: windowStart,
        requests: 1,
        first_request: Date.now(),
        last_request: Date.now(),
        blocked: false,
        block_expiry: null
      });
  }

  /**
   * Block a rate limit entry
   */
  private async blockEntry(identifier: string, action: string, windowStart: number, blockExpiry: number, supabase: any): Promise<void> {
    await supabase
      .from('rate_limits')
      .update({
        blocked: true,
        block_expiry: blockExpiry
      })
      .eq('identifier', identifier)
      .eq('action', action)
      .eq('window_start', windowStart);
  }

  /**
   * Get rate limit status for monitoring
   */
  async getStatus(identifier: string, action: keyof typeof this.configs, supabase: any): Promise<any> {
    const config = this.configs[action];
    const now = Date.now();
    const windowStart = Math.floor(now / config.windowMs) * config.windowMs;

    const { data } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('identifier', identifier)
      .eq('action', action)
      .eq('window_start', windowStart)
      .single();

    if (!data) {
      return {
        requests: 0,
        remaining: config.maxRequests,
        resetTime: windowStart + config.windowMs,
        blocked: false
      };
    }

    return {
      requests: data.requests,
      remaining: Math.max(0, config.maxRequests - data.requests),
      resetTime: data.blocked ? data.block_expiry : windowStart + config.windowMs,
      blocked: data.blocked && data.block_expiry && now < data.block_expiry
    };
  }

  /**
   * Clean up old rate limit entries
   */
  async cleanup(supabase: any): Promise<void> {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago

    await supabase
      .from('rate_limits')
      .delete()
      .lt('window_start', cutoffTime);
  }
}

export const serverRateLimiter = new ServerRateLimiter();

/**
 * Rate limiting middleware for Supabase Edge Functions
 */
export function createRateLimitMiddleware(action: keyof ServerRateLimiter['configs']) {
  return async (req: Request, supabase: any): Promise<Response | null> => {
    // Extract identifier from request (IP, user ID, etc.)
    const identifier = getRequestIdentifier(req);

    const result = await serverRateLimiter.isAllowed(identifier, action, supabase);

    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Too many ${action} requests. Please try again later.`,
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': serverRateLimiter.configs[action].maxRequests.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.resetTime.toString()
          }
        }
      );
    }

    // Add rate limit headers to successful responses
    return null; // Continue processing
  };
}

/**
 * Extract request identifier for rate limiting
 */
function getRequestIdentifier(req: Request): string {
  // Try to get user ID from JWT token first
  const authHeader = req.headers.get('Authorization');
  if (authHeader) {
    try {
      const token = authHeader.replace('Bearer ', '');
      // In a real implementation, you'd decode the JWT here
      // For now, we'll use a hash of the token
      return `user_${btoa(token).slice(0, 16)}`;
    } catch (error) {
      // Fall back to IP-based limiting
    }
  }

  // Fall back to IP address
  const forwarded = req.headers.get('X-Forwarded-For');
  const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('CF-Connecting-IP') || 'unknown';
  return `ip_${ip}`;
}

/**
 * Rate limit response headers helper
 */
export function addRateLimitHeaders(
  response: Response,
  action: keyof ServerRateLimiter['configs'],
  remaining: number,
  resetTime: number
): Response {
  const config = serverRateLimiter.configs[action];

  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      ...Object.fromEntries(response.headers.entries()),
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': resetTime.toString()
    }
  });

  return newResponse;
}



