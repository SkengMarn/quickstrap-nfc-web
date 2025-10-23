/**
 * Secure Session Management Service
 * Implements database-backed session storage with proper security
 */

import { sessionSchema, validateInputSafe } from '../utils/validationSchemas';
import { supabase } from './supabase';

interface SessionData {
  user_id: string;
  session_id: string;
  created_at: string;
  expires_at: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
}

interface TelegramSession extends SessionData {
  telegram_user_id: number;
  username?: string;
  chat_id?: number;
}

class SecureSessionManager {
  private readonly sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
  private readonly cleanupInterval = 60 * 60 * 1000; // 1 hour

  constructor() {
    // Start cleanup interval
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.cleanupInterval);
  }

  /**
   * Create a new secure session
   */
  async createSession(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    const sessionId = this.generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.sessionTimeout);

    const sessionData: SessionData = {
      user_id: userId,
      session_id: sessionId,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: metadata || {}
    };

    // Validate session data
    const validatedData = validateInputSafe(sessionSchema, sessionData);
    if (!validatedData) {
      throw new Error('Invalid session data');
    }

    try {
      const { error } = await supabase
        .from('user_sessions')
        .insert([sessionData]);

      if (error) {
        console.error('Failed to create session:', error);
        throw new Error('Session creation failed');
      }

      return sessionId;
    } catch (error) {
      console.error('Session creation error:', error);
      throw new Error('Session creation failed');
    }
  }

  /**
   * Create a Telegram-specific session
   */
  async createTelegramSession(
    telegramUserId: number,
    username?: string,
    chatId?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    const sessionId = this.generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.sessionTimeout);

    const sessionData: TelegramSession = {
      user_id: `telegram_${telegramUserId}`,
      session_id: sessionId,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent,
      telegram_user_id: telegramUserId,
      username,
      chat_id: chatId,
      metadata: {
        platform: 'telegram',
        created_via: 'bot'
      }
    };

    try {
      const { error } = await supabase
        .from('telegram_sessions')
        .insert([sessionData]);

      if (error) {
        console.error('Failed to create Telegram session:', error);
        throw new Error('Telegram session creation failed');
      }

      return sessionId;
    } catch (error) {
      console.error('Telegram session creation error:', error);
      throw new Error('Telegram session creation failed');
    }
  }

  /**
   * Validate and refresh a session
   */
  async validateSession(sessionId: string, ipAddress?: string): Promise<SessionData | null> {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return null;
      }

      // Check if session is expired
      const now = new Date();
      const expiresAt = new Date(data.expires_at);

      if (now > expiresAt) {
        await this.invalidateSession(sessionId);
        return null;
      }

      // Optional: Check IP address for additional security
      if (ipAddress && data.ip_address && data.ip_address !== ipAddress) {
        console.warn('Session IP mismatch detected');
        // You might want to invalidate the session or require re-authentication
        // await this.invalidateSession(sessionId);
        // return null;
      }

      // Refresh session expiry
      const newExpiresAt = new Date(now.getTime() + this.sessionTimeout);
      await supabase
        .from('user_sessions')
        .update({ expires_at: newExpiresAt.toISOString() })
        .eq('session_id', sessionId);

      return data;
    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }

  /**
   * Validate a Telegram session
   */
  async validateTelegramSession(sessionId: string, telegramUserId: number): Promise<TelegramSession | null> {
    try {
      const { data, error } = await supabase
        .from('telegram_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .eq('telegram_user_id', telegramUserId)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return null;
      }

      // Check if session is expired
      const now = new Date();
      const expiresAt = new Date(data.expires_at);

      if (now > expiresAt) {
        await this.invalidateTelegramSession(sessionId);
        return null;
      }

      // Refresh session expiry
      const newExpiresAt = new Date(now.getTime() + this.sessionTimeout);
      await supabase
        .from('telegram_sessions')
        .update({ expires_at: newExpiresAt.toISOString() })
        .eq('session_id', sessionId);

      return data;
    } catch (error) {
      console.error('Telegram session validation error:', error);
      return null;
    }
  }

  /**
   * Invalidate a session
   */
  async invalidateSession(sessionId: string): Promise<void> {
    try {
      await supabase
        .from('user_sessions')
        .update({ is_active: false, invalidated_at: new Date().toISOString() })
        .eq('session_id', sessionId);
    } catch (error) {
      console.error('Session invalidation error:', error);
    }
  }

  /**
   * Invalidate a Telegram session
   */
  async invalidateTelegramSession(sessionId: string): Promise<void> {
    try {
      await supabase
        .from('telegram_sessions')
        .update({ is_active: false, invalidated_at: new Date().toISOString() })
        .eq('session_id', sessionId);
    } catch (error) {
      console.error('Telegram session invalidation error:', error);
    }
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateAllUserSessions(userId: string): Promise<void> {
    try {
      await supabase
        .from('user_sessions')
        .update({ is_active: false, invalidated_at: new Date().toISOString() })
        .eq('user_id', userId);
    } catch (error) {
      console.error('User session invalidation error:', error);
    }
  }

  /**
   * Get active sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionData[]> {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to get user sessions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get user sessions error:', error);
      return [];
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const now = new Date().toISOString();

      // Clean up regular sessions
      await supabase
        .from('user_sessions')
        .update({ is_active: false, invalidated_at: now })
        .lt('expires_at', now)
        .eq('is_active', true);

      // Clean up Telegram sessions
      await supabase
        .from('telegram_sessions')
        .update({ is_active: false, invalidated_at: now })
        .lt('expires_at', now)
        .eq('is_active', true);

      console.log('Cleaned up expired sessions');
    } catch (error) {
      console.error('Session cleanup error:', error);
    }
  }

  /**
   * Generate a cryptographically secure session ID
   */
  private generateSessionId(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get session statistics for monitoring
   */
  async getSessionStats(): Promise<{
    totalActive: number;
    totalTelegramActive: number;
    expiredToday: number;
  }> {
    try {
      const now = new Date().toISOString();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [activeSessions, telegramSessions, expiredToday] = await Promise.all([
        supabase
          .from('user_sessions')
          .select('id', { count: 'exact' })
          .eq('is_active', true)
          .gt('expires_at', now),

        supabase
          .from('telegram_sessions')
          .select('id', { count: 'exact' })
          .eq('is_active', true)
          .gt('expires_at', now),

        supabase
          .from('user_sessions')
          .select('id', { count: 'exact' })
          .lt('expires_at', now)
          .gte('created_at', today.toISOString())
      ]);

      return {
        totalActive: activeSessions.count || 0,
        totalTelegramActive: telegramSessions.count || 0,
        expiredToday: expiredToday.count || 0
      };
    } catch (error) {
      console.error('Failed to get session stats:', error);
      return {
        totalActive: 0,
        totalTelegramActive: 0,
        expiredToday: 0
      };
    }
  }
}

export const secureSessionManager = new SecureSessionManager();

/**
 * Session middleware for API routes
 */
export function createSessionMiddleware() {
  return async (req: Request): Promise<{ session: SessionData | null; userId: string | null }> => {
    const sessionId = req.headers.get('X-Session-ID') ||
                     req.headers.get('Authorization')?.replace('Bearer ', '');

    if (!sessionId) {
      return { session: null, userId: null };
    }

    const ipAddress = req.headers.get('X-Forwarded-For') ||
                     req.headers.get('CF-Connecting-IP') ||
                     'unknown';

    const session = await secureSessionManager.validateSession(sessionId, ipAddress);

    return {
      session,
      userId: session?.user_id || null
    };
  };
}



