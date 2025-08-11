import * as Speech from 'expo-speech';
import { BaseExecutor } from './BaseExecutor';
import { AutomationStep, ExecutionResult, TextToSpeechStepConfig } from '../../../types';
import { SecurityService } from '../../security/SecurityService';
import { EventLogger } from '../../../utils/EventLogger';
import { Platform } from 'react-native';

/**
 * TextToSpeechExecutor handles converting text to speech using the device's TTS engine
 * 
 * Features:
 * - Text-to-speech conversion using expo-speech
 * - Configurable voice, rate, pitch, and language
 * - Cross-platform support (iOS/Android)
 * - Text sanitization for security
 * - Voice availability checking
 * - Speech interruption and queuing
 * 
 * Security Notes:
 * - All text input is sanitized to prevent injection attacks
 * - Text length limits to prevent abuse
 * - Rate and pitch limits to prevent ear damage
 * - Language validation against available voices
 */
export class TextToSpeechExecutor extends BaseExecutor {
  private readonly MAX_TEXT_LENGTH = 4000; // Maximum characters for TTS
  private readonly MIN_RATE = 0.1;
  private readonly MAX_RATE = 2.0;
  private readonly MIN_PITCH = 0.5;
  private readonly MAX_PITCH = 2.0;
  
  async execute(step: AutomationStep): Promise<ExecutionResult> {
    try {
      EventLogger.debug('TextToSpeechExecutor', 'Starting text-to-speech execution', step.config);
      
      const config = step.config as TextToSpeechStepConfig;
      
      // Validate required configuration
      if (!config.text) {
        return {
          success: false,
          error: 'Text is required for text-to-speech conversion'
        };
      }
      
      // Check text length
      if (config.text.length > this.MAX_TEXT_LENGTH) {
        return {
          success: false,
          error: `Text too long. Maximum length is ${this.MAX_TEXT_LENGTH} characters`
        };
      }
      
      // Sanitize text input
      const sanitizedText = SecurityService.sanitizeInput(config.text, {
        allowNewlines: true,
        allowPunctuation: true
      });
      
      if (!sanitizedText.trim()) {
        return {
          success: false,
          error: 'Text cannot be empty after sanitization'
        };
      }
      
      // Check if speech is available
      const isSpeechAvailable = await Speech.isSpeakingAsync();
      
      // Prepare speech options
      const speechOptions: Speech.SpeechOptions = {};
      
      // Configure voice if specified
      if (config.voice) {
        const availableVoices = await Speech.getAvailableVoicesAsync();
        const selectedVoice = availableVoices.find(
          voice => voice.identifier === config.voice || voice.name === config.voice
        );
        
        if (selectedVoice) {
          speechOptions.voice = selectedVoice.identifier;
          EventLogger.debug('TextToSpeechExecutor', 'Using selected voice', {
            voice: selectedVoice.name,
            language: selectedVoice.language
          });
        } else {
          EventLogger.warn('TextToSpeechExecutor', 'Requested voice not found, using default', {
            requestedVoice: config.voice
          });
        }
      }
      
      // Configure language
      if (config.language) {
        const sanitizedLanguage = SecurityService.sanitizeInput(config.language);
        if (this.isValidLanguageCode(sanitizedLanguage)) {
          speechOptions.language = sanitizedLanguage;
        } else {
          EventLogger.warn('TextToSpeechExecutor', 'Invalid language code, using default', {
            language: config.language
          });
        }
      }
      
      // Configure rate (speed)
      if (config.rate !== undefined) {
        const rate = Math.max(this.MIN_RATE, Math.min(this.MAX_RATE, config.rate));
        speechOptions.rate = rate;
        
        if (rate !== config.rate) {
          EventLogger.warn('TextToSpeechExecutor', 'Rate adjusted to safe range', {
            requested: config.rate,
            actual: rate
          });
        }
      }
      
      // Configure pitch
      if (config.pitch !== undefined) {
        const pitch = Math.max(this.MIN_PITCH, Math.min(this.MAX_PITCH, config.pitch));
        speechOptions.pitch = pitch;
        
        if (pitch !== config.pitch) {
          EventLogger.warn('TextToSpeechExecutor', 'Pitch adjusted to safe range', {
            requested: config.pitch,
            actual: pitch
          });
        }
      }
      
      EventLogger.debug('TextToSpeechExecutor', 'Starting speech synthesis', {
        textLength: sanitizedText.length,
        options: speechOptions
      });
      
      // Create promise to handle speech completion
      const speechPromise = new Promise<void>((resolve, reject) => {
        const onDone = () => {
          EventLogger.info('TextToSpeechExecutor', 'Speech synthesis completed');
          resolve();
        };
        
        const onError = (error: any) => {
          EventLogger.error('TextToSpeechExecutor', 'Speech synthesis failed:', error);
          reject(new Error(`Speech synthesis failed: ${error.message || error}`));
        };
        
        // Start speech synthesis
        Speech.speak(sanitizedText, {
          ...speechOptions,
          onDone,
          onError
        });
      });
      
      // Wait for speech to complete
      await speechPromise;
      
      EventLogger.info('TextToSpeechExecutor', 'Text-to-speech completed successfully', {
        textLength: sanitizedText.length,
        voice: speechOptions.voice,
        language: speechOptions.language,
        rate: speechOptions.rate,
        pitch: speechOptions.pitch
      });
      
      return {
        success: true,
        data: {
          text: sanitizedText,
          textLength: sanitizedText.length,
          voice: speechOptions.voice,
          language: speechOptions.language,
          rate: speechOptions.rate,
          pitch: speechOptions.pitch,
          platform: Platform.OS,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      EventLogger.error('TextToSpeechExecutor', 'Text-to-speech failed:', error as Error);
      
      // Stop any ongoing speech on error
      try {
        await Speech.stop();
      } catch (stopError) {
        // Ignore stop errors
      }
      
      return {
        success: false,
        error: `Text-to-speech failed: ${(error as Error).message}`
      };
    }
  }
  
  /**
   * Validates language code format
   */
  private isValidLanguageCode(language: string): boolean {
    // Basic validation for language codes (e.g., "en-US", "fr-FR", "es")
    const languageRegex = /^[a-z]{2,3}(-[A-Z]{2})?$/;
    return languageRegex.test(language);
  }
  
  /**
   * Gets available voices for the current platform
   */
  async getAvailableVoices(): Promise<Speech.Voice[]> {
    try {
      return await Speech.getAvailableVoicesAsync();
    } catch (error) {
      EventLogger.warn('TextToSpeechExecutor', 'Could not get available voices:', error as Error);
      return [];
    }
  }
  
  /**
   * Stops any currently playing speech
   */
  async stopSpeech(): Promise<void> {
    try {
      await Speech.stop();
    } catch (error) {
      EventLogger.warn('TextToSpeechExecutor', 'Error stopping speech:', error as Error);
    }
  }
  
  /**
   * Validates the step configuration
   */
  validateConfig(config: any): string[] {
    const errors: string[] = [];
    
    if (!config.text) {
      errors.push('Text is required');
    } else if (typeof config.text !== 'string') {
      errors.push('Text must be a string');
    } else {
      if (config.text.length > this.MAX_TEXT_LENGTH) {
        errors.push(`Text too long. Maximum length is ${this.MAX_TEXT_LENGTH} characters`);
      }
      
      const sanitized = SecurityService.sanitizeInput(config.text);
      if (!sanitized.trim()) {
        errors.push('Text cannot be empty');
      }
    }
    
    if (config.voice && typeof config.voice !== 'string') {
      errors.push('Voice must be a string');
    }
    
    if (config.language && typeof config.language !== 'string') {
      errors.push('Language must be a string');
    } else if (config.language && !this.isValidLanguageCode(config.language)) {
      errors.push('Language must be a valid language code (e.g., "en-US", "fr-FR")');
    }
    
    if (config.rate !== undefined) {
      if (typeof config.rate !== 'number') {
        errors.push('Rate must be a number');
      } else if (config.rate < this.MIN_RATE || config.rate > this.MAX_RATE) {
        errors.push(`Rate must be between ${this.MIN_RATE} and ${this.MAX_RATE}`);
      }
    }
    
    if (config.pitch !== undefined) {
      if (typeof config.pitch !== 'number') {
        errors.push('Pitch must be a number');
      } else if (config.pitch < this.MIN_PITCH || config.pitch > this.MAX_PITCH) {
        errors.push(`Pitch must be between ${this.MIN_PITCH} and ${this.MAX_PITCH}`);
      }
    }
    
    return errors;
  }
  
  /**
   * Returns example configuration for documentation
   */
  getExampleConfig(): TextToSpeechStepConfig {
    return {
      text: 'Hello! This is a text-to-speech announcement from your automation.',
      voice: 'com.apple.voice.compact.en-US.Samantha', // iOS voice example
      rate: 0.75,
      pitch: 1.0,
      language: 'en-US'
    };
  }
}