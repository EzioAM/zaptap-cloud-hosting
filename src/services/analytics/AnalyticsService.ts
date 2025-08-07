import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from '../supabase/client';
import { 
  ANALYTICS_CONFIG, 
  ANALYTICS_EVENTS, 
  SCREEN_NAMES, 
  USER_PROPERTIES,
  DEFAULT_EVENT_PROPERTIES,
  getAnalyticsConfig,
  sanitizeEventProperties
} from '../../config/analytics';
import { EventLogger } from '../../utils/EventLogger';

// Legacy interface for backward compatibility
export interface AnalyticsEvent {
  automation_id: string;
  event_type: 'view' | 'execution' | 'share' | 'download' | 'like' | 'comment' | 'edit' | 'duplicate';
  event_data?: Record<string, any>;
  user_id?: string;
  session_id?: string;
  user_agent?: string;
  ip_address?: string;
  location_data?: Record<string, any>;
}

// Enhanced event interface
export interface EnhancedAnalyticsEvent {
  event_name: string;
  properties?: Record<string, any>;
  user_properties?: Record<string, any>;
  timestamp?: string;
  session_id?: string;
  user_id?: string;
  anonymous_id?: string;
  context?: {
    app?: {
      name: string;
      version: string;
      build: string;
    };
    device?: {
      type: string;
      model: string;
      manufacturer: string;
    };
    os?: {
      name: string;
      version: string;
    };
    screen?: {
      width: number;
      height: number;
      density: number;
    };
    network?: {
      bluetooth: boolean;
      cellular: boolean;
      wifi: boolean;
    };
    location?: {
      country: string;
      region: string;
      city: string;
    };
  };
}

export interface UserProperties {
  [key: string]: any;
  user_id?: string;
  email?: string;
  display_name?: string;
  created_at?: string;
  total_automations?: number;
  onboarding_completed?: boolean;
}

export interface AnalyticsConfig {
  enabled: boolean;
  userId?: string;
  anonymousId?: string;
  sessionId?: string;
  hasConsent?: boolean;
  userProperties?: UserProperties;
}

interface EventBatch {
  events: EnhancedAnalyticsEvent[];
  timestamp: string;
  batch_id: string;
}

interface ConsentSettings {
  analytics: boolean;
  performance: boolean;
  marketing: boolean;
  functional: boolean;
  timestamp: string;
}

export interface AnalyticsStats {
  views: number;
  executions: number;
  shares: number;
  downloads: number;
  likes: number;
  comments: number;
  unique_users: number;
  last_activity: string | null;
  daily_stats: Array<{
    date: string;
    views: number;
    executions: number;
    shares: number;
  }>;
  top_countries: Array<{
    country: string;
    count: number;
  }>;
}

export class AnalyticsService {
  private static instance: AnalyticsService;
  private config: AnalyticsConfig;
  private eventQueue: EnhancedAnalyticsEvent[] = [];
  private isInitialized = false;
  private isFlushing = false;
  private sessionStartTime = Date.now();
  private lastActivityTime = Date.now();
  private consentSettings?: ConsentSettings;
  
  // Storage keys
  private static readonly CONSENT_KEY = 'analytics_consent';
  private static readonly USER_ID_KEY = 'analytics_user_id';
  private static readonly ANONYMOUS_ID_KEY = 'analytics_anonymous_id';
  private static readonly SESSION_ID_KEY = 'analytics_session_id';
  private static readonly USER_PROPERTIES_KEY = 'analytics_user_properties';
  private static readonly OFFLINE_EVENTS_KEY = 'analytics_offline_events';

