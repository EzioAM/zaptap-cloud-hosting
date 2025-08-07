/**
 * scanSlice.ts
 * Redux slice for managing NFC/QR scanning state
 * Features: NFC scanning, QR scanning, scan history, processing
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AutomationData } from '../../types';
import { EventLogger } from '../../utils/EventLogger';

// Scan types
export interface ScanResult {
  id: string;
  type: 'nfc' | 'qr' | 'url';
  data: string;
  deploymentKey?: string;
  automation?: AutomationData;
  timestamp: string;
  processed: boolean;
  error?: string;
}

export interface ScanState {
  // Current scanning state
  isScanning: boolean;
  scanType: 'nfc' | 'qr' | null;
  
  // Current scan result
  currentScan: ScanResult | null;
  
  // Scan history
  scanHistory: ScanResult[];
  
  // Processing state
  isProcessing: boolean;
  processingResult: {
    success: boolean;
    message: string;
    executionId?: string;
  } | null;
  
  // NFC specific state
  nfc: {
    isSupported: boolean;
    isEnabled: boolean;
    isListening: boolean;
    lastTagData: string | null;
    error: string | null;
  };
  
  // QR specific state
  qr: {
    isCameraActive: boolean;
    hasPermission: boolean;
    error: string | null;
  };
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // Settings
  settings: {
    autoExecute: boolean;
    showConfirmation: boolean;
    vibrateOnScan: boolean;
    soundOnScan: boolean;
    maxHistoryItems: number;
  };
}

// Initial state
const initialState: ScanState = {
  isScanning: false,
  scanType: null,
  currentScan: null,
  scanHistory: [],
  isProcessing: false,
  processingResult: null,
  nfc: {
    isSupported: false,
    isEnabled: false,
    isListening: false,
    lastTagData: null,
    error: null,
  },
  qr: {
    isCameraActive: false,
    hasPermission: false,
    error: null,
  },
  isLoading: false,
  error: null,
  settings: {
    autoExecute: true,
    showConfirmation: true,
    vibrateOnScan: true,
    soundOnScan: true,
    maxHistoryItems: 50,
  },
};

// Async thunks

/**
 * Initialize scanning services
 */
export const initializeScanning = createAsyncThunk(
  'scan/initialize',
  async (_, { rejectWithValue }) => {
    try {
      EventLogger.info('ScanSlice', 'Initializing scanning services');
      
      const results = await Promise.allSettled([
        // Initialize NFC
        (async () => {
          try {
            const { NFCManager } = await import('../../services/nfc/NFCManager');
            const isSupported = await NFCManager.isSupported();
            const isEnabled = isSupported ? await NFCManager.isEnabled() : false;
            return { nfc: { isSupported, isEnabled } };
          } catch (error) {
            return { nfc: { isSupported: false, isEnabled: false, error: (error as Error).message } };
          }
        })(),
        
        // Check camera permissions for QR
        (async () => {
          try {
            const { PermissionsAndroid, Platform } = await import('react-native');
            
            if (Platform.OS === 'android') {
              const granted = await PermissionsAndroid.check(
                PermissionsAndroid.PERMISSIONS.CAMERA
              );
              return { qr: { hasPermission: granted } };
            } else {
              // iOS permissions are handled by the camera component
              return { qr: { hasPermission: true } };
            }
          } catch (error) {
            return { qr: { hasPermission: false, error: (error as Error).message } };
          }
        })(),
      ]);
      
      let nfcResult = { isSupported: false, isEnabled: false };
      let qrResult = { hasPermission: false };
      let errors: string[] = [];
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (index === 0 && 'nfc' in result.value) {
            nfcResult = result.value.nfc;
            if ('error' in result.value.nfc) {
              errors.push(`NFC: ${result.value.nfc.error}`);
            }
          }
          if (index === 1 && 'qr' in result.value) {
            qrResult = result.value.qr;
            if ('error' in result.value.qr) {
              errors.push(`QR: ${result.value.qr.error}`);
            }
          }
        } else {
          errors.push(`Service ${index}: ${result.reason}`);
        }
      });
      
      EventLogger.info('ScanSlice', 'Scanning services initialized', {
        nfc: nfcResult,
        qr: qrResult,
        errors
      });
      
      return {
        nfc: nfcResult,
        qr: qrResult,
        errors: errors.length > 0 ? errors : null,
      };
      
    } catch (error: any) {
      EventLogger.error('ScanSlice', 'Failed to initialize scanning services:', error as Error);
      return rejectWithValue(error.message || 'Failed to initialize scanning services');
    }
  }
);

