import { AutomationData } from '../../src/types';
import { QueuedOperation } from '../../src/services/offline/OfflineQueue';

/**
 * Test data factories for creating mock objects
 */
export class TestDataFactory {
  static createMockAutomation(overrides: Partial<AutomationData> = {}): AutomationData {
    return {
      id: 'test-automation-123',
      title: 'Test Automation',
      description: 'A test automation for unit testing',
      steps: [
        {
          id: 'step-1',
          type: 'sms',
          title: 'Send SMS',
          config: {
            phoneNumber: '+1234567890',
            message: 'Test message',
          },
        },
        {
          id: 'step-2',
          type: 'notification',
          title: 'Show Notification',
          config: {
            title: 'Test Notification',
            body: 'This is a test',
          },
        },
      ],
      created_by: 'test-user-456',
      is_public: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  }

  static createMockQueuedOperation(overrides: Partial<QueuedOperation> = {}): QueuedOperation {
    return {
      id: 'test-op-123',
      type: 'automation_execute',
      payload: { automationId: 'test-automation-123' },
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3,
      priority: 'normal',
      status: 'pending',
      ...overrides,
    };
  }

  static createMockNFCTag(overrides: any = {}) {
    return {
      id: 'test-tag-id',
      ndefMessage: [
        {
          tnf: 1,
          type: [0x55], // URI record
          payload: [0x04, ...Array.from(new TextEncoder().encode('zaptap.cloud/share/test123'))],
          id: [],
        },
      ],
      ...overrides,
    };
  }

  static createMockShareResult() {
    return {
      success: true,
      shareUrl: 'https://www.zaptap.cloud/share/test123',
      publicId: 'test123',
    };
  }

  static createMockSupabaseResponse(data: any = null, error: any = null) {
    return { data, error };
  }

  static createMockNetInfoState(isConnected = true) {
    return {
      isConnected,
      isInternetReachable: isConnected,
      type: isConnected ? 'wifi' : 'none',
      details: {
        isConnectionExpensive: false,
      },
    };
  }
}

/**
 * Mock implementations for external services
 */
export class MockServices {
  static createMockSupabaseClient() {
    const mockFrom = jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      limit: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
    }));

    return {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
        getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      },
      from: mockFrom,
    };
  }

  static createMockAsyncStorage() {
    const storage = new Map();
    
    return {
      getItem: jest.fn().mockImplementation((key: string) => 
        Promise.resolve(storage.get(key) || null)
      ),
      setItem: jest.fn().mockImplementation((key: string, value: string) => {
        storage.set(key, value);
        return Promise.resolve();
      }),
      removeItem: jest.fn().mockImplementation((key: string) => {
        storage.delete(key);
        return Promise.resolve();
      }),
      clear: jest.fn().mockImplementation(() => {
        storage.clear();
        return Promise.resolve();
      }),
      getAllKeys: jest.fn().mockImplementation(() => 
        Promise.resolve([...storage.keys()])
      ),
    };
  }

  static createMockNavigation() {
    return {
      navigate: jest.fn(),
      goBack: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatch: jest.fn(),
      canGoBack: jest.fn().mockReturnValue(true),
      isFocused: jest.fn().mockReturnValue(true),
    };
  }

  static createMockNFCManager() {
    return {
      start: jest.fn().mockResolvedValue(true),
      isSupported: jest.fn().mockResolvedValue(true),
      isEnabled: jest.fn().mockResolvedValue(true),
      requestTechnology: jest.fn().mockResolvedValue(true),
      getTag: jest.fn().mockResolvedValue(TestDataFactory.createMockNFCTag()),
      cancelTechnologyRequest: jest.fn().mockResolvedValue(true),
      setEventListener: jest.fn(),
      registerTagEvent: jest.fn().mockResolvedValue(true),
      unregisterTagEvent: jest.fn().mockResolvedValue(true),
      goToNfcSetting: jest.fn(),
      ndefHandler: {
        writeNdefMessage: jest.fn().mockResolvedValue(true),
      },
    };
  }
}

/**
 * Test utilities for common operations
 */
export class TestUtils {
  /**
   * Wait for async operations to complete
   */
  static async waitFor(ms: number = 0): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a mock timer and advance it
   */
  static mockTimers() {
    jest.useFakeTimers();
    return {
      advanceTime: (ms: number) => jest.advanceTimersByTime(ms),
      cleanup: () => jest.useRealTimers(),
    };
  }

  /**
   * Verify that a share URL has the correct format
   */
  static verifyShareUrlFormat(url: string): boolean {
    const urlPattern = /^https:\/\/www\.zaptap\.cloud\/share\/[a-zA-Z0-9]{12}$/;
    return urlPattern.test(url);
  }

  /**
   * Extract public ID from share URL
   */
  static extractPublicId(url: string): string | null {
    const match = url.match(/\/share\/([^/?]+)/);
    return match ? match[1] : null;
  }

  /**
   * Mock console methods
   */
  static mockConsole() {
    const originalConsole = { ...console };
    
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    
    return {
      restore: () => {
        Object.assign(console, originalConsole);
      },
    };
  }

  /**
   * Create a mock Redux store state
   */
  static createMockStoreState(overrides: any = {}) {
    return {
      auth: {
        user: null,
        isAuthenticated: false,
        loading: false,
        ...overrides.auth,
      },
      automation: {
        automations: [],
        loading: false,
        error: null,
        ...overrides.automation,
      },
      offline: {
        isOnline: true,
        queue: [],
        ...overrides.offline,
      },
      ...overrides,
    };
  }

  /**
   * Generate a random string for testing
   */
  static generateRandomString(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Assert that an error was thrown with expected message
   */
  static async expectError(
    asyncFn: () => Promise<any>,
    expectedMessage?: string
  ): Promise<Error> {
    try {
      await asyncFn();
      throw new Error('Expected function to throw an error');
    } catch (error) {
      if (expectedMessage && error.message !== expectedMessage) {
        throw new Error(
          `Expected error message "${expectedMessage}", but got "${error.message}"`
        );
      }
      return error as Error;
    }
  }

  /**
   * Create a mock component ref
   */
  static createMockRef<T>(initialValue?: T) {
    return {
      current: initialValue || null,
    };
  }

  /**
   * Simulate network conditions
   */
  static simulateNetworkConditions(isOnline: boolean) {
    const mockNetInfo = require('@react-native-community/netinfo');
    mockNetInfo.fetch.mockResolvedValue(TestDataFactory.createMockNetInfoState(isOnline));
    
    return {
      goOnline: () => {
        mockNetInfo.fetch.mockResolvedValue(TestDataFactory.createMockNetInfoState(true));
      },
      goOffline: () => {
        mockNetInfo.fetch.mockResolvedValue(TestDataFactory.createMockNetInfoState(false));
      },
    };
  }
}

/**
 * Custom matchers for Jest
 */
export const customMatchers = {
  toBeValidShareUrl: (received: string) => {
    const pass = TestUtils.verifyShareUrlFormat(received);
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid share URL`
          : `Expected ${received} to be a valid share URL (https://www.zaptap.cloud/share/{12-char-id})`,
    };
  },
  
  toBeValidPublicId: (received: string) => {
    const pass = /^[a-zA-Z0-9]{12}$/.test(received);
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid public ID`
          : `Expected ${received} to be a valid public ID (12 alphanumeric characters)`,
    };
  },
};

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidShareUrl(): R;
      toBeValidPublicId(): R;
    }
  }
}

// Add custom matchers
expect.extend(customMatchers);