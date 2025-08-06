import { useState, useCallback, useMemo } from 'react';
import { AutomationStep, StepType } from '../types';
import { EventLogger } from '../utils/EventLogger';

interface AutomationFormData {
  title: string;
  description: string;
  steps: AutomationStep[];
  category: string;
  tags: string[];
  is_public: boolean;
}

interface AutomationFormErrors {
  title?: string;
  description?: string;
  steps?: string;
  [key: string]: string | undefined;
}

interface UseAutomationFormOptions {
  initialData?: Partial<AutomationFormData>;
  onSubmit?: (data: AutomationFormData) => Promise<void>;
}

export const useAutomationForm = (options: UseAutomationFormOptions = {}) => {
  const { initialData, onSubmit } = options;

  const [formData, setFormData] = useState<AutomationFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    steps: initialData?.steps || [],
    category: initialData?.category || 'Productivity',
    tags: initialData?.tags || ['custom'],
    is_public: initialData?.is_public || false,
  });

  const [errors, setErrors] = useState<AutomationFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Validation rules
  const validate = useCallback((): AutomationFormErrors => {
    const newErrors: AutomationFormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title must be less than 100 characters';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    if (formData.steps.length === 0) {
      newErrors.steps = 'At least one step is required';
    }

    // Validate individual steps
    formData.steps.forEach((step, index) => {
      if (!step.config || Object.keys(step.config).length === 0) {
        newErrors[`step_${index}`] = `Step ${index + 1} needs configuration`;
      }

      // Step-specific validation
      switch (step.type) {
        case 'sms':
          if (!step.config.phoneNumber) {
            newErrors[`step_${index}_phone`] = 'Phone number is required';
          }
          if (!step.config.message) {
            newErrors[`step_${index}_message`] = 'Message is required';
          }
          break;
        case 'email':
          if (!step.config.email) {
            newErrors[`step_${index}_email`] = 'Email address is required';
          }
          if (!step.config.subject) {
            newErrors[`step_${index}_subject`] = 'Subject is required';
          }
          break;
        case 'webhook':
          if (!step.config.url) {
            newErrors[`step_${index}_url`] = 'URL is required';
          }
          break;
        case 'notification':
          if (!step.config.message) {
            newErrors[`step_${index}_message`] = 'Message is required';
          }
          break;
      }
    });

    return newErrors;
  }, [formData]);

  // Check if form is valid
  const isValid = useMemo(() => {
    const validationErrors = validate();
    return Object.keys(validationErrors).length === 0;
  }, [validate]);

  // Update field value
  const updateField = useCallback(<K extends keyof AutomationFormData>(
    field: K,
    value: AutomationFormData[K]
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    setIsDirty(true);

    // Clear field-specific errors when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  // Add step
  const addStep = useCallback((stepType: StepType, defaultConfig: Record<string, any> = {}) => {
    const newStep: AutomationStep = {
      id: `step_${Date.now()}`,
      type: stepType,
      title: getStepTitle(stepType),
      enabled: true,
      config: defaultConfig,
    };

    updateField('steps', [...formData.steps, newStep]);
  }, [formData.steps, updateField]);

  // Update step
  const updateStep = useCallback((stepIndex: number, updates: Partial<AutomationStep>) => {
    const updatedSteps = formData.steps.map((step, index) =>
      index === stepIndex ? { ...step, ...updates } : step
    );
    updateField('steps', updatedSteps);
  }, [formData.steps, updateField]);

  // Remove step
  const removeStep = useCallback((stepIndex: number) => {
    const updatedSteps = formData.steps.filter((_, index) => index !== stepIndex);
    updateField('steps', updatedSteps);

    // Clear step-specific errors
    setErrors(prev => {
      const newErrors = { ...prev };
      Object.keys(newErrors).forEach(key => {
        if (key.startsWith(`step_${stepIndex}`)) {
          delete newErrors[key];
        }
      });
      return newErrors;
    });
  }, [formData.steps, updateField]);

  // Reorder steps
  const reorderSteps = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const updatedSteps = [...formData.steps];
    const [movedStep] = updatedSteps.splice(fromIndex, 1);
    updatedSteps.splice(toIndex, 0, movedStep);
    updateField('steps', updatedSteps);
  }, [formData.steps, updateField]);

  // Submit form
  const handleSubmit = useCallback(async () => {
    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return false;
    }

    if (!onSubmit) {
      return true;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setIsDirty(false);
      return true;
    } catch (error) {
      EventLogger.error('Automation', 'Form submission error:', error as Error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, onSubmit, formData]);

  // Reset form
  const reset = useCallback(() => {
    setFormData({
      title: initialData?.title || '',
      description: initialData?.description || '',
      steps: initialData?.steps || [],
      category: initialData?.category || 'Productivity',
      tags: initialData?.tags || ['custom'],
      is_public: initialData?.is_public || false,
    });
    setErrors({});
    setIsDirty(false);
    setIsSubmitting(false);
  }, [initialData]);

  return {
    // Form data
    formData,
    errors,
    isSubmitting,
    isDirty,
    isValid,

    // Field updates
    updateField,

    // Step management
    addStep,
    updateStep,
    removeStep,
    reorderSteps,

    // Form actions
    handleSubmit,
    reset,
    validate: () => setErrors(validate()),
  };
};

// Helper function to get step title based on type
function getStepTitle(stepType: StepType): string {
  const stepTitles: Record<StepType, string> = {
    notification: 'Show Notification',
    sms: 'Send SMS',
    email: 'Send Email',
    webhook: 'Call Webhook',
    delay: 'Add Delay',
    condition: 'If Statement',
    variable: 'Set Variable',
    clipboard: 'Clipboard Action',
    open_url: 'Open URL',
    share_text: 'Share Text',
    location: 'Location Services',
    loop: 'Repeat Actions',
    text: 'Text Processing',
    math: 'Calculate',
    photo: 'Take Photo',
    app: 'Open App',
    get_variable: 'Get Variable',
    prompt_input: 'Ask for Input',
  };

  return stepTitles[stepType] || 'New Step';
}