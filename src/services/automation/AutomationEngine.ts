import { AutomationData, AutomationStep, ExecutionResult, ExecutionContext, AutomationExecution, StepExecution } from '../../types';
  import { Logger } from '../../utils/Logger';
  import { variableManager, VariableDefinition } from '../variables/VariableManager';
  import * as SMS from 'expo-sms';
  import * as Location from 'expo-location';
  import * as Clipboard from 'expo-clipboard';
  import * as ImagePicker from 'expo-image-picker';
  import { Alert, Linking } from 'react-native';
  import { supabase } from '../supabase/client';

  export class AutomationEngine {
    private logger: Logger;
    private isExecuting: boolean = false;
    private variables: Record<string, any> = {};
    private executionId: string | null = null;
    private executionStartTime: number = 0;

    constructor() {
      this.logger = new Logger('AutomationEngine');
    }

    private async createExecutionRecord(automationData: AutomationData): Promise<string> {
      try {
        const { data, error } = await supabase
          .from('automation_executions')
          .insert({
            automation_id: automationData.id,
            user_id: automationData.created_by,
            status: 'running',
            total_steps: automationData.steps.filter(s => s.enabled).length,
            steps_completed: 0
          })
          .select()
          .single();

        if (error) throw error;
        return data.id;
      } catch (error) {
        this.logger.error('Failed to create execution record', { error });
        throw error;
      }
    }

    private async updateStepExecution(
      stepIndex: number,
      step: AutomationStep,
      status: 'success' | 'failed',
      executionTime: number,
      output?: any,
      error?: string
    ): Promise<void> {
      if (!this.executionId) return;

      try {
        await supabase
          .from('step_executions')
          .insert({
            execution_id: this.executionId,
            step_index: stepIndex,
            step_type: step.type,
            status,
            execution_time: executionTime,
            input_data: step.config,
            output_data: output,
            error_message: error
          });

        // Update parent execution progress
        await supabase
          .from('automation_executions')
          .update({
            steps_completed: stepIndex + 1
          })
          .eq('id', this.executionId);
      } catch (error) {
        this.logger.error('Failed to update step execution', { error });
      }
    }

    private async completeExecution(status: 'success' | 'failed' | 'cancelled', error?: string): Promise<void> {
      if (!this.executionId) return;

      try {
        const executionTime = Date.now() - this.executionStartTime;
        
        await supabase
          .from('automation_executions')
          .update({
            status,
            execution_time: executionTime,
            completed_at: new Date().toISOString(),
            error_message: error
          })
          .eq('id', this.executionId);
      } catch (error) {
        this.logger.error('Failed to complete execution record', { error });
      }
    }

    async execute(
      automationData: AutomationData,
      inputs: Record<string, any> = {},
      context: Partial<ExecutionContext> = {}
    ): Promise<ExecutionResult> {
      if (this.isExecuting) {
        throw new Error('Another automation is already executing');
      }

      // Validate automation data
      if (!automationData) {
        throw new Error('Automation data is required');
      }

      if (!automationData.steps || !Array.isArray(automationData.steps)) {
        throw new Error('Automation must have steps array');
      }

      this.isExecuting = true;
      const startTime = Date.now();
      this.executionStartTime = startTime;
      let stepsCompleted = 0;

      // Create execution record if automation has an ID
      if (automationData.id) {
        try {
          this.executionId = await this.createExecutionRecord(automationData);
        } catch (error) {
          this.logger.error('Failed to create execution record:', error);
          // Continue execution even if tracking fails
        }
      }

      try {
        // Initialize variables for this execution
        this.variables = { ...inputs };
        
        this.logger.info('Starting automation execution', {
          automationId: automationData.id,
          title: automationData.title,
          stepCount: automationData.steps.length,
          executionId: this.executionId,
        });

        // Execute each step in sequence
        for (let i = 0; i < automationData.steps.length; i++) {
          const step = automationData.steps[i];

          if (!step.enabled) {
            this.logger.info(`Skipping disabled step: ${step.title}`);
            continue;
          }

          const stepStartTime = Date.now();
          
          try {
            // Notify step start
            context.onStepStart?.(i, step);

            // Execute the step
            this.logger.info(`About to execute step ${i}: ${step.title}`);
            const result = await this.executeStep(step, inputs, context);
            this.logger.info(`Step ${i} completed:`, result);

            // Track step execution
            const stepExecutionTime = Date.now() - stepStartTime;
            await this.updateStepExecution(i, step, 'success', stepExecutionTime, result);

            // Notify step complete
            context.onStepComplete?.(i, result);

            stepsCompleted++;

          } catch (stepError) {
            const errorMessage = stepError instanceof Error ? stepError.message : 'Unknown error';
            this.logger.error(`Step ${i} failed: ${step.title}`, { error: errorMessage });

            // Track failed step
            const stepExecutionTime = Date.now() - stepStartTime;
            await this.updateStepExecution(i, step, 'failed', stepExecutionTime, null, errorMessage);

            // Notify step error
            context.onStepError?.(i, errorMessage);

            // Mark execution as failed
            await this.completeExecution('failed', `Step "${step.title}" failed: ${errorMessage}`);

            return {
              success: false,
              error: `Step "${step.title}" failed: ${errorMessage}`,
              executionTime: Date.now() - startTime,
              stepsCompleted,
              totalSteps: automationData.steps.length,
              timestamp: new Date().toISOString(),
              failedStep: i,
            };
          }
        }

        const executionTime = Date.now() - startTime;

        this.logger.info('Automation completed successfully', {
          executionTime,
          stepsCompleted,
          totalSteps: automationData.steps.length,
        });

        // Mark execution as successful
        await this.completeExecution('success');

        // Update execution count in database
        if (automationData.id) {
          this.updateExecutionCount(automationData.id).catch(error => {
            this.logger.error('Failed to update execution count', { error });
          });
        }

        return {
          success: true,
          executionTime,
          stepsCompleted,
          totalSteps: automationData.steps.length,
          timestamp: new Date().toISOString(),
        };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error('Automation execution failed', { error: errorMessage });

        // Mark execution as failed
        await this.completeExecution('failed', errorMessage);

        return {
          success: false,
          error: errorMessage,
          executionTime: Date.now() - startTime,
          stepsCompleted,
          totalSteps: automationData.steps.length,
          timestamp: new Date().toISOString(),
        };
      } finally {
        this.isExecuting = false;
        // Clear execution tracking
        this.executionId = null;
        this.executionStartTime = 0;
      }
    }

    private async executeStep(
      step: AutomationStep,
      inputs: Record<string, any>,
      context: Partial<ExecutionContext>
    ): Promise<any> {
      this.logger.info(`Executing step: ${step.title}`, {
        type: step.type,
        config: step.config,
      });

      // Process variable references in step config
      const processedConfig = this.processVariableReferences(step.config);
      const processedStep = { ...step, config: processedConfig };

      // Execute step based on type
      switch (step.type) {
        case 'notification':
          return this.executeNotificationStep(processedStep);
        case 'delay':
          return this.executeDelayStep(processedStep);
        case 'variable':
          return this.executeVariableStep(processedStep, inputs);
        case 'get_variable':
          return this.executeGetVariableStep(processedStep);
        case 'prompt_input':
          return this.executePromptInputStep(processedStep);
        case 'sms':
          return this.executeSMSStep(processedStep);
        case 'email':
          return this.executeEmailStep(processedStep);
        case 'webhook':
          return this.executeWebhookStep(processedStep);
        case 'location':
          return this.executeLocationStep(processedStep);
        case 'condition':
          return this.executeConditionStep(processedStep, inputs);
        case 'loop':
          return this.executeLoopStep(processedStep, inputs, context);
        case 'text':
          return this.executeTextStep(processedStep);
        case 'math':
          return this.executeMathStep(processedStep);
        case 'photo':
          return this.executePhotoStep(processedStep);
        case 'clipboard':
          return this.executeClipboardStep(processedStep);
        case 'app':
          return this.executeAppStep(processedStep);
        default:
          this.logger.warn(`Unknown step type: ${step.type}`);
          return { type: step.type, message: 'Step type not implemented yet' };
      }
    }

    private async executeNotificationStep(step: AutomationStep): Promise<any> {
      try {
        const message = step.config.message || 'Automation notification';
        
        // Show notification using Alert for now (in production, use proper notifications)
        Alert.alert('🔔 Notification', message, [{ text: 'OK' }]);
        
        // Small delay to ensure the alert is shown
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return {
          type: 'notification',
          message: message,
          success: true,
        };
      } catch (error: any) {
        this.logger.error('Notification step failed', { error: error.message });
        return {
          type: 'notification',
          success: false,
          error: error.message,
        };
      }
    }

    private async executeDelayStep(step: AutomationStep): Promise<any> {
      const delay = step.config.delay || 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      return {
        type: 'delay',
        delay,
        success: true,
      };
    }

    private processVariableReferences(config: Record<string, any>): Record<string, any> {
      const processedConfig = { ...config };
      
      for (const [key, value] of Object.entries(processedConfig)) {
        if (typeof value === 'string' && value.includes('{{')) {
          // Replace variable references like {{variableName}}
          let processedValue = value;
          const variableMatches = value.match(/\{\{([^}]+)\}\}/g);
          
          if (variableMatches) {
            for (const match of variableMatches) {
              const variableName = match.slice(2, -2).trim();
              const variableValue = this.variables[variableName] || '';
              processedValue = processedValue.replace(match, String(variableValue));
            }
          }
          
          processedConfig[key] = processedValue;
        }
      }
      
      return processedConfig;
    }

    private async executeVariableStep(step: AutomationStep, inputs: Record<string, any>): Promise<any> {
      const variableName = step.config.name;
      const variableValue = step.config.value;

      if (variableName) {
        this.variables[variableName] = variableValue;
        inputs[variableName] = variableValue;
      }

      return {
        type: 'variable',
        name: variableName,
        value: variableValue,
        success: true,
      };
    }

    private async executeGetVariableStep(step: AutomationStep): Promise<any> {
      const variableName = step.config.name;
      const defaultValue = step.config.defaultValue || '';
      const value = this.variables[variableName] || defaultValue;

      return {
        type: 'get_variable',
        name: variableName,
        value: value,
        success: true,
      };
    }

    private async executePromptInputStep(step: AutomationStep): Promise<any> {
      const promptTitle = step.config.title || 'Input Required';
      const promptMessage = step.config.message || 'Please enter a value:';
      const defaultValue = step.config.defaultValue || '';
      const variableName = step.config.variableName || 'userInput';

      try {
        // For demo purposes, let's simulate user input with the default value
        // In a real implementation, you'd show a modal input dialog
        const simulatedInput = defaultValue || 'Sample Input';
        this.variables[variableName] = simulatedInput;

        Alert.alert(
          promptTitle,
          `${promptMessage}\n\nUsing default value: "${simulatedInput}"`,
          [{ text: 'OK' }]
        );
        
        return {
          type: 'prompt_input',
          variableName,
          value: simulatedInput,
          success: true,
        };
      } catch (error: any) {
        this.logger.error('Prompt input step failed', { error: error.message });
        return {
          type: 'prompt_input',
          cancelled: true,
          success: false,
          error: error.message,
        };
      }
    }

    private async executeSMSStep(step: AutomationStep): Promise<any> {
      try {
        const phoneNumber = step.config.phoneNumber;
        const message = step.config.message;

        if (!phoneNumber || !message) {
          throw new Error('Phone number and message are required for SMS step');
        }

        this.logger.info('Sending SMS', { to: phoneNumber, messageLength: message.length });

        // Check if SMS is available on this device
        const isAvailable = await SMS.isAvailableAsync();
        if (!isAvailable) {
          throw new Error('SMS is not available on this device');
        }

        // Send SMS using device's SMS app
        const result = await SMS.sendSMSAsync([phoneNumber], message);
        
        this.logger.info('SMS sending result', { result });

        return {
          type: 'sms',
          to: phoneNumber,
          message: message,
          success: true,
          result: result,
          timestamp: new Date().toISOString(),
        };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown SMS error';
        this.logger.error('SMS sending failed', { error: errorMessage });
        
        // Show user-friendly error
        Alert.alert(
          'SMS Failed',
          `Could not send SMS: ${errorMessage}\n\nMake sure you have SMS permissions and a valid phone number.`
        );

        throw new Error(`SMS failed: ${errorMessage}`);
      }
    }

    private async executeEmailStep(step: AutomationStep): Promise<any> {
      // Mock email sending
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        type: 'email',
        to: step.config.email,
        subject: step.config.subject,
        message: step.config.message,
        success: true,
      };
    }

    private async executeWebhookStep(step: AutomationStep): Promise<any> {
      // Mock webhook call
      await new Promise(resolve => setTimeout(resolve, 700));
      return {
        type: 'webhook',
        url: step.config.url,
        method: step.config.method || 'POST',
        success: true,
      };
    }

    private async executeLocationStep(step: AutomationStep): Promise<any> {
      try {
        const action = step.config.action || 'get_current';
        
        switch (action) {
          case 'get_current':
            return await this.getCurrentLocation(step);
          case 'share_location':
            return await this.shareLocation(step);
          case 'open_maps':
            return await this.openInMaps(step);
          default:
            throw new Error(`Unknown location action: ${action}`);
        }
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown location error';
        this.logger.error('Location step failed', { error: errorMessage });
        
        Alert.alert(
          'Location Failed',
          `Could not complete location action: ${errorMessage}`
        );
        
        throw new Error(`Location failed: ${errorMessage}`);
      }
    }

    private async getCurrentLocation(step: AutomationStep): Promise<any> {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
      });

      const result = {
        type: 'location',
        action: 'get_current',
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        timestamp: new Date(location.timestamp).toISOString(),
        success: true,
      };

      // If configured to show result, display it
      if (step.config.showResult) {
        Alert.alert(
          'Current Location',
          `Latitude: ${location.coords.latitude.toFixed(6)}\nLongitude: ${location.coords.longitude.toFixed(6)}\nAccuracy: ${location.coords.accuracy?.toFixed(0)}m`
        );
      }

      return result;
    }

    private async shareLocation(step: AutomationStep): Promise<any> {
      // Get current location first
      const locationResult = await this.getCurrentLocation(step);
      
      const { latitude, longitude } = locationResult;
      const message = step.config.message || 'My current location';
      const locationUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
      
      // If SMS number is provided, send location via SMS
      if (step.config.phoneNumber) {
        const smsMessage = `${message}\n${locationUrl}`;
        
        const isAvailable = await SMS.isAvailableAsync();
        if (isAvailable) {
          await SMS.sendSMSAsync([step.config.phoneNumber], smsMessage);
        } else {
          throw new Error('SMS is not available on this device');
        }
      }

      return {
        type: 'location',
        action: 'share_location',
        latitude,
        longitude,
        message,
        locationUrl,
        phoneNumber: step.config.phoneNumber,
        success: true,
        timestamp: new Date().toISOString(),
      };
    }

    private async openInMaps(step: AutomationStep): Promise<any> {
      let latitude, longitude;

      if (step.config.useCurrentLocation) {
        const locationResult = await this.getCurrentLocation(step);
        latitude = locationResult.latitude;
        longitude = locationResult.longitude;
      } else {
        latitude = step.config.latitude;
        longitude = step.config.longitude;
      }

      if (!latitude || !longitude) {
        throw new Error('No coordinates provided for maps');
      }

      const label = step.config.label || 'Location';
      const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}&label=${encodeURIComponent(label)}`;
      
      const canOpen = await Linking.canOpenURL(mapsUrl);
      if (canOpen) {
        await Linking.openURL(mapsUrl);
      } else {
        throw new Error('Cannot open maps application');
      }

      return {
        type: 'location',
        action: 'open_maps',
        latitude,
        longitude,
        label,
        mapsUrl,
        success: true,
        timestamp: new Date().toISOString(),
      };
    }

    private async executeConditionStep(step: AutomationStep, inputs: Record<string, any>): Promise<any> {
      try {
        const { variable, condition, value } = step.config;
        const variableValue = inputs[variable];
        let conditionMet = false;

        switch (condition) {
          case 'equals':
            conditionMet = String(variableValue) === String(value);
            break;
          case 'contains':
            conditionMet = String(variableValue).includes(String(value));
            break;
          case 'greater':
            conditionMet = parseFloat(variableValue) > parseFloat(value);
            break;
          case 'less':
            conditionMet = parseFloat(variableValue) < parseFloat(value);
            break;
        }

        return {
          type: 'condition',
          variable,
          condition,
          value,
          variableValue,
          conditionMet,
          success: true,
        };
      } catch (error: any) {
        throw new Error(`Condition step failed: ${error.message}`);
      }
    }

    private async executeLoopStep(step: AutomationStep, inputs: Record<string, any>, context: Partial<ExecutionContext>): Promise<any> {
      try {
        const { type, count } = step.config;
        
        if (type === 'count') {
          const iterations = Math.max(1, parseInt(count) || 3);
          
          return {
            type: 'loop',
            loopType: type,
            iterations,
            success: true,
            message: `Loop configured for ${iterations} iterations`,
          };
        }

        return {
          type: 'loop',
          loopType: type,
          success: true,
          message: `Loop type ${type} configured`,
        };
      } catch (error: any) {
        throw new Error(`Loop step failed: ${error.message}`);
      }
    }

    private async executeTextStep(step: AutomationStep): Promise<any> {
      try {
        const { action, text1, text2, separator } = step.config;
        let result = '';

        switch (action) {
          case 'combine':
            result = `${text1 || ''}${separator || ' '}${text2 || ''}`;
            break;
          case 'replace':
            result = (text1 || '').replace(text2 || '', separator || '');
            break;
          case 'format':
            result = (text1 || '').toUpperCase();
            break;
          default:
            result = text1 || '';
        }

        return {
          type: 'text',
          action,
          input1: text1,
          input2: text2,
          result,
          success: true,
        };
      } catch (error: any) {
        throw new Error(`Text step failed: ${error.message}`);
      }
    }

    private async executeMathStep(step: AutomationStep): Promise<any> {
      try {
        const { operation, number1, number2 } = step.config;
        const num1 = parseFloat(number1) || 0;
        const num2 = parseFloat(number2) || 0;
        let result = 0;

        switch (operation) {
          case 'add':
            result = num1 + num2;
            break;
          case 'subtract':
            result = num1 - num2;
            break;
          case 'multiply':
            result = num1 * num2;
            break;
          case 'divide':
            result = num2 !== 0 ? num1 / num2 : 0;
            break;
        }

        return {
          type: 'math',
          operation,
          number1: num1,
          number2: num2,
          result,
          success: true,
        };
      } catch (error: any) {
        throw new Error(`Math step failed: ${error.message}`);
      }
    }

    private async executePhotoStep(step: AutomationStep): Promise<any> {
      try {
        const { action, saveToAlbum } = step.config;
        
        // Request camera permissions
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('Camera permission not granted');
        }

        let result;
        if (action === 'take') {
          result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
          });
        } else {
          result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
          });
        }

        if (result.canceled) {
          throw new Error('Photo selection was canceled');
        }

        return {
          type: 'photo',
          action,
          saveToAlbum,
          uri: result.assets[0]?.uri,
          width: result.assets[0]?.width,
          height: result.assets[0]?.height,
          success: true,
        };
      } catch (error: any) {
        Alert.alert('Photo Error', `Could not ${step.config.action} photo: ${error.message}`);
        throw new Error(`Photo step failed: ${error.message}`);
      }
    }

    private async executeClipboardStep(step: AutomationStep): Promise<any> {
      try {
        const { action, text } = step.config;
        
        if (action === 'copy') {
          await Clipboard.setStringAsync(text || '');
          return {
            type: 'clipboard',
            action: 'copy',
            text,
            success: true,
          };
        } else {
          const clipboardText = await Clipboard.getStringAsync();
          return {
            type: 'clipboard',
            action: 'paste',
            text: clipboardText,
            success: true,
          };
        }
      } catch (error: any) {
        throw new Error(`Clipboard step failed: ${error.message}`);
      }
    }

    private async executeAppStep(step: AutomationStep): Promise<any> {
      try {
        const { appName, url } = step.config;
        let targetUrl = url;

        // If no URL provided, try common app URL schemes
        if (!targetUrl) {
          const commonApps: Record<string, string> = {
            'settings': 'app-settings:',
            'camera': 'microsoft-pix:',
            'photos': 'ms-photos:',
            'mail': 'ms-outlook:',
            'calendar': 'ms-outlook:',
          };
          targetUrl = commonApps[appName.toLowerCase()] || `${appName.toLowerCase()}://`;
        }

        const canOpen = await Linking.canOpenURL(targetUrl);
        if (canOpen) {
          await Linking.openURL(targetUrl);
          return {
            type: 'app',
            appName,
            url: targetUrl,
            success: true,
          };
        } else {
          throw new Error(`Cannot open app: ${appName}`);
        }
      } catch (error: any) {
        Alert.alert('App Error', `Could not open ${step.config.appName}: ${error.message}`);
        throw new Error(`App step failed: ${error.message}`);
      }
    }

    get isCurrentlyExecuting(): boolean {
      return this.isExecuting;
    }

    /**
     * Update execution count for an automation
     */
    private async updateExecutionCount(automationId: string): Promise<void> {
      try {
        // First get current count
        const { data: automation, error: fetchError } = await supabase
          .from('automations')
          .select('execution_count')
          .eq('id', automationId)
          .single();

        if (fetchError) {
          throw fetchError;
        }

        // Update with incremented count
        const { error: updateError } = await supabase
          .from('automations')
          .update({ 
            execution_count: (automation?.execution_count || 0) + 1,
            last_run_at: new Date().toISOString()
          })
          .eq('id', automationId);

        if (updateError) {
          throw updateError;
        }

        this.logger.info('Updated execution count', { 
          automationId, 
          newCount: (automation?.execution_count || 0) + 1 
        });
      } catch (error) {
        this.logger.error('Failed to update execution count', { automationId, error });
        throw error;
      }
    }
  }