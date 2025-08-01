import React from 'react';
import { View } from 'react-native';
import { AutomationStep } from '../../types';
import {
  ModernTextInput,
  ModernSegmentedButtons,
  InfoCard,
  FormSection,
  ChipGroup,
} from './StepConfigForms';

interface ModernStepConfigRendererProps {
  step: AutomationStep;
  config: Record<string, any>;
  onConfigChange: (config: Record<string, any>) => void;
}

const ModernStepConfigRenderer: React.FC<ModernStepConfigRendererProps> = ({
  step,
  config,
  onConfigChange,
}) => {
  const updateConfig = (updates: Record<string, any>) => {
    onConfigChange({ ...config, ...updates });
  };

  switch (step.type) {
    case 'sms':
      return (
        <FormSection>
          <InfoCard
            icon="message-text"
            title="SMS Message"
            description="Send a text message to a phone number. This will use your device's SMS capability."
            color="#4CAF50"
          />
          <ModernTextInput
            label="Phone Number"
            value={config.phoneNumber || ''}
            onChangeText={(text) => updateConfig({ phoneNumber: text })}
            placeholder="+1 (555) 123-4567"
            keyboardType="phone-pad"
            icon="phone"
            helper="Include country code for international numbers"
          />
          <ModernTextInput
            label="Message"
            value={config.message || ''}
            onChangeText={(text) => updateConfig({ message: text })}
            placeholder="Your message here..."
            multiline
            numberOfLines={3}
            icon="message-text"
            helper="Use variables like {{userName}} to personalize messages"
          />
        </FormSection>
      );

    case 'email':
      return (
        <FormSection>
          <InfoCard
            icon="email"
            title="Email Message"
            description="Send an email through your device's default email app."
            color="#2196F3"
          />
          <ModernTextInput
            label="Recipient Email"
            value={config.email || ''}
            onChangeText={(text) => updateConfig({ email: text })}
            placeholder="recipient@example.com"
            keyboardType="email-address"
            icon="email"
          />
          <ModernTextInput
            label="Subject"
            value={config.subject || ''}
            onChangeText={(text) => updateConfig({ subject: text })}
            placeholder="Email subject"
            icon="format-title"
          />
          <ModernTextInput
            label="Message"
            value={config.message || ''}
            onChangeText={(text) => updateConfig({ message: text })}
            placeholder="Email content..."
            multiline
            numberOfLines={4}
            icon="text"
            helper="Supports plain text and basic formatting"
          />
        </FormSection>
      );

    case 'webhook':
      return (
        <FormSection>
          <InfoCard
            icon="webhook"
            title="Webhook Request"
            description="Make an HTTP request to a web service or API endpoint."
            color="#FF9800"
          />
          <ModernTextInput
            label="URL"
            value={config.url || ''}
            onChangeText={(text) => updateConfig({ url: text })}
            placeholder="https://api.example.com/webhook"
            keyboardType="url"
            icon="link"
            helper="Must be a valid HTTPS URL"
          />
          <ModernSegmentedButtons
            label="HTTP Method"
            value={config.method || 'POST'}
            onValueChange={(value) => updateConfig({ method: value })}
            buttons={[
              { value: 'GET', label: 'GET', icon: 'download' },
              { value: 'POST', label: 'POST', icon: 'upload' },
              { value: 'PUT', label: 'PUT', icon: 'pencil' },
              { value: 'DELETE', label: 'DELETE', icon: 'delete' },
            ]}
          />
          {config.method !== 'GET' && (
            <ModernTextInput
              label="Request Body (JSON)"
              value={config.body || ''}
              onChangeText={(text) => updateConfig({ body: text })}
              placeholder='{"key": "value"}'
              multiline
              numberOfLines={3}
              icon="code-braces"
              helper="Valid JSON format required"
            />
          )}
        </FormSection>
      );

    case 'notification':
      return (
        <FormSection>
          <InfoCard
            icon="bell"
            title="Push Notification"
            description="Display a notification on the device screen."
            color="#9C27B0"
          />
          <ModernTextInput
            label="Title"
            value={config.title || ''}
            onChangeText={(text) => updateConfig({ title: text })}
            placeholder="Notification title"
            icon="format-title"
          />
          <ModernTextInput
            label="Message"
            value={config.message || ''}
            onChangeText={(text) => updateConfig({ message: text })}
            placeholder="Notification message"
            multiline
            numberOfLines={3}
            icon="message-text"
            helper="Keep it concise for better visibility"
          />
        </FormSection>
      );

    case 'delay':
      return (
        <FormSection>
          <InfoCard
            icon="clock"
            title="Delay"
            description="Pause the automation for a specified amount of time."
            color="#607D8B"
          />
          <ModernTextInput
            label="Delay Duration (milliseconds)"
            value={String(config.delay || 1000)}
            onChangeText={(text) => updateConfig({ delay: parseInt(text) || 1000 })}
            placeholder="1000"
            keyboardType="numeric"
            icon="timer"
            helper="1000ms = 1 second, 5000ms = 5 seconds"
          />
        </FormSection>
      );

    case 'variable':
      return (
        <FormSection>
          <InfoCard
            icon="variable"
            title="Set Variable"
            description="Store a value that can be used in later automation steps."
            color="#795548"
          />
          <ModernTextInput
            label="Variable Name"
            value={config.name || ''}
            onChangeText={(text) => updateConfig({ name: text })}
            placeholder="myVariable"
            icon="variable"
            helper="Use camelCase naming (e.g., userName, currentDate)"
          />
          <ModernTextInput
            label="Value"
            value={config.value || ''}
            onChangeText={(text) => updateConfig({ value: text })}
            placeholder="Variable value"
            multiline
            numberOfLines={2}
            icon="text"
            helper="Can reference other variables using {{variableName}} syntax"
          />
        </FormSection>
      );

    case 'location':
      return (
        <FormSection>
          <InfoCard
            icon="map-marker"
            title="Location Services"
            description="Get current location, share location, or open maps."
            color="#FF5722"
          />
          <ModernSegmentedButtons
            label="Location Action"
            value={config.action || 'get_current'}
            onValueChange={(value) => updateConfig({ action: value })}
            buttons={[
              { value: 'get_current', label: 'Get Location', icon: 'crosshairs-gps' },
              { value: 'share_location', label: 'Share Location', icon: 'share-variant' },
              { value: 'open_maps', label: 'Open Maps', icon: 'map' },
            ]}
          />
          
          {config.action === 'share_location' && (
            <View>
              <ModernTextInput
                label="Phone Number (optional)"
                value={config.phoneNumber || ''}
                onChangeText={(text) => updateConfig({ phoneNumber: text })}
                placeholder="+1 (555) 123-4567"
                keyboardType="phone-pad"
                icon="phone"
                helper="Leave empty to use system share dialog"
              />
              <ModernTextInput
                label="Message"
                value={config.message || 'My current location'}
                onChangeText={(text) => updateConfig({ message: text })}
                placeholder="Location sharing message"
                icon="message-text"
              />
            </View>
          )}
          
          {config.action === 'open_maps' && (
            <View>
              <ModernSegmentedButtons
                label="Location Type"
                value={config.useCurrentLocation ? 'current' : 'custom'}
                onValueChange={(value) => updateConfig({ 
                  useCurrentLocation: value === 'current',
                  latitude: value === 'current' ? undefined : config.latitude,
                  longitude: value === 'current' ? undefined : config.longitude,
                })}
                buttons={[
                  { value: 'current', label: 'Current', icon: 'crosshairs-gps' },
                  { value: 'custom', label: 'Custom', icon: 'map-marker' },
                ]}
              />
              
              {!config.useCurrentLocation && (
                <View>
                  <ModernTextInput
                    label="Latitude"
                    value={String(config.latitude || '')}
                    onChangeText={(text) => updateConfig({ latitude: parseFloat(text) || 0 })}
                    placeholder="40.7128"
                    keyboardType="numeric"
                    icon="latitude"
                  />
                  <ModernTextInput
                    label="Longitude"
                    value={String(config.longitude || '')}
                    onChangeText={(text) => updateConfig({ longitude: parseFloat(text) || 0 })}
                    placeholder="-74.0060"
                    keyboardType="numeric"
                    icon="longitude"
                  />
                </View>
              )}
              
              <ModernTextInput
                label="Location Label"
                value={config.label || ''}
                onChangeText={(text) => updateConfig({ label: text })}
                placeholder="My Location"
                icon="label"
              />
            </View>
          )}
        </FormSection>
      );

    case 'condition':
      return (
        <FormSection>
          <InfoCard
            icon="code-braces"
            title="Conditional Logic"
            description="Execute different actions based on variable values or conditions."
            color="#3F51B5"
          />
          <ModernTextInput
            label="Variable Name"
            value={config.variable || ''}
            onChangeText={(text) => updateConfig({ variable: text })}
            placeholder="myVariable"
            icon="variable"
          />
          <ModernSegmentedButtons
            label="Condition Type"
            value={config.condition || 'equals'}
            onValueChange={(value) => updateConfig({ condition: value })}
            buttons={[
              { value: 'equals', label: 'Equals', icon: 'equal' },
              { value: 'contains', label: 'Contains', icon: 'contain' },
              { value: 'greater', label: 'Greater', icon: 'greater-than' },
              { value: 'less', label: 'Less', icon: 'less-than' },
            ]}
          />
          <ModernTextInput
            label="Compare Value"
            value={config.value || ''}
            onChangeText={(text) => updateConfig({ value: text })}
            placeholder="Comparison value"
            icon="compare"
          />
        </FormSection>
      );

    case 'text':
      return (
        <FormSection>
          <InfoCard
            icon="format-text"
            title="Text Processing"
            description="Combine, format, or transform text values."
            color="#009688"
          />
          <ModernSegmentedButtons
            label="Text Operation"
            value={config.action || 'combine'}
            onValueChange={(value) => updateConfig({ action: value })}
            buttons={[
              { value: 'combine', label: 'Combine', icon: 'plus' },
              { value: 'replace', label: 'Replace', icon: 'find-replace' },
              { value: 'format', label: 'Format', icon: 'format-text' },
            ]}
          />
          <ModernTextInput
            label="Text 1"
            value={config.text1 || ''}
            onChangeText={(text) => updateConfig({ text1: text })}
            placeholder="First text value"
            icon="text"
          />
          <ModernTextInput
            label="Text 2"
            value={config.text2 || ''}
            onChangeText={(text) => updateConfig({ text2: text })}
            placeholder="Second text value"
            icon="text"
          />
        </FormSection>
      );

    case 'clipboard':
      return (
        <FormSection>
          <InfoCard
            icon="content-paste"
            title="Clipboard"
            description="Copy text to or paste text from the device clipboard."
            color="#E91E63"
          />
          <ModernSegmentedButtons
            label="Clipboard Action"
            value={config.action || 'copy'}
            onValueChange={(value) => updateConfig({ action: value })}
            buttons={[
              { value: 'copy', label: 'Copy', icon: 'content-copy' },
              { value: 'paste', label: 'Paste', icon: 'content-paste' },
            ]}
          />
          {config.action === 'copy' && (
            <ModernTextInput
              label="Text to Copy"
              value={config.text || ''}
              onChangeText={(text) => updateConfig({ text: text })}
              placeholder="Text to copy to clipboard"
              multiline
              numberOfLines={3}
              icon="text"
            />
          )}
        </FormSection>
      );

    default:
      return (
        <InfoCard
          icon="help-circle"
          title="Configuration Not Available"
          description={`Configuration for ${step.type} step type is not yet implemented.`}
          color="#757575"
        />
      );
  }
};

export default ModernStepConfigRenderer;