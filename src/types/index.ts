// Core automation types
  export interface AutomationStep {
    id: string;
    type: StepType;
    title: string;
    config: Record<string, any>;
    enabled: boolean;
  }

  export interface AutomationTrigger {
    id: string;
    type: TriggerType;
    enabled: boolean;
    config: Record<string, any>;
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