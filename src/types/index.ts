// Core automation types
  export interface AutomationStep {
    id: string;
    type: StepType;
    title: string;
    config: StepConfig;
    enabled: boolean;
  }

  export interface AutomationTrigger {
    id: string;
    type: TriggerType;
    enabled: boolean;
    config: TriggerConfig;
  }

  export type TriggerType = 
    | 'location_enter'
    | 'location_exit'
    | 'time_based'
    | 'nfc_scan'
    | 'qr_scan';

  export interface LocationTriggerConfig {
    latitude: number;
    longitude: number;
    radius: number; // in meters
    name: string;
    address?: string;
  }

  export interface TimeTriggerConfig {
    time: string; // HH:MM format
    days?: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
    timezone?: string;
  }

  export interface NFCTriggerConfig {
    tagId?: string;
    payload?: string;
  }

  export interface QRTriggerConfig {
    code: string;
    payload?: string;
  }

  // Union type for all trigger configurations
  export type TriggerConfig = 
    | LocationTriggerConfig
    | TimeTriggerConfig
    | NFCTriggerConfig
    | QRTriggerConfig;

  export interface AutomationData {
    id: string;
    title: string;
    description: string;
    steps: AutomationStep[];
    triggers?: AutomationTrigger[];
    created_by: string;
    created_at: string;
    updated_at: string;
    is_public: boolean;
    category: string;
    tags: string[];
    execution_count: number;
    average_rating: number;
    rating_count: number;
  }

  export type StepType =
    | 'notification'
    | 'sms'
    | 'email'
    | 'webhook'
    | 'delay'
    | 'condition'
    | 'variable'
    | 'clipboard'
    | 'open_url'
    | 'share_text'
    | 'location'
    | 'loop'
    | 'text'
    | 'math'
    | 'photo'
    | 'app'
    | 'get_variable'
    | 'prompt_input';

  // Step Configuration Types
  export interface NotificationStepConfig {
    title?: string;
    message: string;
  }

  export interface SMSStepConfig {
    phoneNumber: string;
    message: string;
  }

  export interface EmailStepConfig {
    email: string;
    subject: string;
    message: string;
  }

  export interface WebhookStepConfig {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: string;
    headers?: Record<string, string>;
  }

  export interface DelayStepConfig {
    delay: number; // milliseconds
  }

  export interface VariableStepConfig {
    name: string;
    value: string | number | boolean;
  }

  export interface GetVariableStepConfig {
    name: string;
    defaultValue?: string | number | boolean;
  }

  export interface PromptInputStepConfig {
    title: string;
    message: string;
    defaultValue?: string;
    variableName: string;
  }

  export interface LocationStepConfig {
    action: 'get_current' | 'share_location' | 'open_maps';
    showResult?: boolean;
    phoneNumber?: string;
    useCurrentLocation?: boolean;
    latitude?: number;
    longitude?: number;
    label?: string;
  }

  export interface ConditionStepConfig {
    variable: string;
    condition: 'equals' | 'contains' | 'greater' | 'less';
    value: string | number;
    trueActions?: AutomationStep[];
    falseActions?: AutomationStep[];
  }

  export interface LoopStepConfig {
    type: 'count' | 'while' | 'foreach';
    count?: number;
    condition?: string;
    actions?: AutomationStep[];
  }

  export interface TextStepConfig {
    action: 'combine' | 'replace' | 'format';
    text1: string;
    text2?: string;
    separator?: string;
  }

  export interface MathStepConfig {
    operation: 'add' | 'subtract' | 'multiply' | 'divide';
    number1: number;
    number2: number;
  }

  export interface PhotoStepConfig {
    action: 'take' | 'select';
    saveToAlbum?: boolean;
  }

  export interface ClipboardStepConfig {
    action: 'copy' | 'paste';
    text?: string;
  }

  export interface AppStepConfig {
    appName: string;
    url?: string;
  }

  // Union type for all step configurations
  export type StepConfig = 
    | NotificationStepConfig
    | SMSStepConfig
    | EmailStepConfig
    | WebhookStepConfig
    | DelayStepConfig
    | VariableStepConfig
    | GetVariableStepConfig
    | PromptInputStepConfig
    | LocationStepConfig
    | ConditionStepConfig
    | LoopStepConfig
    | TextStepConfig
    | MathStepConfig
    | PhotoStepConfig
    | ClipboardStepConfig
    | AppStepConfig;

  export interface ExecutionResult {
    success: boolean;
    error?: string;
    executionTime: number;
    stepsCompleted: number;
    totalSteps: number;
    timestamp: string;
    failedStep?: number;
  }

  export interface ExecutionContext {
    userId?: string;
    deploymentKey?: string;
    timestamp: string;
    onStepStart?: (stepIndex: number, step: AutomationStep) => void;
    onStepComplete?: (stepIndex: number, result: any) => void;
    onStepError?: (stepIndex: number, error: string) => void;
  }

  export interface AutomationReview {
    id: string;
    automation_id: string;
    user_id: string;
    rating: number; // 1-5 stars
    comment?: string;
    created_at: string;
    updated_at: string;
    helpful_count: number;
    reported: boolean;
    user_email?: string; // for display purposes
    automation_title?: string; // for display purposes
  }

  export interface RatingStats {
    average_rating: number;
    total_reviews: number;
    rating_breakdown: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
  }

  // Execution tracking types
  export interface AutomationExecution {
    id: string;
    automation_id: string;
    user_id: string;
    status: 'running' | 'success' | 'failed' | 'cancelled';
    execution_time: number | null;
    steps_completed: number;
    total_steps: number;
    error_message: string | null;
    created_at: string;
    completed_at: string | null;
  }

  export interface StepExecution {
    id: string;
    execution_id: string;
    step_index: number;
    step_type: string;
    status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
    execution_time: number | null;
    input_data: any;
    output_data: any;
    error_message: string | null;
    created_at: string;
  }

  export interface UserStats {
    total_automations: number;
    total_runs: number;
    successful_runs: number;
    failed_runs: number;
    total_time_saved: number;
  }

  // API Response Types
  export interface ApiResponse<T> {
    data: T;
    success: boolean;
    error?: string;
    message?: string;
  }

  export interface PaginatedResponse<T> {
    data: T[];
    count: number;
    page: number;
    limit: number;
    totalPages: number;
  }

  // Error Types
  export interface ApiError {
    message: string;
    code?: string;
    status?: number;
    details?: Record<string, any>;
  }

  export interface ValidationError {
    field: string;
    message: string;
    value?: any;
  }

  export interface FormError {
    [field: string]: string;
  }

  // Component Props Types
  export interface BaseComponentProps {
    testID?: string;
    accessible?: boolean;
    accessibilityLabel?: string;
    accessibilityHint?: string;
  }

  export interface LoadingState {
    isLoading: boolean;
    error?: string;
    lastUpdated?: string;
  }

  // Type Guards
  export function isApiError(error: any): error is ApiError {
    return error && typeof error.message === 'string';
  }

  export function isValidationError(error: any): error is ValidationError {
    return error && typeof error.field === 'string' && typeof error.message === 'string';
  }

  // Utility Types
  export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
  export type Required<T, K extends keyof T> = T & RequiredFields<Pick<T, K>>;
  export type RequiredFields<T> = { [K in keyof T]-?: T[K] };

  // Theme Types
  export type ThemeMode = 'light' | 'dark' | 'system';
  
  export interface ThemeColors {
    primary: string;
    onPrimary: string;
    primaryContainer: string;
    onPrimaryContainer: string;
    secondary: string;
    onSecondary: string;
    secondaryContainer: string;
    onSecondaryContainer: string;
    tertiary: string;
    onTertiary: string;
    tertiaryContainer: string;
    onTertiaryContainer: string;
    error: string;
    onError: string;
    errorContainer: string;
    onErrorContainer: string;
    background: string;
    onBackground: string;
    surface: string;
    onSurface: string;
    surfaceVariant: string;
    onSurfaceVariant: string;
    outline: string;
    outlineVariant: string;
    shadow: string;
    scrim: string;
    inverseSurface: string;
    inverseOnSurface: string;
    inversePrimary: string;
    elevation: {
      level0: string;
      level1: string;
      level2: string;
      level3: string;
      level4: string;
      level5: string;
    };
  }