/**
 * Start NFC scanning
 */
export const startNFCScanning = createAsyncThunk(
  'scan/startNFC',
  async (_, { rejectWithValue }) => {
    try {
      EventLogger.info('ScanSlice', 'Starting NFC scanning');
      
      const { NFCManager } = await import('../../services/nfc/NFCManager');
      
      const isSupported = await NFCManager.isSupported();
      if (!isSupported) {
        throw new Error('NFC is not supported on this device');
      }
      
      const isEnabled = await NFCManager.isEnabled();
      if (!isEnabled) {
        throw new Error('NFC is not enabled. Please enable NFC in device settings.');
      }
      
      await NFCManager.startDiscovery();
      
      EventLogger.info('ScanSlice', 'NFC scanning started successfully');
      return { success: true };
      
    } catch (error: any) {
      EventLogger.error('ScanSlice', 'Failed to start NFC scanning:', error as Error);
      return rejectWithValue(error.message || 'Failed to start NFC scanning');
    }
  }
);

/**
 * Stop NFC scanning
 */
export const stopNFCScanning = createAsyncThunk(
  'scan/stopNFC',
  async (_, { rejectWithValue }) => {
    try {
      EventLogger.info('ScanSlice', 'Stopping NFC scanning');
      
      const { NFCManager } = await import('../../services/nfc/NFCManager');
      await NFCManager.stopDiscovery();
      
      EventLogger.info('ScanSlice', 'NFC scanning stopped');
      return { success: true };
      
    } catch (error: any) {
      EventLogger.error('ScanSlice', 'Failed to stop NFC scanning:', error as Error);
      return rejectWithValue(error.message || 'Failed to stop NFC scanning');
    }
  }
);

/**
 * Process scanned data
 */
export const processScanData = createAsyncThunk(
  'scan/processData',
  async ({ type, data }: { type: 'nfc' | 'qr' | 'url'; data: string }, { rejectWithValue, dispatch, getState }) => {
    try {
      EventLogger.info('ScanSlice', 'Processing scan data', { type, data });
      
      // Extract deployment key from data
      let deploymentKey: string | null = null;
      
      // Handle different data formats
      if (data.includes('shortcuts-like://execute/')) {
        deploymentKey = data.split('shortcuts-like://execute/')[1];
      } else if (data.includes('shortcutslike.app/execute/')) {
        deploymentKey = data.split('shortcutslike.app/execute/')[1];
      } else if (data.match(/^[a-zA-Z0-9_-]{12}$/)) {
        // Direct deployment key
        deploymentKey = data;
      }
      
      if (!deploymentKey) {
        throw new Error('Invalid scan data: No deployment key found');
      }
      
      // Fetch deployment and automation data
      const { supabase } = await import('../../services/supabase/client');
      
      const { data: deployment, error: deploymentError } = await supabase
        .from('deployments')
        .select(`
          *,
          automations (*)
        `)
        .eq('deployment_key', deploymentKey)
        .eq('is_active', true)
        .single();
      
      if (deploymentError || !deployment) {
        throw new Error('Deployment not found or inactive');
      }
      
      // Check if deployment has expired
      if (deployment.expires_at && new Date(deployment.expires_at) < new Date()) {
        throw new Error('This deployment has expired');
      }
      
      // Check usage limits
      if (deployment.max_uses && deployment.usage_count >= deployment.max_uses) {
        throw new Error('This deployment has reached its usage limit');
      }
      
      // Handle password protection
      if (deployment.access_type === 'password') {
        // For now, return the scan result and let UI handle password prompt
        // Password validation will be handled when user enters password
      }
      
      const scanResult: ScanResult = {
        id: Date.now().toString(),
        type,
        data,
        deploymentKey,
        automation: deployment.automations,
        timestamp: new Date().toISOString(),
        processed: false,
      };
      
      EventLogger.info('ScanSlice', 'Scan data processed successfully', {
        deploymentKey,
        automationId: deployment.automation_id,
        accessType: deployment.access_type
      });
      
      return { scanResult, needsPassword: deployment.access_type === 'password' };
      
    } catch (error: any) {
      EventLogger.error('ScanSlice', 'Failed to process scan data:', error as Error);
      return rejectWithValue(error.message || 'Failed to process scan data');
    }
  }
);

/**
 * Execute scanned automation
 */
