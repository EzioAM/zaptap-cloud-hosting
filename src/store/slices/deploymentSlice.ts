/**
 * deploymentSlice.ts
 * Redux slice for managing NFC/QR deployment state
 * Features: deployment creation, NFC writing, QR generation, sharing
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { EventLogger } from '../../utils/EventLogger';

// Deployment types
export interface Deployment {
  id: string;
  automation_id: string;
  type: 'nfc' | 'qr' | 'url';
  deployment_key: string;
  is_active: boolean;
  access_type: 'public' | 'private' | 'password';
  password_hash?: string;
  usage_count: number;
  max_uses?: number;
  expires_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  metadata?: {
    nfc_tag_id?: string;
    qr_data?: string;
    share_url?: string;
    description?: string;
  };
}

export interface DeploymentState {
  // Current deployment being created/managed
  currentDeployment: Deployment | null;
  
  // List of user's deployments
  deployments: Deployment[];
  
  // NFC state
  nfc: {
    isSupported: boolean;
    isEnabled: boolean;
    isWriting: boolean;
    isReading: boolean;
    lastTagData: string | null;
    error: string | null;
  };
  
  // QR state
  qr: {
    isGenerating: boolean;
    generatedCode: string | null;
    error: string | null;
  };
  
  // Share state
  share: {
    isGenerating: boolean;
    shareUrl: string | null;
    shortUrl: string | null;
    error: string | null;
  };
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // Form state for deployment creation
  form: {
    automationId: string | null;
    type: 'nfc' | 'qr' | 'url';
    accessType: 'public' | 'private' | 'password';
    password: string;
    description: string;
    maxUses: number | null;
    expiresAt: string | null;
    isSubmitting: boolean;
    validationErrors: Record<string, string>;
  };
}

// Initial state
const initialState: DeploymentState = {
  currentDeployment: null,
  deployments: [],
  nfc: {
    isSupported: false,
    isEnabled: false,
    isWriting: false,
    isReading: false,
    lastTagData: null,
    error: null,
  },
  qr: {
    isGenerating: false,
    generatedCode: null,
    error: null,
  },
  share: {
    isGenerating: false,
    shareUrl: null,
    shortUrl: null,
    error: null,
  },
  isLoading: false,
  error: null,
  form: {
    automationId: null,
    type: 'qr',
    accessType: 'public',
    password: '',
    description: '',
    maxUses: null,
    expiresAt: null,
    isSubmitting: false,
    validationErrors: {},
  },
};

// Async thunks

/**
 * Create a new deployment
 */
export const createDeployment = createAsyncThunk(
  'deployment/create',
  async (deploymentData: {
    automationId: string;
    type: 'nfc' | 'qr' | 'url';
    accessType: 'public' | 'private' | 'password';
    password?: string;
    description?: string;
    maxUses?: number;
    expiresAt?: string;
  }, { rejectWithValue }) => {
    try {
      EventLogger.info('DeploymentSlice', 'Creating deployment', deploymentData);
      
      const { supabase } = await import('../../services/supabase/client');
      const { nanoid } = await import('nanoid');
      
      // Generate unique deployment key
      const deploymentKey = nanoid(12);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Hash password if provided
      let passwordHash: string | undefined;
      if (deploymentData.password) {
        // Simple hash for demo - use proper hashing in production
        passwordHash = btoa(deploymentData.password);
      }
      
      // Create deployment record
      const deployment = {
        automation_id: deploymentData.automationId,
        type: deploymentData.type,
        deployment_key: deploymentKey,
        is_active: true,
        access_type: deploymentData.accessType,
        password_hash: passwordHash,
        usage_count: 0,
        max_uses: deploymentData.maxUses,
        expires_at: deploymentData.expiresAt,
        created_by: user.id,
        metadata: {
          description: deploymentData.description || '',
        },
      };
      
      const { data, error } = await supabase
        .from('deployments')
        .insert(deployment)
        .select()
        .single();
      
      if (error) {
        throw new Error(error.message);
      }
      
      EventLogger.info('DeploymentSlice', 'Deployment created successfully', { id: data.id });
      return data;
      
    } catch (error: any) {
      EventLogger.error('DeploymentSlice', 'Failed to create deployment:', error as Error);
      return rejectWithValue(error.message || 'Failed to create deployment');
    }
  }
);

/**
 * Write NFC tag
 */
