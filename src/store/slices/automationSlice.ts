/**
 * automationSlice.ts
 * Redux slice for managing automation state and execution
 * Features: automation data, execution state, validation
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AutomationData, ExecutionResult, AutomationExecution } from '../../types';
import { EventLogger } from '../../utils/EventLogger';

// Automation state interface
export interface AutomationState {
  // Current automation being viewed/edited
  currentAutomation: AutomationData | null;
  
  // Automation execution state
  execution: {
    isExecuting: boolean;
    currentStepIndex: number | null;
    executionId: string | null;
    result: ExecutionResult | null;
    error: string | null;
  };
  
  // Automation data cache
  automations: AutomationData[];
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // Form state
  form: {
    isDirty: boolean;
    validationErrors: Record<string, string>;
    isSubmitting: boolean;
  };
  
  // Filters and search
  filters: {
    category: string | null;
    tags: string[];
    searchTerm: string;
    sortBy: 'created_at' | 'title' | 'execution_count' | 'rating';
    sortOrder: 'asc' | 'desc';
  };
}

// Initial state
const initialState: AutomationState = {
  currentAutomation: null,
  execution: {
    isExecuting: false,
    currentStepIndex: null,
    executionId: null,
    result: null,
    error: null,
  },
  automations: [],
  isLoading: false,
  error: null,
  form: {
    isDirty: false,
    validationErrors: {},
    isSubmitting: false,
  },
  filters: {
    category: null,
    tags: [],
    searchTerm: '',
    sortBy: 'created_at',
    sortOrder: 'desc',
  },
};

// Async thunks

/**
 * Execute an automation
 */