export const executeScanResult = createAsyncThunk(
  'scan/execute',
  async ({ scanResult, password }: { scanResult: ScanResult; password?: string }, { rejectWithValue }) => {
    try {
      EventLogger.info('ScanSlice', 'Executing scanned automation', {
        automationId: scanResult.automation?.id,
        deploymentKey: scanResult.deploymentKey
      });
      
      if (!scanResult.automation?.id) {
        throw new Error('No automation found in scan result');
      }
      
      // Import automation engine directly to avoid circular dependency
      const { AutomationEngine } = await import('../../services/automation/AutomationEngine');
      const { supabase } = await import('../../services/supabase/client');
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create execution record
      const executionRecord = {
        automation_id: scanResult.automation.id,
        user_id: user?.id || null,
        status: 'running' as const,
        steps_completed: 0,
        total_steps: scanResult.automation.steps?.length || 0,
        created_at: new Date().toISOString(),
      };
      
      const { data: execution, error: executionError } = await supabase
        .from('executions')
        .insert(executionRecord)
        .select()
        .single();
      
      if (executionError) {
        EventLogger.warn('ScanSlice', 'Failed to create execution record', executionError);
      }
      
      // Execute the automation directly
      const engine = new AutomationEngine();
      const result = await engine.execute(scanResult.automation, {
        userId: user?.id,
        deploymentKey: scanResult.deploymentKey,
        timestamp: new Date().toISOString(),
      });
      
      // Update execution record
      if (execution) {
        await supabase
          .from('executions')
          .update({
            status: result.success ? 'success' : 'failed',
            execution_time: result.executionTime,
            steps_completed: result.stepsCompleted,
            error_message: result.error || null,
            completed_at: new Date().toISOString(),
          })
          .eq('id', execution.id);
      }
      
      const executionResult = {
        executionId: execution?.id || null,
        result,
      };
      
      // Update deployment usage count
      if (scanResult.deploymentKey) {
        const { supabase } = await import('../../services/supabase/client');
        await supabase
          .from('deployments')
          .update({ usage_count: (scanResult.automation as any).usage_count + 1 })
          .eq('deployment_key', scanResult.deploymentKey);
      }
      
      EventLogger.info('ScanSlice', 'Scanned automation executed successfully', {
        executionId: executionResult.executionId,
        success: executionResult.result.success
      });
      
      return {
        success: executionResult.result.success,
        message: executionResult.result.success 
          ? 'Automation executed successfully' 
          : executionResult.result.error || 'Execution failed',
        executionId: executionResult.executionId,
      };
      
    } catch (error: any) {
      EventLogger.error('ScanSlice', 'Failed to execute scanned automation:', error as Error);
      return rejectWithValue(error.message || 'Failed to execute automation');
    }
  }
);