export const writeNFCTag = createAsyncThunk(
  'deployment/writeNFC',
  async (deploymentKey: string, { rejectWithValue }) => {
    try {
      EventLogger.info('DeploymentSlice', 'Writing NFC tag', { deploymentKey });
      
      // Check if NFC is available
      const { NFCManager } = await import('../../services/nfc/NFCManager');
      
      const isSupported = await NFCManager.isSupported();
      if (!isSupported) {
        throw new Error('NFC is not supported on this device');
      }
      
      const isEnabled = await NFCManager.isEnabled();
      if (!isEnabled) {
        throw new Error('NFC is not enabled on this device');
      }
      
      // Write the tag
      const writeResult = await NFCManager.writeTag({
        type: 'url',
        data: `shortcuts-like://execute/${deploymentKey}`,
      });
      
      if (!writeResult.success) {
        throw new Error(writeResult.error || 'Failed to write NFC tag');
      }
      
      EventLogger.info('DeploymentSlice', 'NFC tag written successfully');
      return { success: true, tagId: writeResult.tagId };
      
    } catch (error: any) {
      EventLogger.error('DeploymentSlice', 'Failed to write NFC tag:', error as Error);
      return rejectWithValue(error.message || 'Failed to write NFC tag');
    }
  }
);

/**
 * Generate QR code
 */
export const generateQRCode = createAsyncThunk(
  'deployment/generateQR',
  async (deploymentKey: string, { rejectWithValue }) => {
    try {
      EventLogger.info('DeploymentSlice', 'Generating QR code', { deploymentKey });
      
      const { QRService } = await import('../../services/qr/QRService');
      
      const qrData = `shortcuts-like://execute/${deploymentKey}`;
      const qrCode = await QRService.generateQRCode(qrData, {
        size: 256,
        margin: 2,
        colorDark: '#000000',
        colorLight: '#FFFFFF',
      });
      
      EventLogger.info('DeploymentSlice', 'QR code generated successfully');
      return { qrCode, data: qrData };
      
    } catch (error: any) {
      EventLogger.error('DeploymentSlice', 'Failed to generate QR code:', error as Error);
      return rejectWithValue(error.message || 'Failed to generate QR code');
    }
  }
);

/**
 * Generate share URL
 */
export const generateShareUrl = createAsyncThunk(
  'deployment/generateShareUrl',
  async (deploymentKey: string, { rejectWithValue }) => {
    try {
      EventLogger.info('DeploymentSlice', 'Generating share URL', { deploymentKey });
      
      const baseUrl = 'https://shortcutslike.app';
      const shareUrl = `${baseUrl}/execute/${deploymentKey}`;
      
      // TODO: Implement URL shortening service
      const shortUrl = shareUrl; // For now, use the same URL
      
      EventLogger.info('DeploymentSlice', 'Share URL generated successfully');
      return { shareUrl, shortUrl };
      
    } catch (error: any) {
      EventLogger.error('DeploymentSlice', 'Failed to generate share URL:', error as Error);
      return rejectWithValue(error.message || 'Failed to generate share URL');
    }
  }
);

/**
 * Initialize NFC
 */
export const initializeNFC = createAsyncThunk(
  'deployment/initializeNFC',
  async (_, { rejectWithValue }) => {
    try {
      const { NFCManager } = await import('../../services/nfc/NFCManager');
      
      const isSupported = await NFCManager.isSupported();
      const isEnabled = isSupported ? await NFCManager.isEnabled() : false;
      
      return { isSupported, isEnabled };
      
    } catch (error: any) {
      EventLogger.error('DeploymentSlice', 'Failed to initialize NFC:', error as Error);
      return rejectWithValue(error.message || 'Failed to initialize NFC');
    }
  }
);