  private constructor() {
    this.config = {
      enabled: getAnalyticsConfig().enabled,
      hasConsent: false,
    };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Initialize analytics service
   */
  public async initialize(options: {
    apiKey?: string;
    environment?: string;
    userId?: string;
    debugMode?: boolean;
  } = {}): Promise<void> {
    try {
      EventLogger.info('Analytics', 'Initializing analytics service', options);

      // Load persisted settings in background to avoid blocking
      this.loadPersistedData().catch(error => {
        EventLogger.warn('Analytics', 'Failed to load persisted data, continuing with defaults', error);
      });
      
      // Generate session ID if needed
      if (!this.config.sessionId) {
        this.config.sessionId = this.generateSessionId();
        await AsyncStorage.setItem(AnalyticsService.SESSION_ID_KEY, this.config.sessionId);
      }

      // Generate anonymous ID if needed
      if (!this.config.anonymousId) {
        this.config.anonymousId = this.generateAnonymousId();
        await AsyncStorage.setItem(AnalyticsService.ANONYMOUS_ID_KEY, this.config.anonymousId);
      }

      // Set up periodic flush
      this.setupPeriodicFlush();
      
      // Set up session management
      this.setupSessionManagement();
      
      // Load offline events
      await this.loadOfflineEvents();

      this.isInitialized = true;
      EventLogger.info('Analytics', 'Analytics service initialized successfully');
      
      // Track app opened event
      this.track(ANALYTICS_EVENTS.APP_OPENED, {
        session_id: this.config.sessionId,
        is_first_launch: !this.config.userId,
      });
      
    } catch (error) {
      EventLogger.error('Analytics', 'Failed to initialize analytics', error as Error);
    }
  }

  /**
   * Set user consent for analytics tracking
   */
  public async setConsent(consent: Partial<ConsentSettings>): Promise<void> {
    this.consentSettings = {
      analytics: consent.analytics ?? false,
      performance: consent.performance ?? false,
      marketing: consent.marketing ?? false,
      functional: consent.functional ?? true, // Functional cookies are usually required
      timestamp: new Date().toISOString(),
    };

    this.config.hasConsent = this.consentSettings.analytics;

    await AsyncStorage.setItem(
      AnalyticsService.CONSENT_KEY,
      JSON.stringify(this.consentSettings)
    );

    EventLogger.info('Analytics', 'User consent updated', this.consentSettings);

    // Track consent event
    if (this.consentSettings.analytics) {
      this.track('consent_given', {
        consent_types: Object.keys(consent),
      });
    }
  }

  /**
   * Identify a user
   */
  public async identify(userId: string, properties?: UserProperties): Promise<void> {
    if (!this.hasConsent()) return;

    this.config.userId = userId;
    this.config.userProperties = { ...this.config.userProperties, ...properties, user_id: userId };

    await AsyncStorage.setItem(AnalyticsService.USER_ID_KEY, userId);
    await AsyncStorage.setItem(
      AnalyticsService.USER_PROPERTIES_KEY,
      JSON.stringify(this.config.userProperties)
    );

    EventLogger.info('Analytics', 'User identified', { userId, properties });

    // Track user login if this is a new identification
    this.track(ANALYTICS_EVENTS.USER_LOGGED_IN, {
      user_id: userId,
      ...properties,
    });
  }

  /**
   * Clear user identification (logout)
   */
  public async reset(): Promise<void> {
    const oldUserId = this.config.userId;
    
    this.config.userId = undefined;
    this.config.userProperties = {};
    this.config.sessionId = this.generateSessionId();

    await AsyncStorage.multiRemove([
      AnalyticsService.USER_ID_KEY,
      AnalyticsService.USER_PROPERTIES_KEY,
      AnalyticsService.SESSION_ID_KEY,
    ]);
    await AsyncStorage.setItem(AnalyticsService.SESSION_ID_KEY, this.config.sessionId);

    EventLogger.info('Analytics', 'User context reset', { oldUserId });

    if (oldUserId && this.hasConsent()) {
      this.track(ANALYTICS_EVENTS.USER_LOGGED_OUT, {
        previous_user_id: oldUserId,
      });
    }
  }

  /**
   * Update user properties
   */
  public async setUserProperties(properties: UserProperties): Promise<void> {
    if (!this.hasConsent()) return;

    this.config.userProperties = { ...this.config.userProperties, ...properties };
    
    await AsyncStorage.setItem(
      AnalyticsService.USER_PROPERTIES_KEY,
      JSON.stringify(this.config.userProperties)
    );

    EventLogger.info('Analytics', 'User properties updated', properties);
  }

  /**
   * Track an event
   */
  public track(eventName: string, properties?: Record<string, any>): void {
    if (!this.shouldTrackEvent(eventName)) {
      return;
    }

    try {
      const event: EnhancedAnalyticsEvent = {
        event_name: eventName,
        properties: this.enrichProperties(properties),
        user_properties: this.config.userProperties,
        timestamp: new Date().toISOString(),
        session_id: this.config.sessionId,
        user_id: this.config.userId,
        anonymous_id: this.config.anonymousId,
        context: this.buildContext(),
      };

      this.eventQueue.push(event);
      this.lastActivityTime = Date.now();

      EventLogger.analyticsEvent(eventName, properties);

      // Auto-flush if queue is full
      if (this.eventQueue.length >= getAnalyticsConfig().batchSize) {
        this.flush();
      }
    } catch (error) {
      EventLogger.error('Analytics', 'Failed to track event', error as Error, { eventName, properties });
    }
  }

  /**
   * Track screen view
   */
  public trackScreen(screenName: string, properties?: Record<string, any>): void {
    this.track(ANALYTICS_EVENTS.SCREEN_VIEWED, {
      screen_name: screenName,
      ...properties,
    });
  }

  /**
   * Time an operation
   */
  public time<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    
    return fn().finally(() => {
      const duration = Date.now() - startTime;
      this.track('operation_timed', {
        operation,
        duration,
      });
    });
  }

