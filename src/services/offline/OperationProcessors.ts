import { OperationProcessor, QueuedOperation } from './SyncManager';
import { supabase } from '../supabase/client';
import { logger } from '../analytics/AnalyticsService';

/**
 * Base operation processor with common functionality
 */
abstract class BaseOperationProcessor implements OperationProcessor {
  abstract process(operation: QueuedOperation): Promise<void>;
  abstract canProcess(operation: QueuedOperation): boolean;
  abstract getEstimatedDuration(operation: QueuedOperation): number;

  /**
   * Make HTTP request with the original operation data
   */
  protected async makeHttpRequest(operation: QueuedOperation): Promise<any> {
    const { url, method, body, headers } = operation.payload;
    
    // Use fetch directly to replay the original request
    const response = await fetch(url.startsWith('http') ? url : `${supabase.supabaseUrl}/rest/v1/${url}`, {
      method: method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabase.supabaseKey,
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return response.json();
  }

  /**
   * Check if operation can be processed based on network and auth state
   */
  protected async canProcessBasic(operation: QueuedOperation): Promise<boolean> {
    // Check if we have a valid session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      logger.warn('OperationProcessor: No valid session for operation', {
        operationId: operation.id,
        type: operation.type,
      });
      return false;
    }

    return true;
  }
}

/**
 * Processor for automation execution operations
 */
export class AutomationExecuteProcessor extends BaseOperationProcessor {
  canProcess(operation: QueuedOperation): boolean {
    return operation.type === 'automation_execute';
  }

  getEstimatedDuration(operation: QueuedOperation): number {
    // Estimate based on automation complexity
    const stepCount = operation.payload?.automation?.steps?.length || 1;
    return Math.min(stepCount * 500, 10000); // 500ms per step, max 10s
  }

  async process(operation: QueuedOperation): Promise<void> {
    const { automation, variables, triggerData } = operation.payload;
    
    logger.info('AutomationExecuteProcessor: Processing automation execution', {
      operationId: operation.id,
      automationId: automation?.id,
      stepCount: automation?.steps?.length || 0,
    });

    try {
      // Execute automation via Supabase RPC
      const { data, error } = await supabase.rpc('execute_automation', {
        automation_id: automation.id,
        execution_variables: variables || {},
        trigger_data: triggerData || {},
      });

      if (error) {
        throw error;
      }

      logger.info('AutomationExecuteProcessor: Automation executed successfully', {
        operationId: operation.id,
        executionId: data?.execution_id,
      });
    } catch (error) {
      logger.error('AutomationExecuteProcessor: Execution failed', {
        operationId: operation.id,
        automationId: automation?.id,
        error: error.message,
      });
      throw error;
    }
  }
}

/**
 * Processor for share creation operations
 */
export class ShareCreateProcessor extends BaseOperationProcessor {
  canProcess(operation: QueuedOperation): boolean {
    return operation.type === 'share_create';
  }

  getEstimatedDuration(): number {
    return 2000; // 2 seconds for share creation
  }

