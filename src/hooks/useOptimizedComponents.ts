import { useMemo, useCallback } from 'react';
import { AutomationStep } from '../types';

interface UseOptimizedComponentsProps {
  steps: AutomationStep[];
  onStepUpdate?: (stepIndex: number, updates: Partial<AutomationStep>) => void;
  onStepRemove?: (stepIndex: number) => void;
  onStepToggle?: (stepIndex: number) => void;
}

/**
 * Hook to optimize component rendering by memoizing expensive operations
 * and creating stable callback references.
 */
export const useOptimizedComponents = ({
  steps,
  onStepUpdate,
  onStepRemove,
  onStepToggle,
}: UseOptimizedComponentsProps) => {
  // Memoize step statistics
  const stepStats = useMemo(() => {
    const totalSteps = steps.length;
    const enabledSteps = steps.filter(step => step.enabled).length;
    const configuredSteps = steps.filter(step => 
      step.config && Object.keys(step.config).length > 0
    ).length;
    const estimatedRuntime = totalSteps * 0.5; // seconds

    return {
      totalSteps,
      enabledSteps,
      configuredSteps,
      estimatedRuntime,
      completionPercentage: totalSteps > 0 ? (configuredSteps / totalSteps) * 100 : 0,
    };
  }, [steps]);

  // Memoize step configuration validation
  const stepValidation = useMemo(() => {
    return steps.map((step, index) => {
      const errors: string[] = [];
      
      if (!step.config || Object.keys(step.config).length === 0) {
        errors.push('Step needs configuration');
      }

      // Step-specific validation
      switch (step.type) {
        case 'sms':
          if (!step.config?.phoneNumber) errors.push('Phone number required');
          if (!step.config?.message) errors.push('Message required');
          break;
        case 'email':
          if (!step.config?.email) errors.push('Email address required');
          if (!step.config?.subject) errors.push('Subject required');
          break;
        case 'webhook':
          if (!step.config?.url) errors.push('URL required');
          break;
        case 'notification':
          if (!step.config?.message) errors.push('Message required');
          break;
      }

      return {
        stepIndex: index,
        isValid: errors.length === 0,
        errors,
      };
    });
  }, [steps]);

  // Create stable callback for step updates
  const handleStepUpdate = useCallback((stepIndex: number) => {
    return (updates: Partial<AutomationStep>) => {
      onStepUpdate?.(stepIndex, updates);
    };
  }, [onStepUpdate]);

  // Create stable callback for step removal
  const handleStepRemove = useCallback((stepIndex: number) => {
    return () => {
      onStepRemove?.(stepIndex);
    };
  }, [onStepRemove]);

  // Create stable callback for step toggle
  const handleStepToggle = useCallback((stepIndex: number) => {
    return () => {
      onStepToggle?.(stepIndex);
    };
  }, [onStepToggle]);

  // Memoize step actions for each step to prevent unnecessary re-renders
  const stepActions = useMemo(() => {
    return steps.map((_, index) => ({
      onUpdate: handleStepUpdate(index),
      onRemove: handleStepRemove(index),
      onToggle: handleStepToggle(index),
    }));
  }, [steps.length, handleStepUpdate, handleStepRemove, handleStepToggle]);

  // Memoize step rendering data
  const stepRenderData = useMemo(() => {
    return steps.map((step, index) => ({
      ...step,
      index,
      validation: stepValidation[index],
      actions: stepActions[index],
    }));
  }, [steps, stepValidation, stepActions]);

  return {
    stepStats,
    stepValidation,
    stepRenderData,
    
    // Callbacks
    handleStepUpdate,
    handleStepRemove,
    handleStepToggle,
  };
};