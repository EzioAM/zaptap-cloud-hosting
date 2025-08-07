import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { EventLogger } from '../../utils/EventLogger';

/**
 * Network service for initializing and managing network state
 */
export class NetworkService {
  private static instance: NetworkService;
  private isInitialized = false;
  private unsubscribe: (() => void) | null = null;

  private constructor() {}

  /**
   * Singleton pattern implementation
   */
  public static getInstance(): NetworkService {
    if (!NetworkService.instance) {
      NetworkService.instance = new NetworkService();
    }
    return NetworkService.instance;
  }

  /**
   * Initialize network monitoring and Redux integration
   */
  public async initialize(dispatch: any): Promise<void> {
    if (this.isInitialized) {
      EventLogger.info('NetworkService', 'Already initialized');
      return;
    }

    try {
      EventLogger.info('NetworkService', 'Initializing network service');

      // Configure NetInfo for better reliability
      NetInfo.configure({
        reachabilityUrl: 'https://clients3.google.com/generate_204',
        reachabilityTest: async (response) => response.status === 204,
        reachabilityLongTimeout: 60 * 1000, // 60s
        reachabilityShortTimeout: 5 * 1000, // 5s
        reachabilityRequestTimeout: 15 * 1000, // 15s
        reachabilityShouldRun: () => true,
      });

      // Get initial network state
      try {
        const initialState = await NetInfo.fetch();
        EventLogger.info('NetworkService', 'Got initial network state', {
          type: initialState.type,
          isConnected: initialState.isConnected,
          isInternetReachable: initialState.isInternetReachable,
        });

        // Dispatch to Redux store
        const { updateNetworkState } = await import('../../store/slices/offlineSlice');
        dispatch(updateNetworkState({
          isConnected: Boolean(initialState.isConnected),
          type: initialState.type || 'unknown',
          isInternetReachable: initialState.isInternetReachable,
          details: initialState.details,
        }));
      } catch (error) {
        EventLogger.error('NetworkService', 'Failed to fetch initial network state', error as Error);
        // Set fallback offline state
        const { updateNetworkState } = await import('../../store/slices/offlineSlice');
        dispatch(updateNetworkState({
          isConnected: false,
          type: 'unknown',
          isInternetReachable: null,
          details: null,
        }));
      }

      // Listen for network changes
      this.unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
        this.handleNetworkChange(state, dispatch);
      });

      this.isInitialized = true;
      EventLogger.info('NetworkService', 'Network service initialized successfully');
    } catch (error) {
      EventLogger.error('NetworkService', 'Failed to initialize network service', error as Error);
      throw error;
    }
  }

  /**
   * Handle network state changes
   */
  private async handleNetworkChange(state: NetInfoState, dispatch: any): Promise<void> {
    try {
      EventLogger.info('NetworkService', 'Network state changed', {
        type: state.type,
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
      });

      const networkInfo = {
        isConnected: Boolean(state.isConnected),
        type: state.type || 'unknown',
        isInternetReachable: state.isInternetReachable,
        details: state.details,
      };

      // Update Redux store
      const { updateNetworkState } = await import('../../store/slices/offlineSlice');
      dispatch(updateNetworkState(networkInfo));

      // Trigger sync if connection restored
      if (networkInfo.isConnected && networkInfo.isInternetReachable !== false) {
        // Add a small delay to ensure connection is stable
        setTimeout(async () => {
          try {
            const { syncManager } = await import('../offline/SyncManager');
            await syncManager.forceSync();
          } catch (error) {
            EventLogger.error('NetworkService', 'Failed to start sync after connection restored', error as Error);
          }
        }, 2000);
      }
    } catch (error) {
      EventLogger.error('NetworkService', 'Error handling network change', error as Error);
    }
  }

  /**
   * Get current network state
   */
  public async getCurrentNetworkState(): Promise<NetInfoState> {
    try {
      return await NetInfo.fetch();
    } catch (error) {
      EventLogger.error('NetworkService', 'Failed to fetch current network state', error as Error);
      throw error;
    }
  }

  /**
   * Force refresh network state
   */
  public async refreshNetworkState(dispatch: any): Promise<void> {
    try {
      EventLogger.info('NetworkService', 'Refreshing network state');
      const state = await NetInfo.fetch();
      await this.handleNetworkChange(state, dispatch);
    } catch (error) {
      EventLogger.error('NetworkService', 'Failed to refresh network state', error as Error);
      throw error;
    }
  }

  /**
   * Check if network service is initialized
   */
  public isInitialized_(): boolean {
    return this.isInitialized;
  }

  /**
   * Cleanup network service
   */
  public cleanup(): void {
    try {
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }
      this.isInitialized = false;
      EventLogger.info('NetworkService', 'Cleanup completed');
    } catch (error) {
      EventLogger.error('NetworkService', 'Error during cleanup', error as Error);
    }
  }
}

// Export singleton instance
export const networkService = NetworkService.getInstance();