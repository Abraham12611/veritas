import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AuthError, Session } from '@supabase/supabase-js';

const REFRESH_THRESHOLD = 60 * 1000; // 1 minute before expiry
const OFFLINE_RETRY_INTERVAL = 5000; // 5 seconds

export class SessionManager {
  private static instance: SessionManager;
  private refreshPromise: Promise<void> | null = null;
  private supabase = createClientComponentClient();
  private refreshTimeout: NodeJS.Timeout | null = null;

  private constructor() {
    // Initialize session refresh mechanism
    this.setupSessionRefresh();
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  private async setupSessionRefresh() {
    const { data: { session } } = await this.supabase.auth.getSession();
    if (session) {
      this.scheduleRefresh(session);
    }

    // Listen for auth state changes
    this.supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        this.scheduleRefresh(session);
      } else {
        this.clearRefreshTimeout();
      }
    });
  }

  private scheduleRefresh(session: Session) {
    this.clearRefreshTimeout();
    
    const expiresAt = (session.expires_at || 0) * 1000; // Convert to milliseconds
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

  private async refreshSession(): Promise<void> {
    // If already refreshing, return existing promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const { data: { session }, error } = await this.supabase.auth.refreshSession();
        if (error) throw error;
        
        if (session) {
          this.scheduleRefresh(session);
        }
      } catch (error) {
        if (navigator.onLine) {
          console.error('Failed to refresh session:', error);
          // Handle specific error cases
          if (error instanceof AuthError && error.status === 401) {
            // Token is invalid or expired, redirect to login
            window.location.href = '/auth/login';
          }
        } else {
          // If offline, retry after interval
          setTimeout(() => {
            this.refreshSession();
          }, OFFLINE_RETRY_INTERVAL);
        }
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private handleOnline = () => {
    // When coming back online, attempt to refresh the session
    this.refreshSession();
  };

  private handleOffline = () => {
    // When going offline, clear any scheduled refreshes
    this.clearRefreshTimeout();
  };

  public cleanup() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    this.clearRefreshTimeout();
  }
} 