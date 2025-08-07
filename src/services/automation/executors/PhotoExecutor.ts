import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { BaseExecutor } from './BaseExecutor';
import { AutomationStep, ExecutionContext, ExecutionResult } from '../../../types';

export class PhotoExecutor extends BaseExecutor {
  readonly stepType = 'photo';
  
  async execute(step: AutomationStep, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.validateConfig(step.config);
      
      const action = step.config.action || 'take';
      const saveToAlbum = step.config.saveToAlbum || false;
      const quality = Math.min(1, Math.max(0, step.config.quality || 1));
      const allowsEditing = step.config.allowsEditing !== false;
      const aspect = step.config.aspect || [4, 3];
      const variableName = step.config.variableName || 'photoResult';

      if (!['take', 'select'].includes(action)) {
        throw new Error('Photo action must be "take" or "select"');
      }

      let result: ImagePicker.ImagePickerResult;

      if (action === 'take') {
        // Request camera permissions
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('Camera permission not granted');
        }

        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing,
          aspect,
          quality,
        });
      } else {
        // Request media library permissions
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('Media library permission not granted');
        }

        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing,
          aspect,
          quality,
        });
      }

      if (result.canceled) {
        throw new Error('Photo selection was canceled by user');
      }

      const asset = result.assets[0];
      if (!asset) {
        throw new Error('No photo was captured or selected');
      }

      const photoData = {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        type: asset.type || 'image',
        fileName: asset.fileName || 'photo.jpg',
        fileSize: asset.fileSize || 0,
      };

      // Store photo data in variables if specified
      if (variableName && context.variables) {
        context.variables[variableName] = photoData;
      }

      const executionResult: ExecutionResult = {
        success: true,
        executionTime: Date.now() - startTime,
        stepsCompleted: 1,
        totalSteps: 1,
        timestamp: new Date().toISOString(),
        output: {
          type: 'photo',
          action,
          saveToAlbum,
          photo: photoData,
          variableName,
          timestamp: new Date().toISOString()
        }
      };
      
      this.logExecution(step, executionResult);
      return executionResult;
      
    } catch (error) {
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Photo Error', `Could not ${step.config.action} photo: ${errorMessage}`);
      
      return this.handleError(error, startTime, 1, 0);
    }
  }
}