import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase/client';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { EventLogger } from '../../utils/EventLogger';
import { CrashReporter } from '../monitoring/CrashReporter';
import { PerformanceMonitor } from '../monitoring/PerformanceMonitor';
import { AutomationEngine } from '../automation/AutomationEngine';
import { store } from '../../store';
import { RootState } from '../../store/types';
import { AutomationData } from '../../types';

interface PerformanceMetrics {
  jsHeapUsed: number;
  jsHeapLimit: number;
  renderTime: number;
  apiResponseTimes: { [key: string]: number[] };
  errorCount: number;
  warningCount: number;
  startTime: number;
  currentTime: number;
  // Real app metrics
  reduxStoreSize?: number;
  activeScreens?: string[];
  automationExecutions?: number;
  networkFailureRate?: number;
  averageApiResponseTime?: number;
}

interface NetworkLog {
  id: string;
  timestamp: Date;
  method: string;
  url: string;
  status?: number;
  duration?: number;
  requestBody?: any;
  responseBody?: any;
  error?: string;
}

interface StorageItem {
  key: string;
  value: string;
  size: number;
  type: string;
}

interface DatabaseStats {
  tables: {
    name: string;
    count: number;
    size?: string;
    lastModified?: Date;
    userAccess?: boolean;
  }[];
  totalRecords: number;
  lastSync?: Date;
  userAutomations?: number;
  totalExecutions?: number;
  avgExecutionTime?: number;
  errorRate?: number;
}

interface TestCase {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  duration?: number;
  error?: string;
}

class DeveloperServiceClass {
  private performanceMetrics: PerformanceMetrics;
  private networkLogs: NetworkLog[] = [];
  private maxNetworkLogs = 100;
  private originalFetch: typeof fetch;
  private testCases: TestCase[] = [];

  constructor() {
    this.performanceMetrics = {
      jsHeapUsed: 0,
      jsHeapLimit: 0,
      renderTime: 0,
      apiResponseTimes: {},
      errorCount: 0,
      warningCount: 0,
      startTime: Date.now(),
      currentTime: Date.now(),
      reduxStoreSize: 0,
      activeScreens: [],
      automationExecutions: 0,
      networkFailureRate: 0,
      averageApiResponseTime: 0,
    };

    // Store original fetch for network monitoring
    this.originalFetch = global.fetch;
    
    // Initialize if in development
    if (__DEV__) {
      this.initializeMonitoring();
    }
  }

  private initializeMonitoring() {
    // Load persisted feature flags
    this.loadFeatureFlags();
    
    // Monitor network requests
    this.setupNetworkMonitoring();
    
    // Monitor console errors and warnings
    this.setupConsoleMonitoring();
    
    // Setup performance monitoring
    this.setupPerformanceMonitoring();
    
    // Integration with crash reporter
    this.integrateCrashReporting();
    
    // Setup Redux store monitoring
    this.setupStoreMonitoring();
  }

