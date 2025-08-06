import { useCallback, useMemo } from 'react';
import { useForm, UseFormProps, FieldValues, Path, Control } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { EventLogger } from '../utils/EventLogger';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export interface FormField<T extends FieldValues> {
  name: Path<T>;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'url' | 'textarea';
  placeholder?: string;
  rules?: ValidationRule;
  defaultValue?: any;
}

export interface UseFormValidationProps<T extends FieldValues> {
  fields: FormField<T>[];
  onSubmit: (data: T) => void | Promise<void>;
  mode?: 'onBlur' | 'onChange' | 'onSubmit' | 'onTouched' | 'all';
  reValidateMode?: 'onBlur' | 'onChange' | 'onSubmit';
  defaultValues?: Partial<T>;
}

export function useFormValidation<T extends FieldValues>({
  fields,
  onSubmit,
  mode = 'onBlur',
  reValidateMode = 'onChange',
  defaultValues,
}: UseFormValidationProps<T>) {
  // Generate Yup schema from fields
  const validationSchema = useMemo(() => {
    const schemaFields: Record<string, yup.Schema> = {};

    fields.forEach((field) => {
      let fieldSchema: yup.Schema = yup.string();

      if (field.rules) {
        const { required, minLength, maxLength, pattern, custom } = field.rules;

        if (field.type === 'number') {
          fieldSchema = yup.number();
        } else if (field.type === 'email') {
          fieldSchema = yup.string().email('Please enter a valid email address');
        } else if (field.type === 'url') {
          fieldSchema = yup.string().url('Please enter a valid URL');
        }

        if (required) {
          fieldSchema = fieldSchema.required(`${field.label} is required`);
        }

        if (minLength) {
          fieldSchema = (fieldSchema as yup.StringSchema).min(
            minLength,
            `${field.label} must be at least ${minLength} characters`
          );
        }

        if (maxLength) {
          fieldSchema = (fieldSchema as yup.StringSchema).max(
            maxLength,
            `${field.label} must be no more than ${maxLength} characters`
          );
        }

        if (pattern) {
          fieldSchema = (fieldSchema as yup.StringSchema).matches(
            pattern,
            `${field.label} format is invalid`
          );
        }

        if (custom) {
          fieldSchema = fieldSchema.test(
            'custom',
            `${field.label} is invalid`,
            (value) => {
              const result = custom(value);
              return typeof result === 'boolean' ? result : false;
            }
          );
        }
      }

      schemaFields[field.name] = fieldSchema;
    });

    return yup.object().shape(schemaFields);
  }, [fields]);

  // Form configuration
  const formConfig: UseFormProps<T> = useMemo(
    () => ({
      resolver: yupResolver(validationSchema),
      mode,
      reValidateMode,
      defaultValues: defaultValues || 
        fields.reduce((acc, field) => {
          if (field.defaultValue !== undefined) {
            acc[field.name] = field.defaultValue;
          }
          return acc;
        }, {} as Partial<T>),
    }),
    [validationSchema, mode, reValidateMode, defaultValues, fields]
  );

  // Initialize form
  const form = useForm<T>(formConfig);

  // Enhanced submit handler with error handling
  const handleSubmit = useCallback(
    async (data: T) => {
      try {
        await onSubmit(data);
      } catch (error) {
        EventLogger.error('useFormValidation', 'Form submission error:', error as Error);
        // Set form errors if needed
        if (error instanceof Error) {
          form.setError('root' as Path<T>, {
            type: 'submit',
            message: error.message,
          });
        }
      }
    },
    [onSubmit, form]
  );

  // Get field props for React Native components
  const getFieldProps = useCallback(
    (fieldName: Path<T>) => {
      const field = fields.find(f => f.name === fieldName);
      const fieldState = form.getFieldState(fieldName);
      
      return {
        value: form.watch(fieldName),
        onChangeText: (text: string) => form.setValue(fieldName, text as T[Path<T>]),
        onBlur: () => form.trigger(fieldName),
        error: fieldState.error?.message,
        hasError: !!fieldState.error,
        isDirty: fieldState.isDirty,
        isTouched: fieldState.isTouched,
        placeholder: field?.placeholder,
        label: field?.label,
        secureTextEntry: field?.type === 'password',
        keyboardType: getKeyboardType(field?.type),
        autoCapitalize: getAutoCapitalize(field?.type),
        autoCorrect: field?.type !== 'email' && field?.type !== 'password',
      };
    },
    [fields, form]
  );

  // Real-time validation for individual fields
  const validateField = useCallback(
    async (fieldName: Path<T>) => {
      const isValid = await form.trigger(fieldName);
      return isValid;
    },
    [form]
  );

  // Validate all fields
  const validateForm = useCallback(async () => {
    const isValid = await form.trigger();
    return isValid;
  }, [form]);

  // Reset form
  const resetForm = useCallback(() => {
    form.reset();
  }, [form]);

  // Get form state
  const formState = useMemo(() => ({
    isValid: form.formState.isValid,
    isDirty: form.formState.isDirty,
    isSubmitting: form.formState.isSubmitting,
    errors: form.formState.errors,
    touchedFields: form.formState.touchedFields,
    dirtyFields: form.formState.dirtyFields,
  }), [form.formState]);

  return {
    // Form methods
    ...form,
    
    // Enhanced methods
    handleSubmit: form.handleSubmit(handleSubmit),
    getFieldProps,
    validateField,
    validateForm,
    resetForm,
    
    // Form state
    formState,
    
    // Field definitions
    fields,
    
    // Control for external components
    control: form.control as Control<T>,
  };
}

// Helper functions
function getKeyboardType(type?: string) {
  switch (type) {
    case 'email':
      return 'email-address';
    case 'number':
      return 'numeric';
    case 'url':
      return 'url';
    default:
      return 'default';
  }
}

function getAutoCapitalize(type?: string) {
  switch (type) {
    case 'email':
    case 'password':
    case 'url':
      return 'none';
    default:
      return 'sentences';
  }
}

export default useFormValidation;