// Deployment slice
const deploymentSlice = createSlice({
  name: 'deployment',
  initialState,
  reducers: {
    // Current deployment management
    setCurrentDeployment: (state, action: PayloadAction<Deployment | null>) => {
      state.currentDeployment = action.payload;
    },
    
    // Form management
    updateForm: (state, action: PayloadAction<Partial<DeploymentState['form']>>) => {
      state.form = { ...state.form, ...action.payload };
    },
    
    setFormField: (state, action: PayloadAction<{ field: keyof DeploymentState['form']; value: any }>) => {
      (state.form as any)[action.payload.field] = action.payload.value;
    },
    
    setValidationErrors: (state, action: PayloadAction<Record<string, string>>) => {
      state.form.validationErrors = action.payload;
    },
    
    clearValidationErrors: (state) => {
      state.form.validationErrors = {};
    },
    
    resetForm: (state) => {
      state.form = initialState.form;
    },
    
    // NFC state management
    setNFCReading: (state, action: PayloadAction<boolean>) => {
      state.nfc.isReading = action.payload;
      if (action.payload) {
        state.nfc.error = null;
      }
    },
    
    setNFCWriting: (state, action: PayloadAction<boolean>) => {
      state.nfc.isWriting = action.payload;
      if (action.payload) {
        state.nfc.error = null;
      }
    },
    
    setNFCTagData: (state, action: PayloadAction<string | null>) => {
      state.nfc.lastTagData = action.payload;
    },
    
    setNFCError: (state, action: PayloadAction<string | null>) => {
      state.nfc.error = action.payload;
      state.nfc.isReading = false;
      state.nfc.isWriting = false;
    },
    
    // QR state management
    setQRGenerating: (state, action: PayloadAction<boolean>) => {
      state.qr.isGenerating = action.payload;
      if (action.payload) {
        state.qr.error = null;
      }
    },
    
    setQRCode: (state, action: PayloadAction<string | null>) => {
      state.qr.generatedCode = action.payload;
    },
    
    setQRError: (state, action: PayloadAction<string | null>) => {
      state.qr.error = action.payload;
      state.qr.isGenerating = false;
    },
    
    // Share state management
    setShareGenerating: (state, action: PayloadAction<boolean>) => {
      state.share.isGenerating = action.payload;
      if (action.payload) {
        state.share.error = null;
      }
    },
    
    setShareUrls: (state, action: PayloadAction<{ shareUrl: string; shortUrl: string }>) => {
      state.share.shareUrl = action.payload.shareUrl;
      state.share.shortUrl = action.payload.shortUrl;
    },
    
    setShareError: (state, action: PayloadAction<string | null>) => {
      state.share.error = action.payload;
      state.share.isGenerating = false;
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
    
    resetDeploymentState: () => {
      return initialState;
    },
  },
  
  extraReducers: (builder) => {
    // Create deployment
    builder
      .addCase(createDeployment.pending, (state) => {
        state.form.isSubmitting = true;
        state.form.validationErrors = {};
        state.error = null;
      })
      .addCase(createDeployment.fulfilled, (state, action) => {
        state.form.isSubmitting = false;
        state.currentDeployment = action.payload;
        state.deployments.push(action.payload);
      })
      .addCase(createDeployment.rejected, (state, action) => {
        state.form.isSubmitting = false;
        state.error = action.payload as string;
      });
    
    // Write NFC tag
    builder
      .addCase(writeNFCTag.pending, (state) => {
        state.nfc.isWriting = true;
        state.nfc.error = null;
      })
      .addCase(writeNFCTag.fulfilled, (state) => {
        state.nfc.isWriting = false;
      })
      .addCase(writeNFCTag.rejected, (state, action) => {
        state.nfc.isWriting = false;
        state.nfc.error = action.payload as string;
      });
    
    // Generate QR code
    builder
      .addCase(generateQRCode.pending, (state) => {
        state.qr.isGenerating = true;
        state.qr.error = null;
      })
      .addCase(generateQRCode.fulfilled, (state, action) => {
        state.qr.isGenerating = false;
        state.qr.generatedCode = action.payload.qrCode;
      })
      .addCase(generateQRCode.rejected, (state, action) => {
        state.qr.isGenerating = false;
        state.qr.error = action.payload as string;
      });
    
    // Generate share URL
    builder
      .addCase(generateShareUrl.pending, (state) => {
        state.share.isGenerating = true;
        state.share.error = null;
      })
      .addCase(generateShareUrl.fulfilled, (state, action) => {
        state.share.isGenerating = false;
        state.share.shareUrl = action.payload.shareUrl;
        state.share.shortUrl = action.payload.shortUrl;
      })
      .addCase(generateShareUrl.rejected, (state, action) => {
        state.share.isGenerating = false;
        state.share.error = action.payload as string;
      });
    
    // Initialize NFC
    builder
      .addCase(initializeNFC.fulfilled, (state, action) => {
        state.nfc.isSupported = action.payload.isSupported;
        state.nfc.isEnabled = action.payload.isEnabled;
      })
      .addCase(initializeNFC.rejected, (state, action) => {
        state.nfc.error = action.payload as string;
      });
  },
});

// Export actions
export const {
  setCurrentDeployment,
  updateForm,
  setFormField,
  setValidationErrors,
  clearValidationErrors,
  resetForm,
  setNFCReading,
  setNFCWriting,
  setNFCTagData,
  setNFCError,
  setQRGenerating,
  setQRCode,
  setQRError,
  setShareGenerating,
  setShareUrls,
  setShareError,
  setLoading,
  setError,
  clearError,
  resetDeploymentState,
} = deploymentSlice.actions;

// Selectors
export const selectCurrentDeployment = (state: { deployment: DeploymentState }) => state.deployment.currentDeployment;
export const selectDeployments = (state: { deployment: DeploymentState }) => state.deployment.deployments;
export const selectDeploymentForm = (state: { deployment: DeploymentState }) => state.deployment.form;
export const selectNFCState = (state: { deployment: DeploymentState }) => state.deployment.nfc;
export const selectQRState = (state: { deployment: DeploymentState }) => state.deployment.qr;
export const selectShareState = (state: { deployment: DeploymentState }) => state.deployment.share;
export const selectDeploymentLoading = (state: { deployment: DeploymentState }) => state.deployment.isLoading;
export const selectDeploymentError = (state: { deployment: DeploymentState }) => state.deployment.error;

// Export reducer
export default deploymentSlice.reducer;