  async process(operation: QueuedOperation): Promise<void> {
    const { automationId, shareData } = operation.payload;
    
    logger.info('ShareCreateProcessor: Processing share creation', {
      operationId: operation.id,
      automationId,
    });

    try {
      // Create share via API
      const { data, error } = await supabase
        .from('automation_shares')
        .insert({
          automation_id: automationId,
          ...shareData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Generate share URL
      const shareUrl = `https://www.zaptap.cloud/share/${data.public_id}`;
      
      logger.info('ShareCreateProcessor: Share created successfully', {
        operationId: operation.id,
        shareId: data.id,
        publicId: data.public_id,
        shareUrl,
      });
    } catch (error) {
      logger.error('ShareCreateProcessor: Share creation failed', {
        operationId: operation.id,
        automationId,
        error: error.message,
      });
      throw error;
    }
  }
}

/**
 * Processor for NFC write operations
 */
export class NFCWriteProcessor extends BaseOperationProcessor {
  canProcess(operation: QueuedOperation): boolean {
    return operation.type === 'nfc_write';
  }

  getEstimatedDuration(): number {
    return 3000; // 3 seconds for NFC operations
  }

  async process(operation: QueuedOperation): Promise<void> {
    const { automationId, nfcData, deploymentData } = operation.payload;
    
    logger.info('NFCWriteProcessor: Processing NFC write operation', {
      operationId: operation.id,
      automationId,
    });

    try {
      // Create deployment record
      const { data: deployment, error: deploymentError } = await supabase
        .from('deployments')
        .insert({
          automation_id: automationId,
          deployment_type: 'nfc',
          deployment_data: nfcData,
          ...deploymentData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (deploymentError) {
        throw deploymentError;
      }

      logger.info('NFCWriteProcessor: NFC deployment created successfully', {
        operationId: operation.id,
        deploymentId: deployment.id,
      });
    } catch (error) {
      logger.error('NFCWriteProcessor: NFC write failed', {
        operationId: operation.id,
        automationId,
        error: error.message,
      });
      throw error;
    }
  }
}

/**
 * Processor for QR generation operations
 */
export class QRGenerateProcessor extends BaseOperationProcessor {
  canProcess(operation: QueuedOperation): boolean {
    return operation.type === 'qr_generate';
  }

  getEstimatedDuration(): number {
    return 1500; // 1.5 seconds for QR generation
  }

  async process(operation: QueuedOperation): Promise<void> {
    const { automationId, qrData, deploymentData } = operation.payload;
    
    logger.info('QRGenerateProcessor: Processing QR generation', {
      operationId: operation.id,
      automationId,
    });

    try {
      // Create deployment record
      const { data: deployment, error: deploymentError } = await supabase
        .from('deployments')
        .insert({
          automation_id: automationId,
          deployment_type: 'qr',
          deployment_data: qrData,
          ...deploymentData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (deploymentError) {
        throw deploymentError;
      }

      logger.info('QRGenerateProcessor: QR deployment created successfully', {
        operationId: operation.id,
        deploymentId: deployment.id,
      });
    } catch (error) {
      logger.error('QRGenerateProcessor: QR generation failed', {
        operationId: operation.id,
        automationId,
        error: error.message,
      });
      throw error;
    }
  }
}

/**
 * Processor for automation CRUD operations
 */
export class AutomationCRUDProcessor extends BaseOperationProcessor {
  canProcess(operation: QueuedOperation): boolean {
    return ['automation_create', 'automation_update', 'automation_delete'].includes(operation.type);
  }

  getEstimatedDuration(operation: QueuedOperation): number {
    // Estimate based on operation type and automation complexity
    const stepCount = operation.payload?.automation?.steps?.length || 1;
    const baseTime = operation.type === 'automation_create' ? 2000 : 1000;
    return Math.min(baseTime + (stepCount * 100), 5000);
  }

  async process(operation: QueuedOperation): Promise<void> {
    logger.info('AutomationCRUDProcessor: Processing CRUD operation', {
      operationId: operation.id,
      type: operation.type,
    });

    try {
      await this.makeHttpRequest(operation);
      
      logger.info('AutomationCRUDProcessor: CRUD operation completed successfully', {
        operationId: operation.id,
        type: operation.type,
      });
    } catch (error) {
      logger.error('AutomationCRUDProcessor: CRUD operation failed', {
        operationId: operation.id,
        type: operation.type,
        error: error.message,
      });
      throw error;
    }
  }
}

/**
 * Processor for deployment operations
 */
export class DeploymentProcessor extends BaseOperationProcessor {
  canProcess(operation: QueuedOperation): boolean {
    return operation.type === 'deployment_create';
  }

  getEstimatedDuration(): number {
    return 1500; // 1.5 seconds for deployments
  }

  async process(operation: QueuedOperation): Promise<void> {
    logger.info('DeploymentProcessor: Processing deployment creation', {
      operationId: operation.id,
    });

    try {
      await this.makeHttpRequest(operation);
      
      logger.info('DeploymentProcessor: Deployment created successfully', {
        operationId: operation.id,
      });
    } catch (error) {
      logger.error('DeploymentProcessor: Deployment creation failed', {
        operationId: operation.id,
        error: error.message,
      });
      throw error;
    }
  }
}

/**
 * Generic API processor for other operations
 */
export class GenericAPIProcessor extends BaseOperationProcessor {
  canProcess(operation: QueuedOperation): boolean {
    return operation.type.startsWith('api_');
  }

  getEstimatedDuration(): number {
    return 1000; // 1 second for generic API calls
  }

  async process(operation: QueuedOperation): Promise<void> {
    logger.info('GenericAPIProcessor: Processing generic API operation', {
      operationId: operation.id,
      type: operation.type,
    });

    try {
      await this.makeHttpRequest(operation);
      
      logger.info('GenericAPIProcessor: API operation completed successfully', {
        operationId: operation.id,
        type: operation.type,
      });
    } catch (error) {
      logger.error('GenericAPIProcessor: API operation failed', {
        operationId: operation.id,
        type: operation.type,
        error: error.message,
      });
      throw error;
    }
  }
}

/**
 * Factory function to create and register all processors
 */
export const createOperationProcessors = (): OperationProcessor[] => {
  return [
    new AutomationExecuteProcessor(),
    new ShareCreateProcessor(),
    new NFCWriteProcessor(),
    new QRGenerateProcessor(),
    new AutomationCRUDProcessor(),
    new DeploymentProcessor(),
    new GenericAPIProcessor(),
  ];
};

/**
 * Register all processors with the sync manager
 */
export const registerAllProcessors = (syncManager: any): void => {
  const processors = createOperationProcessors();
  
  processors.forEach(processor => {
    // Register each processor for the operations it can handle
    if (processor instanceof AutomationExecuteProcessor) {
      syncManager.registerProcessor('automation_execute', processor);
    } else if (processor instanceof ShareCreateProcessor) {
      syncManager.registerProcessor('share_create', processor);
    } else if (processor instanceof NFCWriteProcessor) {
      syncManager.registerProcessor('nfc_write', processor);
    } else if (processor instanceof QRGenerateProcessor) {
      syncManager.registerProcessor('qr_generate', processor);
    } else if (processor instanceof AutomationCRUDProcessor) {
      syncManager.registerProcessor('automation_create', processor);
      syncManager.registerProcessor('automation_update', processor);
      syncManager.registerProcessor('automation_delete', processor);
    } else if (processor instanceof DeploymentProcessor) {
      syncManager.registerProcessor('deployment_create', processor);
    } else if (processor instanceof GenericAPIProcessor) {
      // Register for various generic API operation types
      ['api_post', 'api_put', 'api_patch', 'api_delete', 'api_get'].forEach(type => {
        syncManager.registerProcessor(type, processor);
      });
    }
  });

  logger.info('OperationProcessors: All processors registered successfully', {
    processorCount: processors.length,
  });
};