export const executeAutomation = createAsyncThunk(
  'automation/execute',
  async ({ automationId, deploymentKey }: { automationId: string; deploymentKey?: string }, { rejectWithValue }) => {
    try {
      EventLogger.info('AutomationSlice', 'Starting automation execution', { automationId, deploymentKey });
      
      // Import automation engine dynamically to avoid circular deps
      const { AutomationEngine } = await import('../../services/automation/AutomationEngine');
      const { supabase } = await import('../../services/supabase/client');
      
      // Get the automation data
      const { data: automation, error } = await supabase
        .from('automations')
        .select('*')
        .eq('id', automationId)
        .single();
      
      if (error || !automation) {
        throw new Error(error?.message || 'Automation not found');
      }
      
      // Create execution record
      const { data: { user } } = await supabase.auth.getUser();
      const executionRecord = {
        automation_id: automationId,
        user_id: user?.id || null,
        status: 'running' as const,
        steps_completed: 0,
        total_steps: automation.steps?.length || 0,
        created_at: new Date().toISOString(),
      };
      
      const { data: execution, error: executionError } = await supabase
        .from('executions')
        .insert(executionRecord)
        .select()
        .single();
      
      if (executionError) {
        EventLogger.warn('AutomationSlice', 'Failed to create execution record', executionError);
      }
      
      // Execute the automation
      const engine = new AutomationEngine();
      const result = await engine.execute(automation, {
        userId: user?.id,
        deploymentKey,
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
      
      EventLogger.info('AutomationSlice', 'Automation execution completed', { 
        automationId, 
        success: result.success,
        executionTime: result.executionTime 
      });
      
      return {
        executionId: execution?.id || null,
        result,
      };
      
    } catch (error: any) {
      EventLogger.error('AutomationSlice', 'Automation execution failed:', error as Error);
      return rejectWithValue(error.message || 'Execution failed');
    }
  }
);

/**
 * Validate automation data
 */
export const validateAutomation = createAsyncThunk(
  'automation/validate',
  async (automation: AutomationData, { rejectWithValue }) => {
    try {
      const { SecurityService } = await import('../../services/security/SecurityService');
      
      const validationResult = await SecurityService.validateAutomation(automation);
      
      if (!validationResult.isValid) {
        return rejectWithValue(validationResult.errors);
      }
      
      return { valid: true, warnings: validationResult.warnings };
      
    } catch (error: any) {
      EventLogger.error('AutomationSlice', 'Automation validation failed:', error as Error);
      return rejectWithValue({ general: error.message || 'Validation failed' });
    }
  }
);

// Automation slice
const automationSlice = createSlice({
  name: 'automation',
  initialState,
  reducers: {
    // Current automation management
    setCurrentAutomation: (state, action: PayloadAction<AutomationData | null>) => {
      state.currentAutomation = action.payload;
    },
    
    updateCurrentAutomation: (state, action: PayloadAction<Partial<AutomationData>>) => {
      if (state.currentAutomation) {
        state.currentAutomation = { ...state.currentAutomation, ...action.payload };
        state.form.isDirty = true;
      }
    },
    
    // Execution state management
    startExecution: (state, action: PayloadAction<{ automationId: string; executionId: string }>) => {
      state.execution.isExecuting = true;
      state.execution.executionId = action.payload.executionId;
      state.execution.currentStepIndex = 0;
      state.execution.result = null;
      state.execution.error = null;
    },
    
    updateExecutionStep: (state, action: PayloadAction<number>) => {
      state.execution.currentStepIndex = action.payload;
    },
    
    completeExecution: (state, action: PayloadAction<ExecutionResult>) => {
      state.execution.isExecuting = false;
      state.execution.result = action.payload;
      state.execution.currentStepIndex = null;
    },
    
    failExecution: (state, action: PayloadAction<string>) => {
      state.execution.isExecuting = false;
      state.execution.error = action.payload;
      state.execution.currentStepIndex = null;
    },
    
    clearExecutionState: (state) => {
      state.execution = initialState.execution;
    },
    
    // Form state management
    setFormDirty: (state, action: PayloadAction<boolean>) => {
      state.form.isDirty = action.payload;
    },
    
    setValidationErrors: (state, action: PayloadAction<Record<string, string>>) => {
      state.form.validationErrors = action.payload;
    },
    
    clearValidationErrors: (state) => {
      state.form.validationErrors = {};
    },
    
    setFormSubmitting: (state, action: PayloadAction<boolean>) => {
      state.form.isSubmitting = action.payload;
    },
    
    // Filters and search
    updateFilters: (state, action: PayloadAction<Partial<AutomationState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    clearFilters: (state) => {
      state.filters = initialState.filters;
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
    
    resetAutomationState: () => {
      return initialState;
    },
  },
  
  extraReducers: (builder) => {
    // Execute automation
    builder
      .addCase(executeAutomation.pending, (state, action) => {
        state.execution.isExecuting = true;
        state.execution.error = null;
        state.execution.result = null;
      })
      .addCase(executeAutomation.fulfilled, (state, action) => {
        state.execution.isExecuting = false;
        state.execution.executionId = action.payload.executionId;
        state.execution.result = action.payload.result;
      })
      .addCase(executeAutomation.rejected, (state, action) => {
        state.execution.isExecuting = false;
        state.execution.error = action.payload as string || 'Execution failed';
      });
    
    // Validate automation
    builder
      .addCase(validateAutomation.pending, (state) => {
        state.form.validationErrors = {};
      })
      .addCase(validateAutomation.fulfilled, (state) => {
        state.form.validationErrors = {};
      })
      .addCase(validateAutomation.rejected, (state, action) => {
        const errors = action.payload as Record<string, string>;
        state.form.validationErrors = errors || { general: 'Validation failed' };
      });
  },
});

// Export actions
export const {
  setCurrentAutomation,
  updateCurrentAutomation,
  startExecution,
  updateExecutionStep,
  completeExecution,
  failExecution,
  clearExecutionState,
  setFormDirty,
  setValidationErrors,
  clearValidationErrors,
  setFormSubmitting,
  updateFilters,
  clearFilters,
  setLoading,
  setError,
  clearError,
  resetAutomationState,
} = automationSlice.actions;

// Selectors
export const selectCurrentAutomation = (state: { automation: AutomationState }) => state.automation.currentAutomation;
export const selectExecutionState = (state: { automation: AutomationState }) => state.automation.execution;
export const selectIsExecuting = (state: { automation: AutomationState }) => state.automation.execution.isExecuting;
export const selectExecutionResult = (state: { automation: AutomationState }) => state.automation.execution.result;
export const selectFormState = (state: { automation: AutomationState }) => state.automation.form;
export const selectValidationErrors = (state: { automation: AutomationState }) => state.automation.form.validationErrors;
export const selectFilters = (state: { automation: AutomationState }) => state.automation.filters;
export const selectAutomationLoading = (state: { automation: AutomationState }) => state.automation.isLoading;
export const selectAutomationError = (state: { automation: AutomationState }) => state.automation.error;

// Export reducer
export default automationSlice.reducer;