  /**
   * Track revenue event (for future premium features)
   */
  public trackRevenue(amount: number, currency: string = 'USD', properties?: Record<string, any>): void {
    this.track('revenue', {
      amount,
      currency,
      ...properties,
    });
  }

  /**
   * Flush events to backend
   */
  public async flush(): Promise<void> {
    if (!this.hasConsent() || this.isFlushing || this.eventQueue.length === 0) {
      return;
    }

    this.isFlushing = true;
    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const batch: EventBatch = {
        events,
        timestamp: new Date().toISOString(),
        batch_id: this.generateBatchId(),
      };

      // Store offline if network is unavailable
      const isOnline = await this.checkNetworkStatus();
      if (!isOnline) {
        await this.storeOfflineEvents(events);
        EventLogger.info('Analytics', 'Events stored offline', { count: events.length });
        return;
      }

      // Send to backend (using existing Supabase integration)
      await this.sendEventBatch(batch);
      EventLogger.info('Analytics', 'Events flushed successfully', { count: events.length });
      
    } catch (error) {
      // Put events back in queue on failure
      this.eventQueue.unshift(...events);
      await this.storeOfflineEvents(events);
      EventLogger.error('Analytics', 'Failed to flush events', error as Error);
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  static async trackEvent(event: AnalyticsEvent): Promise<boolean> {
    try {
      const analytics = AnalyticsService.getInstance();
      
      // Convert legacy event to new format
      const eventName = `automation_${event.event_type}`;
      const properties = {
        automation_id: event.automation_id,
        event_type: event.event_type,
        ...event.event_data,
      };
      
      analytics.track(eventName, properties);
      
      // Also maintain legacy database tracking for backward compatibility
      const { data: { user } } = await supabase.auth.getUser();
      
      const eventData = {
        automation_id: event.automation_id,
        event_type: event.event_type,
        event_data: event.event_data || {},
        user_id: user?.id || event.user_id,
        session_id: event.session_id || analytics.generateSessionId(),
        user_agent: event.user_agent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'Mobile App'),
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('automation_analytics')
        .insert(eventData);

      if (error) {
        EventLogger.error('Analytics', 'Failed to track legacy analytics event', error as Error);
        return false;
      }

      return true;
    } catch (error) {
      EventLogger.error('Analytics', 'Legacy analytics tracking error', error as Error);
      return false;
    }
  }

  /**
   * Get analytics stats for an automation
   */
  static async getAutomationStats(automationId: string): Promise<AnalyticsStats> {
    try {
      // Get basic stats
      const { data: analytics, error } = await supabase
        .from('automation_analytics')
        .select('event_type, user_id, created_at, location_data')
        .eq('automation_id', automationId);

      if (error) throw error;

      // Process the data
      const stats: AnalyticsStats = {
        views: analytics?.filter(a => a.event_type === 'view').length || 0,
        executions: analytics?.filter(a => a.event_type === 'execution').length || 0,
        shares: analytics?.filter(a => a.event_type === 'share').length || 0,
        downloads: analytics?.filter(a => a.event_type === 'download').length || 0,
        likes: analytics?.filter(a => a.event_type === 'like').length || 0,
        comments: analytics?.filter(a => a.event_type === 'comment').length || 0,
        unique_users: new Set(analytics?.map(a => a.user_id).filter(Boolean)).size || 0,
        last_activity: analytics?.length ? analytics[analytics.length - 1].created_at : null,
        daily_stats: this.generateDailyStats(analytics || []),
        top_countries: this.generateCountryStats(analytics || []),
      };

      return stats;
    } catch (error) {
      EventLogger.error('Analytics', 'Failed to get analytics stats:', error as Error);
      return {
        views: 0,
        executions: 0,
        shares: 0,
        downloads: 0,
        likes: 0,
        comments: 0,
        unique_users: 0,
        last_activity: null,
        daily_stats: [],
        top_countries: [],
      };
    }
  }

  /**
   * Track automation view
   */
  static async trackView(automationId: string, metadata?: Record<string, any>): Promise<void> {
    await this.trackEvent({
      automation_id: automationId,
      event_type: 'view',
      event_data: metadata,
    });
  }

  /**
   * Track automation execution
   */
  static async trackExecution(automationId: string, result: Record<string, any>): Promise<void> {
    await this.trackEvent({
      automation_id: automationId,
      event_type: 'execution',
      event_data: {
        success: result.success,
        execution_time: result.executionTime,
        steps_completed: result.stepsCompleted,
        total_steps: result.totalSteps,
      },
    });
  }

  /**
   * Track automation share
   */
  static async trackShare(automationId: string, shareMethod: string): Promise<void> {
    await this.trackEvent({
      automation_id: automationId,
      event_type: 'share',
      event_data: { method: shareMethod },
    });
  }

  /**
   * Check if we have user consent to track
   */
  private hasConsent(): boolean {
    return this.config.hasConsent === true;
  }

  /**
   * Check if we should track a specific event
   */
  private shouldTrackEvent(eventName: string): boolean {
    if (!this.isInitialized) {
      EventLogger.warn('Analytics', 'Attempted to track event before initialization', { eventName });
      return false;
    }

    if (!this.config.enabled) {
      return false;
    }

    if (!this.hasConsent()) {
      return false;
    }

    // Apply sampling
    const config = getAnalyticsConfig();
    const sampleRate = config.sampling.screenViews; // Default sampling rate
    
    if (Math.random() > sampleRate) {
      return false;
    }

    return true;
  }

  /**
   * Enrich properties with default values and context
   */
  private enrichProperties(properties?: Record<string, any>): Record<string, any> {
    return {
      ...DEFAULT_EVENT_PROPERTIES,
      session_duration: Date.now() - this.sessionStartTime,
      time_since_last_activity: Date.now() - this.lastActivityTime,
      platform: Platform.OS,
      ...sanitizeEventProperties(properties || {}),
    };
  }

  /**
   * Build context object
   */
  private buildContext() {
    return {
      app: {
        name: 'ZapTap',
        version: '1.0.0', // TODO: Get from package.json or Constants
        build: __DEV__ ? 'development' : 'production',
      },
      device: {
        type: Platform.OS === 'ios' ? 'ios' : 'android',
        model: Platform.OS, // Would need react-native-device-info for actual model
        manufacturer: Platform.OS === 'ios' ? 'Apple' : 'Android',
      },
      os: {
        name: Platform.OS,
        version: Platform.Version.toString(),
      },
    };
  }

  /**
   * Load persisted data from storage
   */
  private async loadPersistedData(): Promise<void> {
    try {
      const [
        consent,
        userId,
        anonymousId,
        sessionId,
        userProperties
      ] = await AsyncStorage.multiGet([
        AnalyticsService.CONSENT_KEY,
        AnalyticsService.USER_ID_KEY,
        AnalyticsService.ANONYMOUS_ID_KEY,
        AnalyticsService.SESSION_ID_KEY,
        AnalyticsService.USER_PROPERTIES_KEY,
      ]);

      if (consent[1]) {
        this.consentSettings = JSON.parse(consent[1]);
        this.config.hasConsent = this.consentSettings?.analytics ?? false;
      }

      if (userId[1]) {
        this.config.userId = userId[1];
      }

      if (anonymousId[1]) {
        this.config.anonymousId = anonymousId[1];
      }

      if (sessionId[1]) {
        this.config.sessionId = sessionId[1];
      }

      if (userProperties[1]) {
        this.config.userProperties = JSON.parse(userProperties[1]);
      }
    } catch (error) {
      EventLogger.error('Analytics', 'Failed to load persisted data', error as Error);
    }
  }

  /**
   * Setup periodic event flushing
   */
  private setupPeriodicFlush(): void {
    setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flush();
      }
    }, getAnalyticsConfig().flushInterval);
  }

  /**
   * Setup session management
   */
  private setupSessionManagement(): void {
    // Reset session after timeout
    setInterval(() => {
      const timeSinceLastActivity = Date.now() - this.lastActivityTime;
      if (timeSinceLastActivity > getAnalyticsConfig().sessionTimeout) {
        this.startNewSession();
      }
    }, 60000); // Check every minute
  }

  /**
   * Start a new session
   */
  private async startNewSession(): Promise<void> {
    const oldSessionId = this.config.sessionId;
    this.config.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
    this.lastActivityTime = Date.now();

    await AsyncStorage.setItem(AnalyticsService.SESSION_ID_KEY, this.config.sessionId);

    if (this.hasConsent()) {
      this.track('session_started', {
        previous_session_id: oldSessionId,
      });
    }
  }

  /**
   * Load offline events
   */
  private async loadOfflineEvents(): Promise<void> {
    try {
      const offlineEvents = await AsyncStorage.getItem(AnalyticsService.OFFLINE_EVENTS_KEY);
      if (offlineEvents) {
        const events: EnhancedAnalyticsEvent[] = JSON.parse(offlineEvents);
        this.eventQueue.unshift(...events);
        await AsyncStorage.removeItem(AnalyticsService.OFFLINE_EVENTS_KEY);
        EventLogger.info('Analytics', 'Loaded offline events', { count: events.length });
      }
    } catch (error) {
      EventLogger.error('Analytics', 'Failed to load offline events', error as Error);
    }
  }

  /**
   * Store events offline
   */
  private async storeOfflineEvents(events: EnhancedAnalyticsEvent[]): Promise<void> {
    try {
      const existingEvents = await AsyncStorage.getItem(AnalyticsService.OFFLINE_EVENTS_KEY);
      const allEvents = existingEvents ? JSON.parse(existingEvents) : [];
      
      allEvents.push(...events);
      
      // Limit offline storage
      const maxOfflineEvents = getAnalyticsConfig().maxOfflineEvents;
      if (allEvents.length > maxOfflineEvents) {
        allEvents.splice(0, allEvents.length - maxOfflineEvents);
      }
      
      await AsyncStorage.setItem(AnalyticsService.OFFLINE_EVENTS_KEY, JSON.stringify(allEvents));
    } catch (error) {
      EventLogger.error('Analytics', 'Failed to store offline events', error as Error);
    }
  }

  /**
   * Send event batch to backend
   */
  private async sendEventBatch(batch: EventBatch): Promise<void> {
    try {
      // For now, we'll send each event individually to the existing automation_analytics table
      // In a real implementation, you'd want a dedicated analytics endpoint
      
      const promises = batch.events.map(async (event) => {
        const { error } = await supabase
          .from('app_analytics')
          .insert({
            event_name: event.event_name,
            properties: event.properties,
            user_properties: event.user_properties,
            timestamp: event.timestamp,
            session_id: event.session_id,
            user_id: event.user_id,
            anonymous_id: event.anonymous_id,
            context: event.context,
            batch_id: batch.batch_id,
          });

        if (error) {
          throw error;
        }
      });

      await Promise.all(promises);
    } catch (error) {
      // Fallback to console logging if backend is unavailable
      EventLogger.info('Analytics', 'Batch send failed, events logged locally', {
        batch_id: batch.batch_id,
        event_count: batch.events.length,
        error: error,
      });
      throw error;
    }
  }

  /**
   * Check network status
   */
  private async checkNetworkStatus(): Promise<boolean> {
    // In a real implementation, use @react-native-community/netinfo
    // For now, assume online
    return true;
  }

  /**
   * Generate a session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Generate anonymous ID
   */
  private generateAnonymousId(): string {
    return `anon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Generate batch ID
   */
  private generateBatchId(): string {
    return `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Legacy method for backward compatibility - Generate a simple session ID
   */
  private static generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Generate daily stats from analytics data
   */
  private static generateDailyStats(analytics: any[]): Array<{ date: string; views: number; executions: number; shares: number }> {
    const daily: Record<string, { views: number; executions: number; shares: number }> = {};
    
    analytics.forEach(event => {
      const date = new Date(event.created_at).toISOString().split('T')[0];
      if (!daily[date]) {
        daily[date] = { views: 0, executions: 0, shares: 0 };
      }
      
      if (event.event_type === 'view') daily[date].views++;
      if (event.event_type === 'execution') daily[date].executions++;
      if (event.event_type === 'share') daily[date].shares++;
    });

    return Object.entries(daily)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // Last 30 days
  }

  /**
   * Generate country stats from location data
   */
  private static generateCountryStats(analytics: any[]): Array<{ country: string; count: number }> {
    const countries: Record<string, number> = {};
    
    analytics.forEach(event => {
      const country = event.location_data?.country || 'Unknown';
      countries[country] = (countries[country] || 0) + 1;
    });

    return Object.entries(countries)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 countries
  }

  /**
   * Get popular automations based on analytics
   */
  static async getPopularAutomations(limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('automation_stats_detailed')
        .select('*')
        .order('view_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      EventLogger.error('Analytics', 'Failed to get popular automations:', error as Error);
      return [];
    }
  }
}

// Export logger for backward compatibility with other services
export const logger = EventLogger;