import { Alert } from 'react-native';
import { BaseExecutor } from './BaseExecutor';
import { AutomationStep, ExecutionContext, ExecutionResult } from '../../../types';

export class NotificationExecutor extends BaseExecutor {
  readonly stepType = 'notification';
  
  async execute(step: AutomationStep, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.validateConfig(step.config);
      
      const message = this.replaceVariables(
        step.config.message || 'Automation notification',
        context.variables || {}
      );
      
      // Show notification using Alert for now (in production, use proper notifications)
      await new Promise<void>((resolve) => {
        Alert.alert('🔔 Notification', message, [
          { text: 'OK', onPress: () => resolve() }
        ]);
      });
      
      // Small delay to ensure the alert is shown
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result: ExecutionResult = {
        success: true,
        duration: Date.now() - startTime,
        output: {
          type: 'notification',
          message,
          timestamp: new Date().toISOString()
        }
      };
      
      this.logExecution(step, result);
      return result;
      
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }
}