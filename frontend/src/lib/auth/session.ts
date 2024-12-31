import { AuthError, Session } from '@supabase/supabase-js';
import { createSupabaseComponentClient } from '@/lib/supabase/client';

const REFRESH_THRESHOLD = 60 * 1000; // 1 minute before expiry
const MAX_RETRY_ATTEMPTS = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds
const BROADCAST_CHANNEL = 'veritas_session_sync';

export class SessionManager {
  private static instance: SessionManager;
  private refreshPromise: Promise<void> | null = null;
  private supabase = createSupabaseComponentClient();
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
      try {
        this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL);
        this.broadcastChannel.onmessage = (event) => {
          if (event.data.type === 'SESSION_UPDATED') {
            this.handleSessionUpdate(event.data.session);
          }
        };
      } catch (error) {
        console.error('Failed to setup broadcast channel:', error);
      }
    }
  }

  private broadcastSessionUpdate(session: Session | null) {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'SESSION_UPDATED',
          session,
        });
      } catch (error) {
        console.error('Failed to broadcast session update:', error);
        // If the channel is closed, try to reopen it
        this.setupBroadcastChannel();
      }
    }
  }

  private handleSessionUpdate(session: Session | null) {
    if (session) {
      this.scheduleRefresh(session);
    } else {
      this.cleanup();
    }
  }

  private handleOnline = async () => {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      if (session) {
        await this.refreshSession();
      }
    } catch (error) {
      console.error('Failed to handle online event:', error);
    }
  }

  private handleOffline = () => {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
  }

  private handleWindowFocus = async () => {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      if (session) {
        await this.refreshSession();
      }
    } catch (error) {
      console.error('Failed to handle window focus:', error);
    }
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
          this.retryAttempts = 0;
        }
      } catch (error) {
        console.error('Failed to refresh session:', error);
        if (this.retryAttempts < MAX_RETRY_ATTEMPTS) {
          const delay = Math.min(
            INITIAL_RETRY_DELAY * Math.pow(2, this.retryAttempts),
            MAX_RETRY_DELAY
          );
          this.retryAttempts++;
          setTimeout(() => this.refreshSession(), delay);
        }
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private scheduleRefresh(session: Session) {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    const expiresAt = session.expires_at;
    if (!expiresAt) return;

    const expiresAtDate = new Date(expiresAt * 1000);
    const now = new Date();
    const timeUntilExpiry = expiresAtDate.getTime() - now.getTime();
    const refreshTime = Math.max(timeUntilExpiry - REFRESH_THRESHOLD, 0);

    this.refreshTimeout = setTimeout(() => {
      this.refreshSession();
    }, refreshTime);
  }

  private setupSessionRefresh() {
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session) {
          this.scheduleRefresh(session);
          this.broadcastSessionUpdate(session);
        }
      } else if (event === 'SIGNED_OUT') {
        this.cleanup();
        this.broadcastSessionUpdate(null);
      }
    });
  }

  public cleanup() {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch (error) {
        console.error('Failed to close broadcast channel:', error);
      } finally {
        this.broadcastChannel = null;
      }
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
      window.removeEventListener('focus', this.handleWindowFocus);
    }
  }
} 