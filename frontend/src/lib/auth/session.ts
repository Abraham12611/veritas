import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AuthError, Session } from '@supabase/supabase-js';

const REFRESH_THRESHOLD = 60 * 1000; // 1 minute before expiry
const MAX_RETRY_ATTEMPTS = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds
const BROADCAST_CHANNEL = 'veritas_session_sync';

export class SessionManager {
  private static instance: SessionManager;
  private refreshPromise: Promise<void> | null = null;
  private supabase = createClientComponentClient();
  private refreshTimeout: NodeJS.Timeout | null = null;
  private retryAttempts = 0;
  private broadcastChannel: BroadcastChannel | null = null;

  private constructor() {
    this.setupSessionRefresh();
    this.setupEventListeners();
    this.setupBroadcastChannel();
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  private setupEventListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
      window.addEventListener('focus', this.handleWindowFocus);
    }
  }

  private setupBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL);
      this.broadcastChannel.onmessage = (event) => {
        if (event.data.type === 'SESSION_UPDATED') {
          this.handleSessionUpdate(event.data.session);
        }
      };
    }
  }

  private async setupSessionRefresh() {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();
      if (error) throw error;
      
      if (session) {
        this.scheduleRefresh(session);
      }

      this.supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          this.scheduleRefresh(session);
          this.broadcastSessionUpdate(session);
        } else {
          this.clearRefreshTimeout();
          this.broadcastSessionUpdate(null);
        }
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  private scheduleRefresh(session: Session) {
    this.clearRefreshTimeout();
    
    const expiresAt = (session.expires_at || 0) * 1000;
    const now = Date.now();
    const timeUntilRefresh = Math.max(0, expiresAt - now - REFRESH_THRESHOLD);

    this.refreshTimeout = setTimeout(() => {
      this.refreshSession();
    }, timeUntilRefresh);
  }

  private clearRefreshTimeout() {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
  }

  private calculateRetryDelay(): number {
    const delay = Math.min(
      INITIAL_RETRY_DELAY * Math.pow(2, this.retryAttempts),
      MAX_RETRY_DELAY
    );
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }

  private async refreshSession(): Promise<void> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const { data: { session }, error } = await this.supabase.auth.refreshSession();
        if (error) throw error;
        
        if (session) {
          this.scheduleRefresh(session);
          this.broadcastSessionUpdate(session);
          this.retryAttempts = 0; // Reset retry counter on success
        }
      } catch (error) {
        await this.handleError(error);
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async handleError(error: unknown) {
    console.error('Session error:', error);

    if (error instanceof AuthError) {
      switch (error.status) {
        case 401:
          // Token is invalid or expired
          window.location.href = '/auth/login?error=session_expired';
          break;
        case 429:
          // Rate limited
          const retryAfter = parseInt(error.message) || 60;
          await this.retryWithDelay(retryAfter * 1000);
          break;
        default:
          if (this.retryAttempts < MAX_RETRY_ATTEMPTS) {
            await this.retryWithDelay(this.calculateRetryDelay());
          } else {
            // Max retries reached, redirect to login
            window.location.href = '/auth/login?error=max_retries';
          }
      }
    } else if (!navigator.onLine) {
      // If offline, retry when back online
      await this.retryWithDelay(INITIAL_RETRY_DELAY);
    } else {
      // Unknown error
      window.location.href = '/auth/login?error=unknown';
    }
  }

  private async retryWithDelay(delay: number) {
    this.retryAttempts++;
    await new Promise(resolve => setTimeout(resolve, delay));
    return this.refreshSession();
  }

  private broadcastSessionUpdate(session: Session | null) {
    try {
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: 'SESSION_UPDATED',
          session,
        });
      }
    } catch (error) {
      // Silently handle the case where the channel is closed
      if (error instanceof Error && error.name === 'InvalidStateError') {
        this.broadcastChannel = null;
      } else {
        console.error('Error broadcasting session update:', error);
      }
    }
  }

  private handleSessionUpdate(session: Session | null) {
    if (session) {
      this.scheduleRefresh(session);
    } else {
      this.clearRefreshTimeout();
    }
  }

  private handleOnline = () => {
    this.retryAttempts = 0; // Reset retry counter
    this.refreshSession();
  };

  private handleOffline = () => {
    this.clearRefreshTimeout();
  };

  private handleWindowFocus = () => {
    // Check session validity when window regains focus
    this.refreshSession();
  };

  public cleanup() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
      window.removeEventListener('focus', this.handleWindowFocus);
    }
    this.clearRefreshTimeout();
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch (error) {
        console.error('Error closing broadcast channel:', error);
      } finally {
        this.broadcastChannel = null;
      }
    }
  }
} 