// Scan slice
const scanSlice = createSlice({
  name: 'scan',
  initialState,
  reducers: {
    // Scanning state management
    startScanning: (state, action: PayloadAction<'nfc' | 'qr'>) => {
      state.isScanning = true;
      state.scanType = action.payload;
      state.error = null;
      state.currentScan = null;
    },
    
    stopScanning: (state) => {
      state.isScanning = false;
      state.scanType = null;
      state.nfc.isListening = false;
      state.qr.isCameraActive = false;
    },
    
    // NFC state management
    setNFCListening: (state, action: PayloadAction<boolean>) => {
      state.nfc.isListening = action.payload;
      if (action.payload) {
        state.nfc.error = null;
      }
    },
    
    setNFCTagData: (state, action: PayloadAction<string | null>) => {
      state.nfc.lastTagData = action.payload;
    },
    
    setNFCError: (state, action: PayloadAction<string | null>) => {
      state.nfc.error = action.payload;
      state.nfc.isListening = false;
    },
    
    // QR state management
    setCameraActive: (state, action: PayloadAction<boolean>) => {
      state.qr.isCameraActive = action.payload;
      if (action.payload) {
        state.qr.error = null;
      }
    },
    
    setCameraPermission: (state, action: PayloadAction<boolean>) => {
      state.qr.hasPermission = action.payload;
    },
    
    setQRError: (state, action: PayloadAction<string | null>) => {
      state.qr.error = action.payload;
      state.qr.isCameraActive = false;
    },
    
    // Scan result management
    setCurrentScan: (state, action: PayloadAction<ScanResult | null>) => {
      state.currentScan = action.payload;
    },
    
    addToHistory: (state, action: PayloadAction<ScanResult>) => {
      state.scanHistory.unshift(action.payload);
      
      // Limit history size
      if (state.scanHistory.length > state.settings.maxHistoryItems) {
        state.scanHistory = state.scanHistory.slice(0, state.settings.maxHistoryItems);
      }
    },
    
    markScanProcessed: (state, action: PayloadAction<string>) => {
      const scan = state.scanHistory.find(s => s.id === action.payload);
      if (scan) {
        scan.processed = true;
      }
      if (state.currentScan && state.currentScan.id === action.payload) {
        state.currentScan.processed = true;
      }
    },
    
    removeFromHistory: (state, action: PayloadAction<string>) => {
      state.scanHistory = state.scanHistory.filter(s => s.id !== action.payload);
    },
    
    clearHistory: (state) => {
      state.scanHistory = [];
    },
    
    // Settings management
    updateSettings: (state, action: PayloadAction<Partial<ScanState['settings']>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    
    // General state management
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    resetScanState: () => {
      return initialState;
    },
  },
  
  extraReducers: (builder) => {
    // Initialize scanning
    builder
      .addCase(initializeScanning.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(initializeScanning.fulfilled, (state, action) => {
        state.isLoading = false;
        state.nfc.isSupported = action.payload.nfc.isSupported;
        state.nfc.isEnabled = action.payload.nfc.isEnabled;
        state.qr.hasPermission = action.payload.qr.hasPermission;
        
        if (action.payload.errors) {
          state.error = action.payload.errors.join('; ');
        }
      })
      .addCase(initializeScanning.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
    
    // Start NFC scanning
    builder
      .addCase(startNFCScanning.pending, (state) => {
        state.nfc.isListening = true;
        state.nfc.error = null;
      })
      .addCase(startNFCScanning.fulfilled, (state) => {
        state.nfc.isListening = true;
      })
      .addCase(startNFCScanning.rejected, (state, action) => {
        state.nfc.isListening = false;
        state.nfc.error = action.payload as string;
      });
    
    // Stop NFC scanning
    builder
      .addCase(stopNFCScanning.fulfilled, (state) => {
        state.nfc.isListening = false;
      });
    
    // Process scan data
    builder
      .addCase(processScanData.pending, (state) => {
        state.isProcessing = true;
        state.error = null;
      })
      .addCase(processScanData.fulfilled, (state, action) => {
        state.isProcessing = false;
        state.currentScan = action.payload.scanResult;
        state.scanHistory.unshift(action.payload.scanResult);
        
        // Limit history size
        if (state.scanHistory.length > state.settings.maxHistoryItems) {
          state.scanHistory = state.scanHistory.slice(0, state.settings.maxHistoryItems);
        }
      })
      .addCase(processScanData.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = action.payload as string;
      });
    
    // Execute scan result
    builder
      .addCase(executeScanResult.pending, (state) => {
        state.isProcessing = true;
        state.processingResult = null;
      })
      .addCase(executeScanResult.fulfilled, (state, action) => {
        state.isProcessing = false;
        state.processingResult = action.payload;
        
        // Mark current scan as processed
        if (state.currentScan) {
          state.currentScan.processed = true;
        }
      })
      .addCase(executeScanResult.rejected, (state, action) => {
        state.isProcessing = false;
        state.processingResult = {
          success: false,
          message: action.payload as string,
        };
      });
  },
});

// Export actions
export const {
  startScanning,
  stopScanning,
  setNFCListening,
  setNFCTagData,
  setNFCError,
  setCameraActive,
  setCameraPermission,
  setQRError,
  setCurrentScan,
  addToHistory,
  markScanProcessed,
  removeFromHistory,
  clearHistory,
  updateSettings,
  setLoading,
  setError,
  clearError,
  resetScanState,
} = scanSlice.actions;

// Selectors
export const selectIsScanning = (state: { scan: ScanState }) => state.scan.isScanning;
export const selectScanType = (state: { scan: ScanState }) => state.scan.scanType;
export const selectCurrentScan = (state: { scan: ScanState }) => state.scan.currentScan;
export const selectScanHistory = (state: { scan: ScanState }) => state.scan.scanHistory;
export const selectIsProcessing = (state: { scan: ScanState }) => state.scan.isProcessing;
export const selectProcessingResult = (state: { scan: ScanState }) => state.scan.processingResult;
export const selectNFCState = (state: { scan: ScanState }) => state.scan.nfc;
export const selectQRState = (state: { scan: ScanState }) => state.scan.qr;
export const selectScanSettings = (state: { scan: ScanState }) => state.scan.settings;
export const selectScanLoading = (state: { scan: ScanState }) => state.scan.isLoading;
export const selectScanError = (state: { scan: ScanState }) => state.scan.error;

// Export reducer
export default scanSlice.reducer;