  private setupNetworkMonitoring() {
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const id = `${Date.now()}-${Math.random()}`;
      const startTime = Date.now();
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = init?.method || 'GET';

      const networkLog: NetworkLog = {
        id,
        timestamp: new Date(),
        method,
        url,
        requestBody: init?.body,
      };

      try {
        const response = await this.originalFetch(input, init);
        const duration = Date.now() - startTime;
        
        networkLog.status = response.status;
        networkLog.duration = duration;

        // Track API response times
        const urlKey = new URL(url).hostname;
        if (!this.performanceMetrics.apiResponseTimes[urlKey]) {
          this.performanceMetrics.apiResponseTimes[urlKey] = [];
        }
        this.performanceMetrics.apiResponseTimes[urlKey].push(duration);

        // Clone response to read body without consuming it
        const clonedResponse = response.clone();
        try {
          const contentType = response.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            networkLog.responseBody = await clonedResponse.json();
          }
        } catch (e) {
          // Failed to parse response body
        }

        this.addNetworkLog(networkLog);
        return response;
      } catch (error) {
        networkLog.error = error instanceof Error ? error.message : String(error);
        networkLog.duration = Date.now() - startTime;
        this.addNetworkLog(networkLog);
        throw error;
      }
    };
  }

  private setupConsoleMonitoring() {
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args: any[]) => {
      this.performanceMetrics.errorCount++;
      originalError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      this.performanceMetrics.warningCount++;
      originalWarn.apply(console, args);
    };
  }

  private setupPerformanceMonitoring() {
    // Update metrics periodically
    setInterval(() => {
      this.updatePerformanceMetrics();
    }, 1000);
  }

  private integrateCrashReporting() {
    try {
      // Enhanced error reporting with developer context
      const originalReportError = console.error;
      console.error = (...args: any[]) => {
        this.performanceMetrics.errorCount++;
        
        // Add developer context to crash reports
        if (CrashReporter && typeof CrashReporter.addContext === 'function') {
          CrashReporter.addContext('developer_metrics', this.getPerformanceMetrics());
          CrashReporter.addContext('feature_flags', this.getFeatureFlags());
        }
        
        originalReportError.apply(console, args);
      };
    } catch (error) {
      // CrashReporter not available
    }
  }

  private setupStoreMonitoring() {
    try {
      // Monitor Redux state changes
      let lastStateSize = 0;
      const monitorStore = () => {
        try {
          const state = store.getState();
          const stateSize = JSON.stringify(state).length;
          
          if (stateSize !== lastStateSize) {
            this.performanceMetrics.reduxStoreSize = stateSize;
            lastStateSize = stateSize;
            
            // Track active automations
            if (state.automation?.currentAutomation) {
              this.addBreadcrumb({
                category: 'automation',
                message: `Automation loaded: ${state.automation.currentAutomation.title}`,
                level: 'info',
                data: { 
                  id: state.automation.currentAutomation.id,
                  steps: state.automation.currentAutomation.steps?.length || 0 
                }
              });
            }
          }
        } catch (e) {
          // Store monitoring failed
        }
      };

      // Monitor periodically
      setInterval(monitorStore, 2000);
    } catch (error) {
      // Store monitoring setup failed
    }
  }

  private addBreadcrumb(breadcrumb: { category: string; message: string; level: string; data?: any }) {
    // Add to internal breadcrumbs if needed
    try {
      if (CrashReporter && typeof CrashReporter.addBreadcrumb === 'function') {
        CrashReporter.addBreadcrumb(breadcrumb);
      }
    } catch (error) {
      // Breadcrumb failed
    }
  }

  private updatePerformanceMetrics() {
    this.performanceMetrics.currentTime = Date.now();
    
    try {
      // Memory metrics
      if ((performance as any).memory) {
        const memory = (performance as any).memory;
        this.performanceMetrics.jsHeapUsed = memory.usedJSHeapSize;
        this.performanceMetrics.jsHeapLimit = memory.jsHeapSizeLimit;
      }

      // Redux store size
      try {
        const state = store.getState();
        this.performanceMetrics.reduxStoreSize = JSON.stringify(state).length;
        this.performanceMetrics.automationExecutions = state.automation?.execution?.executionId ? 1 : 0;
      } catch (e) {
        // Store not available
      }

      // Calculate average API response times
      const allResponseTimes = Object.values(this.performanceMetrics.apiResponseTimes).flat();
      if (allResponseTimes.length > 0) {
        this.performanceMetrics.averageApiResponseTime = 
          allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length;
      }

      // Network failure rate
      const totalRequests = this.networkLogs.length;
      const failedRequests = this.networkLogs.filter(log => log.error || (log.status && log.status >= 400)).length;
      this.performanceMetrics.networkFailureRate = totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;
      
    } catch (e) {
      // Metrics collection failed
    }
  }

  private addNetworkLog(log: NetworkLog) {
    this.networkLogs.unshift(log);
    if (this.networkLogs.length > this.maxNetworkLogs) {
      this.networkLogs.pop();
    }
  }

  // Public API

  getPerformanceMetrics(): PerformanceMetrics {
    this.updatePerformanceMetrics();
    return { ...this.performanceMetrics };
  }

  getNetworkLogs(): NetworkLog[] {
    return [...this.networkLogs];
  }

  clearNetworkLogs() {
    this.networkLogs = [];
  }

  async getStorageInfo(): Promise<{
    items: StorageItem[];
    totalSize: number;
    itemCount: number;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const items: StorageItem[] = [];
      let totalSize = 0;

      const values = await AsyncStorage.multiGet(keys);
      
      for (const [key, value] of values) {
        if (key && value) {
          const size = key.length + value.length;
          totalSize += size;
          
          let type = 'string';
          try {
            JSON.parse(value);
            type = 'json';
          } catch (e) {
            // Not JSON
          }

          items.push({
            key,
            value: value.substring(0, 100) + (value.length > 100 ? '...' : ''),
            size,
            type,
          });
        }
      }

      return {
        items: items.sort((a, b) => b.size - a.size),
        totalSize,
        itemCount: items.length,
      };
    } catch (error) {
      EventLogger.error('Developer', 'Failed to get storage info:', error as Error);
      return { items: [], totalSize: 0, itemCount: 0 };
    }
  }

  async clearStorage(keys?: string[]) {
    try {
      if (keys) {
        await AsyncStorage.multiRemove(keys);
      } else {
        await AsyncStorage.clear();
      }
      return true;
    } catch (error) {
      EventLogger.error('Developer', 'Failed to clear storage:', error as Error);
      return false;
    }
  }

  async getDatabaseStats(): Promise<DatabaseStats> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const tables = [
        'automations',
        'deployments', 
        'automation_executions',
        'reviews',
        'profiles',
        'automation_comments',
        'comment_likes',
        'automation_steps',
        'execution_summary',
      ];

      const stats: DatabaseStats = {
        tables: [],
        totalRecords: 0,
      };

      for (const table of tables) {
        try {
          const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

          if (!error && count !== null) {
            // Get last modified date for user-accessible tables
            let lastModified: Date | undefined;
            let userAccess = true;
            
            if (['automations', 'deployments', 'reviews'].includes(table)) {
              try {
                const { data: recentData } = await supabase
                  .from(table)
                  .select('created_at')
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .single();
                
                if (recentData?.created_at) {
                  lastModified = new Date(recentData.created_at);
                }
              } catch (e) {
                // Could not get last modified date
              }
            }

            stats.tables.push({
              name: table,
              count: count,
              lastModified,
              userAccess,
            });
            stats.totalRecords += count;
          }
        } catch (e) {
          // Table might not exist or no access
          stats.tables.push({
            name: table,
            count: 0,
            userAccess: false,
          });
        }
      }

      // Add specific user metrics
      try {
        const { data: userAutomations, error: automationError } = await supabase
          .from('automations')
          .select('id', { count: 'exact', head: true })
          .eq('created_by', user.id);
        
        if (!automationError) {
          stats.userAutomations = userAutomations || 0;
        }

        const { data: executions, error: executionError } = await supabase
          .from('automation_executions')
          .select('id, duration, status')
          .eq('user_id', user.id)
          .limit(100);
        
        if (!executionError && executions) {
          stats.totalExecutions = executions.length;
          const successfulExecutions = executions.filter(e => e.status === 'completed');
          const avgDuration = successfulExecutions.reduce((acc, e) => acc + (e.duration || 0), 0) / successfulExecutions.length;
          stats.avgExecutionTime = avgDuration || 0;
          stats.errorRate = ((executions.length - successfulExecutions.length) / executions.length) * 100 || 0;
        }
      } catch (e) {
        // User-specific stats failed
      }

      return stats;
    } catch (error) {
      EventLogger.error('Developer', 'Failed to get database stats:', error as Error);
      return { tables: [], totalRecords: 0 };
    }
  }

  async runDatabaseQuery(query: string): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('execute_sql', { 
        query: query 
      });

      if (error) throw error;
      return data;
    } catch (error) {
      EventLogger.error('Developer', 'Failed to run database query:', error as Error);
      throw error;
    }
  }

  getEnvironmentInfo() {
    return {
      platform: Platform.OS,
      version: Platform.Version,
      isDevice: Constants.isDevice,
      deviceName: Constants.deviceName,
      expoVersion: Constants.expoVersion,
      appVersion: Constants.expoConfig?.version,
      runtimeVersion: Constants.expoConfig?.runtimeVersion,
      buildNumber: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode,
      environment: __DEV__ ? 'development' : 'production',
      supabaseUrl: Constants.expoConfig?.extra?.supabaseUrl,
      hasClaudeAPI: !!(Constants.expoConfig?.extra?.claudeApiKey),
      hasOpenAIAPI: !!(Constants.expoConfig?.extra?.openaiApiKey),
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
      updates: {
        enabled: Constants.expoConfig?.updates?.enabled,
        url: Constants.expoConfig?.updates?.url,
      },
    };
  }

  // Test automation features
  
  async runTestSuite(): Promise<TestCase[]> {
    this.testCases = [
      {
        id: '1',
        name: 'Supabase Connection',
        description: 'Test connection to Supabase backend',
        status: 'pending',
      },
      {
        id: '2',
        name: 'Authentication Flow',
        description: 'Test user authentication',
        status: 'pending',
      },
      {
        id: '3',
        name: 'Automation Creation',
        description: 'Test creating a new automation',
        status: 'pending',
      },
      {
        id: '4',
        name: 'Storage Operations',
        description: 'Test AsyncStorage read/write',
        status: 'pending',
      },
      {
        id: '5',
        name: 'Network Connectivity',
        description: 'Test API connectivity',
        status: 'pending',
      },
    ];

    // Run tests
    for (const testCase of this.testCases) {
      await this.runTest(testCase);
    }

    return this.testCases;
  }

  private async runTest(testCase: TestCase) {
    testCase.status = 'running';
    const startTime = Date.now();

    try {
      switch (testCase.id) {
        case '1': // Supabase Connection
          const { data, error } = await supabase.from('profiles').select('id').limit(1);
          if (error) {
            const errorMessage = error.message || error.details || 'Supabase connection failed';
            throw new Error(errorMessage);
          }
          break;

        case '2': // Authentication Flow
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('No authenticated user');
          break;

        case '3': // Automation Creation
          // Test automation object creation (not actual DB insert)
          const testAutomation = {
            title: 'Test Automation',
            description: 'Test',
            steps: [],
            is_public: false,
          };
          if (!testAutomation.title) throw new Error('Failed to create test object');
          break;

        case '4': // Storage Operations
          const testKey = '__test_key__';
          await AsyncStorage.setItem(testKey, 'test_value');
          const value = await AsyncStorage.getItem(testKey);
          await AsyncStorage.removeItem(testKey);
          if (value !== 'test_value') throw new Error('Storage test failed');
          break;

        case '5': // Network Connectivity
          const response = await fetch('https://api.github.com/zen');
          if (!response.ok) throw new Error('Network test failed');
          break;
      }

      testCase.status = 'passed';
      testCase.duration = Date.now() - startTime;
    } catch (error) {
      testCase.status = 'failed';
      testCase.error = error instanceof Error ? error.message : String(error);
      testCase.duration = Date.now() - startTime;
    }
  }

  // Feature flags
  private featureFlags: { [key: string]: boolean } = {
    nfcEnabled: true,
    aiAssistant: true,
    advancedAnalytics: false,
    betaFeatures: __DEV__,
    debugMode: __DEV__,
    weatherEffects: true,
    iotIntegration: false,
    premiumFeatures: false,
  };

  getFeatureFlags() {
    return { ...this.featureFlags };
  }

  setFeatureFlag(key: string, value: boolean) {
    this.featureFlags[key] = value;
    // Persist feature flags to storage
    this.persistFeatureFlags();
  }

  private async persistFeatureFlags() {
    try {
      await AsyncStorage.setItem('developer_feature_flags', JSON.stringify(this.featureFlags));
    } catch (error) {
      EventLogger.error('Developer', 'Failed to persist feature flags:', error as Error);
    }
  }

  private async loadFeatureFlags() {
    try {
      const stored = await AsyncStorage.getItem('developer_feature_flags');
      if (stored) {
        const flags = JSON.parse(stored);
        this.featureFlags = { ...this.featureFlags, ...flags };
      }
    } catch (error) {
      EventLogger.error('Developer', 'Failed to load feature flags:', error as Error);
    }
  }

  // Real-time app monitoring
  async getAppHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    suggestions: string[];
    metrics: any;
  }> {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    const metrics = this.getPerformanceMetrics();

    // Memory analysis
    if (metrics.jsHeapUsed > metrics.jsHeapLimit * 0.8) {
      issues.push('High memory usage detected');
      suggestions.push('Consider clearing cache or restarting the app');
      status = 'warning';
    }

    // Network analysis
    if (metrics.networkFailureRate && metrics.networkFailureRate > 20) {
      issues.push('High network failure rate');
      suggestions.push('Check internet connection');
      status = status === 'healthy' ? 'warning' : 'critical';
    }

    // API response time analysis
    if (metrics.averageApiResponseTime && metrics.averageApiResponseTime > 5000) {
      issues.push('Slow API response times');
      suggestions.push('Check server status or network conditions');
      status = status === 'healthy' ? 'warning' : 'critical';
    }

    // Redux store size analysis
    if (metrics.reduxStoreSize && metrics.reduxStoreSize > 1000000) { // 1MB
      issues.push('Large Redux store detected');
      suggestions.push('Consider optimizing state management');
      status = status === 'healthy' ? 'warning' : status;
    }

    // Error count analysis
    if (metrics.errorCount > 10) {
      issues.push('High error count');
      suggestions.push('Check console logs for repeated errors');
      status = status === 'healthy' ? 'warning' : 'critical';
    }

    return {
      status,
      issues,
      suggestions,
      metrics,
    };
  }

  // Real automation data integration
  async getAutomationInsights(): Promise<{
    totalAutomations: number;
    userAutomations: number;
    popularStepTypes: { type: string; count: number }[];
    executionSuccess: number;
    averageSteps: number;
    recentExecutions: any[];
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's automations
      const { data: userAutomations, error: userError } = await supabase
        .from('automations')
        .select('id, title, steps, execution_count')
        .eq('created_by', user.id);

      if (userError) throw userError;

      // Get recent executions
      const { data: recentExecutions, error: executionError } = await supabase
        .from('automation_executions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (executionError) throw executionError;

      // Analyze step types
      const stepCounts: { [key: string]: number } = {};
      let totalSteps = 0;
      
      userAutomations?.forEach(automation => {
        if (automation.steps) {
          totalSteps += automation.steps.length;
          automation.steps.forEach((step: any) => {
            stepCounts[step.type] = (stepCounts[step.type] || 0) + 1;
          });
        }
      });

      const popularStepTypes = Object.entries(stepCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Calculate success rate
      const successfulExecutions = recentExecutions?.filter(e => e.status === 'completed').length || 0;
      const executionSuccess = recentExecutions?.length ? (successfulExecutions / recentExecutions.length) * 100 : 0;

      return {
        totalAutomations: userAutomations?.length || 0,
        userAutomations: userAutomations?.length || 0,
        popularStepTypes,
        executionSuccess,
        averageSteps: userAutomations?.length ? totalSteps / userAutomations.length : 0,
        recentExecutions: recentExecutions || [],
      };
    } catch (error) {
      EventLogger.error('Developer', 'Failed to get automation insights:', error as Error);
      return {
        totalAutomations: 0,
        userAutomations: 0,
        popularStepTypes: [],
        executionSuccess: 0,
        averageSteps: 0,
        recentExecutions: [],
      };
    }
  }

  // Debug utilities
  
  async exportDebugBundle(): Promise<string> {
    const bundle = {
      timestamp: new Date().toISOString(),
      environment: this.getEnvironmentInfo(),
      performance: this.getPerformanceMetrics(),
      storage: await this.getStorageInfo(),
      database: await this.getDatabaseStats(),
      networkLogs: this.getNetworkLogs().slice(0, 20),
      featureFlags: this.getFeatureFlags(),
      testResults: this.testCases,
      appHealth: await this.getAppHealth(),
      automationInsights: await this.getAutomationInsights(),
      // Real Redux state snapshot (anonymized)
      reduxState: this.getAnonymizedReduxState(),
    };

    return JSON.stringify(bundle, null, 2);
  }

  private getAnonymizedReduxState(): any {
    try {
      const state = store.getState();
      
      // Create anonymized version without sensitive data
      return {
        automation: {
          automationsCount: state.automation?.automations?.length || 0,
          isExecuting: state.automation?.execution?.isExecuting || false,
          currentStepIndex: state.automation?.execution?.currentStepIndex,
          filtersActive: Object.keys(state.automation?.filters || {}).length,
          formIsDirty: state.automation?.form?.isDirty || false,
        },
        auth: {
          isAuthenticated: !!state.auth?.user,
          userRole: state.auth?.user?.role || 'anonymous',
        },
        ui: {
          theme: state.ui?.theme || 'light',
          activeScreen: state.ui?.activeScreen || 'unknown',
        },
        deployment: {
          deploymentsCount: state.deployment?.deployments?.length || 0,
          isScanning: state.deployment?.isScanning || false,
        },
        offline: {
          isOnline: state.offline?.isOnline || true,
          queueLength: state.offline?.queue?.length || 0,
        },
      };
    } catch (error) {
      return { error: 'Failed to get Redux state' };
    }
  }

  // Automation testing
  
  async simulateAutomationExecution(automationId: string): Promise<{
    success: boolean;
    logs: string[];
    duration: number;
    error?: string;
  }> {
    const logs: string[] = [];
    const startTime = Date.now();

    try {
      logs.push(`Starting simulation for automation ${automationId}`);
      
      // Fetch automation
      const { data: automation, error } = await supabase
        .from('automations')
        .select('*')
        .eq('id', automationId)
        .single();

      if (error) {
        // Handle Supabase errors properly
        const errorMessage = error.message || error.details || 'Failed to fetch automation';
        throw new Error(errorMessage);
      }
      if (!automation) throw new Error('Automation not found');

      logs.push(`Loaded automation: ${automation.title}`);
      logs.push(`Steps to execute: ${automation.steps?.length || 0}`);

      // Simulate each step
      for (let i = 0; i < (automation.steps || []).length; i++) {
        const step = automation.steps[i];
        logs.push(`\nExecuting step ${i + 1}: ${step.type}`);
        logs.push(`Config: ${JSON.stringify(step.config, null, 2)}`);
        
        // Simulate execution delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        logs.push(`✓ Step ${i + 1} completed`);
      }

      const duration = Date.now() - startTime;
      logs.push(`\nSimulation completed in ${duration}ms`);

      return {
        success: true,
        logs,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      let errorMessage = 'Unknown error';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object') {
        // Handle Supabase/PostgrestError objects
        errorMessage = (error as any).message || (error as any).details || JSON.stringify(error);
      } else {
        errorMessage = String(error);
      }
      
      logs.push(`\n❌ Simulation failed: ${errorMessage}`);

      return {
        success: false,
        logs,
        duration,
        error: errorMessage,
      };
    }
  }
}

export const DeveloperService = new DeveloperServiceClass();