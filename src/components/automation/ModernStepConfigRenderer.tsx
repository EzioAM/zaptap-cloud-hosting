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
  theme?: any; // Optional theme prop
}

const ModernStepConfigRenderer: React.FC<ModernStepConfigRendererProps> = ({
  step,
  config,
  onConfigChange,
  theme, // Accept but don't use for now
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

    case 'prompt_input':
      return (
        <FormSection>
          <InfoCard
            icon="form-textbox"
            title="Prompt for Input"
            description="Ask the user to enter information that can be used in subsequent steps."
            color="#9C27B0"
          />
          <ModernTextInput
            label="Prompt Title"
            value={config.title || ''}
            onChangeText={(text) => updateConfig({ title: text })}
            placeholder="Input Required"
            icon="format-title"
          />
          <ModernTextInput
            label="Prompt Message"
            value={config.message || ''}
            onChangeText={(text) => updateConfig({ message: text })}
            placeholder="Please enter your information..."
            multiline
            numberOfLines={2}
            icon="message-text"
          />
          <ModernTextInput
            label="Variable Name"
            value={config.variableName || ''}
            onChangeText={(text) => updateConfig({ variableName: text })}
            placeholder="userInput"
            icon="variable"
            helper="This variable can be used in later steps as {{userInput}}"
          />
          <ModernTextInput
            label="Default Value (optional)"
            value={config.defaultValue || ''}
            onChangeText={(text) => updateConfig({ defaultValue: text })}
            placeholder="Default response"
            icon="text"
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
            icon="timer"
            title="Timed Delay"
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
          <ModernSegmentedButtons
            label="Duration Presets"
            value=""
            onValueChange={(value) => {
              const presets = { '1s': 1000, '5s': 5000, '10s': 10000, '30s': 30000, '1m': 60000 };
              updateConfig({ delay: presets[value as keyof typeof presets] || config.delay });
            }}
            buttons={[
              { value: '1s', label: '1s', icon: 'numeric-1' },
              { value: '5s', label: '5s', icon: 'numeric-5' },
              { value: '10s', label: '10s', icon: 'timer' },
              { value: '30s', label: '30s', icon: 'timer' },
              { value: '1m', label: '1m', icon: 'clock' },
            ]}
          />
        </FormSection>
      );

    case 'wait':
      return (
        <FormSection>
          <InfoCard
            icon="clock"
            title="Wait/Pause"
            description="Pause automation execution for user interaction or system processes."
            color="#9E9E9E"
          />
          <ModernSegmentedButtons
            label="Wait Type"
            value={config.waitType || 'duration'}
            onValueChange={(value) => updateConfig({ waitType: value })}
            buttons={[
              { value: 'duration', label: 'Duration', icon: 'timer' },
              { value: 'user_input', label: 'User Input', icon: 'hand-back-left' },
              { value: 'condition', label: 'Condition', icon: 'help-circle' },
            ]}
          />
          {config.waitType === 'duration' && (
            <ModernTextInput
              label="Wait Duration (seconds)"
              value={String(config.duration || 5)}
              onChangeText={(text) => updateConfig({ duration: parseInt(text) || 5 })}
              placeholder="5"
              keyboardType="numeric"
              icon="timer"
            />
          )}
          {config.waitType === 'user_input' && (
            <ModernTextInput
              label="Prompt Message"
              value={config.message || ''}
              onChangeText={(text) => updateConfig({ message: text })}
              placeholder="Tap Continue when ready..."
              icon="message-text"
            />
          )}
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

    case 'photo':
      return (
        <FormSection>
          <InfoCard
            icon="camera"
            title="Photo Capture"
            description="Take a photo with the camera or select from photo library."
            color="#E91E63"
          />
          <ModernSegmentedButtons
            label="Photo Action"
            value={config.action || 'take'}
            onValueChange={(value) => updateConfig({ action: value })}
            buttons={[
              { value: 'take', label: 'Take Photo', icon: 'camera' },
              { value: 'select', label: 'Select Photo', icon: 'image' },
              { value: 'both', label: 'Choose Option', icon: 'camera-plus' },
            ]}
          />
          <ModernSegmentedButtons
            label="Save Location"
            value={config.saveToAlbum ? 'album' : 'temp'}
            onValueChange={(value) => updateConfig({ saveToAlbum: value === 'album' })}
            buttons={[
              { value: 'temp', label: 'Temporary', icon: 'clock' },
              { value: 'album', label: 'Save to Album', icon: 'content-save' },
            ]}
          />
          {config.saveToAlbum && (
            <ModernTextInput
              label="Album Name (optional)"
              value={config.albumName || ''}
              onChangeText={(text) => updateConfig({ albumName: text })}
              placeholder="Automation Photos"
              icon="folder-image"
            />
          )}
        </FormSection>
      );

    case 'math':
      return (
        <FormSection>
          <InfoCard
            icon="calculator"
            title="Math Operations"
            description="Perform mathematical calculations and store the result."
            color="#FF5722"
          />
          <ModernSegmentedButtons
            label="Operation"
            value={config.operation || 'add'}
            onValueChange={(value) => updateConfig({ operation: value })}
            buttons={[
              { value: 'add', label: 'Add', icon: 'plus' },
              { value: 'subtract', label: 'Subtract', icon: 'minus' },
              { value: 'multiply', label: 'Multiply', icon: 'close' },
              { value: 'divide', label: 'Divide', icon: 'division' },
            ]}
          />
          <ModernTextInput
            label="First Number"
            value={String(config.number1 || '')}
            onChangeText={(text) => updateConfig({ number1: text })}
            placeholder="10"
            keyboardType="numeric"
            icon="numeric"
            helper="Can use variables like {{myNumber}}"
          />
          <ModernTextInput
            label="Second Number"
            value={String(config.number2 || '')}
            onChangeText={(text) => updateConfig({ number2: text })}
            placeholder="5"
            keyboardType="numeric"
            icon="numeric"
            helper="Can use variables like {{myNumber}}"
          />
          <ModernTextInput
            label="Result Variable Name"
            value={config.resultVariable || ''}
            onChangeText={(text) => updateConfig({ resultVariable: text })}
            placeholder="mathResult"
            icon="variable"
            helper="Store result in this variable for later use"
          />
        </FormSection>
      );

    case 'open-app':
      return (
        <FormSection>
          <InfoCard
            icon="application"
            title="Open Application"
            description="Launch a specific app on the device."
            color="#009688"
          />
          <ModernTextInput
            label="App Identifier"
            value={config.app || ''}
            onChangeText={(text) => updateConfig({ app: text })}
            placeholder="com.example.app"
            icon="application"
            helper="Use app package name (Android) or bundle ID (iOS)"
          />
          <ModernSegmentedButtons
            label="Common Apps"
            value=""
            onValueChange={(value) => updateConfig({ app: value })}
            buttons={[
              { value: 'music', label: 'Music', icon: 'music' },
              { value: 'camera', label: 'Camera', icon: 'camera' },
              { value: 'maps', label: 'Maps', icon: 'map' },
              { value: 'settings', label: 'Settings', icon: 'cog' },
            ]}
          />
          <ModernTextInput
            label="App Name (Display)"
            value={config.appName || ''}
            onChangeText={(text) => updateConfig({ appName: text })}
            placeholder="Music App"
            icon="label"
            helper="Human-readable name for the app"
          />
        </FormSection>
      );

    case 'wifi':
      return (
        <FormSection>
          <InfoCard
            icon="wifi"
            title="WiFi Control"
            description="Turn WiFi on or off on the device."
            color="#607D8B"
          />
          <ModernSegmentedButtons
            label="WiFi Action"
            value={config.enabled ? 'on' : 'off'}
            onValueChange={(value) => updateConfig({ enabled: value === 'on' })}
            buttons={[
              { value: 'on', label: 'Turn On', icon: 'wifi' },
              { value: 'off', label: 'Turn Off', icon: 'wifi-off' },
            ]}
          />
        </FormSection>
      );

    case 'bluetooth':
      return (
        <FormSection>
          <InfoCard
            icon="bluetooth"
            title="Bluetooth Control"
            description="Turn Bluetooth on or off on the device."
            color="#795548"
          />
          <ModernSegmentedButtons
            label="Bluetooth Action"
            value={config.enabled ? 'on' : 'off'}
            onValueChange={(value) => updateConfig({ enabled: value === 'on' })}
            buttons={[
              { value: 'on', label: 'Turn On', icon: 'bluetooth' },
              { value: 'off', label: 'Turn Off', icon: 'bluetooth-off' },
            ]}
          />
        </FormSection>
      );

    case 'brightness':
      return (
        <FormSection>
          <InfoCard
            icon="brightness-6"
            title="Screen Brightness"
            description="Adjust the device screen brightness level."
            color="#FFC107"
          />
          <ModernTextInput
            label="Brightness Level (%)"
            value={String(config.level || 50)}
            onChangeText={(text) => {
              const level = Math.max(0, Math.min(100, parseInt(text) || 50));
              updateConfig({ level });
            }}
            placeholder="50"
            keyboardType="numeric"
            icon="brightness-6"
            helper="0% = completely dim, 100% = maximum brightness"
          />
          <ModernSegmentedButtons
            label="Preset Levels"
            value=""
            onValueChange={(value) => {
              const presets = { 'low': 20, 'medium': 50, 'high': 80, 'max': 100 };
              updateConfig({ level: presets[value as keyof typeof presets] || config.level });
            }}
            buttons={[
              { value: 'low', label: '20%', icon: 'brightness-4' },
              { value: 'medium', label: '50%', icon: 'brightness-5' },
              { value: 'high', label: '80%', icon: 'brightness-6' },
              { value: 'max', label: '100%', icon: 'brightness-7' },
            ]}
          />
        </FormSection>
      );

    case 'volume':
      return (
        <FormSection>
          <InfoCard
            icon="volume-high"
            title="System Volume"
            description="Adjust the device volume level."
            color="#E91E63"
          />
          <ModernTextInput
            label="Volume Level (%)"
            value={String(config.level || 50)}
            onChangeText={(text) => {
              const level = Math.max(0, Math.min(100, parseInt(text) || 50));
              updateConfig({ level });
            }}
            placeholder="50"
            keyboardType="numeric"
            icon="volume-high"
            helper="0% = mute, 100% = maximum volume"
          />
          <ModernSegmentedButtons
            label="Preset Levels"
            value=""
            onValueChange={(value) => {
              const presets = { 'mute': 0, 'low': 25, 'medium': 50, 'high': 75, 'max': 100 };
              updateConfig({ level: presets[value as keyof typeof presets] || config.level });
            }}
            buttons={[
              { value: 'mute', label: 'Mute', icon: 'volume-off' },
              { value: 'low', label: '25%', icon: 'volume-low' },
              { value: 'medium', label: '50%', icon: 'volume-medium' },
              { value: 'high', label: '75%', icon: 'volume-high' },
              { value: 'max', label: '100%', icon: 'volume-high' },
            ]}
          />
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

    case 'loop':
      return (
        <FormSection>
          <InfoCard
            icon="repeat"
            title="Repeat Loop"
            description="Repeat a set of actions multiple times or until a condition is met."
            color="#CDDC39"
          />
          <ModernSegmentedButtons
            label="Loop Type"
            value={config.loopType || 'count'}
            onValueChange={(value) => updateConfig({ loopType: value })}
            buttons={[
              { value: 'count', label: 'Count', icon: 'numeric' },
              { value: 'condition', label: 'Condition', icon: 'help-circle' },
              { value: 'infinite', label: 'Infinite', icon: 'infinity' },
            ]}
          />
          {config.loopType === 'count' && (
            <ModernTextInput
              label="Repeat Count"
              value={String(config.count || 3)}
              onChangeText={(text) => updateConfig({ count: parseInt(text) || 3 })}
              placeholder="3"
              keyboardType="numeric"
              icon="numeric"
            />
          )}
          {config.loopType === 'condition' && (
            <View>
              <ModernTextInput
                label="Condition Variable"
                value={config.conditionVariable || ''}
                onChangeText={(text) => updateConfig({ conditionVariable: text })}
                placeholder="loopCounter"
                icon="variable"
              />
              <ModernTextInput
                label="Stop When Value"
                value={config.stopValue || ''}
                onChangeText={(text) => updateConfig({ stopValue: text })}
                placeholder="10"
                icon="stop"
              />
            </View>
          )}
        </FormSection>
      );

    case 'shortcut':
      return (
        <FormSection>
          <InfoCard
            icon="play-circle"
            title="Run Shortcut"
            description="Execute another automation or shortcut."
            color="#FF5722"
          />
          <ModernTextInput
            label="Shortcut Name"
            value={config.shortcutName || ''}
            onChangeText={(text) => updateConfig({ shortcutName: text })}
            placeholder="My Other Automation"
            icon="play-circle"
          />
          <ModernTextInput
            label="Shortcut ID"
            value={config.shortcutId || ''}
            onChangeText={(text) => updateConfig({ shortcutId: text })}
            placeholder="automation-uuid-here"
            icon="identifier"
            helper="The unique identifier of the automation to run"
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

    case 'http':
      return (
        <FormSection>
          <InfoCard
            icon="api"
            title="HTTP Request"
            description="Make advanced HTTP requests with custom headers and authentication."
            color="#3F51B5"
          />
          <ModernTextInput
            label="URL"
            value={config.url || ''}
            onChangeText={(text) => updateConfig({ url: text })}
            placeholder="https://api.example.com/endpoint"
            keyboardType="url"
            icon="link"
          />
          <ModernSegmentedButtons
            label="HTTP Method"
            value={config.method || 'GET'}
            onValueChange={(value) => updateConfig({ method: value })}
            buttons={[
              { value: 'GET', label: 'GET', icon: 'download' },
              { value: 'POST', label: 'POST', icon: 'upload' },
              { value: 'PUT', label: 'PUT', icon: 'pencil' },
              { value: 'DELETE', label: 'DELETE', icon: 'delete' },
            ]}
          />
          <ModernTextInput
            label="Headers (JSON)"
            value={config.headers || ''}
            onChangeText={(text) => updateConfig({ headers: text })}
            placeholder='{"Authorization": "Bearer token"}'
            multiline
            numberOfLines={2}
            icon="code-braces"
          />
          {config.method !== 'GET' && (
            <ModernTextInput
              label="Request Body"
              value={config.body || ''}
              onChangeText={(text) => updateConfig({ body: text })}
              placeholder='{"data": "value"}'
              multiline
              numberOfLines={3}
              icon="code-braces"
            />
          )}
        </FormSection>
      );

    case 'json':
      return (
        <FormSection>
          <InfoCard
            icon="code-json"
            title="JSON Parser"
            description="Parse JSON data and extract specific values."
            color="#00BCD4"
          />
          <ModernTextInput
            label="JSON Data"
            value={config.jsonData || ''}
            onChangeText={(text) => updateConfig({ jsonData: text })}
            placeholder='{"key": "value", "number": 123}'
            multiline
            numberOfLines={3}
            icon="code-json"
          />
          <ModernTextInput
            label="Key Path"
            value={config.keyPath || ''}
            onChangeText={(text) => updateConfig({ keyPath: text })}
            placeholder="data.user.name"
            icon="key"
            helper="Use dot notation to access nested properties"
          />
          <ModernTextInput
            label="Result Variable"
            value={config.resultVariable || ''}
            onChangeText={(text) => updateConfig({ resultVariable: text })}
            placeholder="parsedValue"
            icon="variable"
          />
        </FormSection>
      );

    case 'cloud_storage':
      return (
        <FormSection>
          <InfoCard
            icon="cloud-upload"
            title="Cloud Storage"
            description="Upload, download, or manage files in cloud storage"
            color="#2196F3"
          />
          <ModernSegmentedButtons
            value={config.action || 'upload'}
            onValueChange={(value) => updateConfig({ action: value })}
            buttons={[
              { value: 'upload', label: 'Upload' },
              { value: 'download', label: 'Download' },
              { value: 'list', label: 'List' },
              { value: 'delete', label: 'Delete' },
            ]}
          />
          <ModernTextInput
            label="Bucket Name"
            value={config.bucket || 'user-files'}
            onChangeText={(text) => updateConfig({ bucket: text })}
            placeholder="user-files"
            icon="folder"
            helper="Storage bucket name (default: user-files)"
          />
          <ModernTextInput
            label="File Name"
            value={config.fileName || ''}
            onChangeText={(text) => updateConfig({ fileName: text })}
            placeholder="document.txt"
            icon="file"
          />
          {config.action === 'upload' && (
            <ModernTextInput
              label="Content/Variable"
              value={config.content || ''}
              onChangeText={(text) => updateConfig({ content: text })}
              placeholder="File content or {{variableName}}"
              multiline
              icon="text"
              helper="Content to upload or variable containing content"
            />
          )}
          <ModernTextInput
            label="Result Variable"
            value={config.variableName || ''}
            onChangeText={(text) => updateConfig({ variableName: text })}
            placeholder="cloudResult"
            icon="variable"
          />
        </FormSection>
      );

    case 'file':
      return (
        <FormSection>
          <InfoCard
            icon="file"
            title="File Operations"
            description="Read, write, or manage local files on device"
            color="#4CAF50"
          />
          <ModernSegmentedButtons
            value={config.action || 'read'}
            onValueChange={(value) => updateConfig({ action: value })}
            buttons={[
              { value: 'read', label: 'Read' },
              { value: 'write', label: 'Write' },
              { value: 'append', label: 'Append' },
              { value: 'delete', label: 'Delete' },
              { value: 'pick', label: 'Pick' },
            ]}
          />
          <ModernTextInput
            label="File Name"
            value={config.fileName || ''}
            onChangeText={(text) => updateConfig({ fileName: text })}
            placeholder="notes.txt"
            icon="file-document"
            helper="File name in app's document directory"
          />
          {(config.action === 'write' || config.action === 'append') && (
            <ModernTextInput
              label="Content"
              value={config.content || ''}
              onChangeText={(text) => updateConfig({ content: text })}
              placeholder="Content to write or {{variableName}}"
              multiline
              numberOfLines={3}
              icon="text"
            />
          )}
          <ModernTextInput
            label="Result Variable"
            value={config.variableName || ''}
            onChangeText={(text) => updateConfig({ variableName: text })}
            placeholder="fileContent"
            icon="variable"
          />
        </FormSection>
      );

    case 'random':
      return (
        <FormSection>
          <InfoCard
            icon="dice-multiple"
            title="Random Generator"
            description="Generate random numbers, strings, UUIDs, and more"
            color="#FF6B6B"
          />
          <ModernSegmentedButtons
            value={config.type || 'number'}
            onValueChange={(value) => updateConfig({ type: value })}
            buttons={[
              { value: 'number', label: 'Number' },
              { value: 'uuid', label: 'UUID' },
              { value: 'string', label: 'String' },
              { value: 'choice', label: 'Choice' },
            ]}
          />
          {config.type === 'number' && (
            <>
              <ModernTextInput
                label="Minimum"
                value={config.min?.toString() || '1'}
                onChangeText={(text) => updateConfig({ min: parseInt(text) || 1 })}
                placeholder="1"
                keyboardType="numeric"
                icon="numeric-1"
              />
              <ModernTextInput
                label="Maximum"
                value={config.max?.toString() || '100'}
                onChangeText={(text) => updateConfig({ max: parseInt(text) || 100 })}
                placeholder="100"
                keyboardType="numeric"
                icon="numeric-9-plus"
              />
            </>
          )}
          {config.type === 'string' && (
            <>
              <ModernTextInput
                label="Length"
                value={config.length?.toString() || '10'}
                onChangeText={(text) => updateConfig({ length: parseInt(text) || 10 })}
                placeholder="10"
                keyboardType="numeric"
                icon="ruler"
              />
              <ModernTextInput
                label="Characters"
                value={config.chars || 'alphanumeric'}
                onChangeText={(text) => updateConfig({ chars: text })}
                placeholder="alphanumeric, letters, numbers, hex"
                icon="alphabetical"
              />
            </>
          )}
          {config.type === 'choice' && (
            <ModernTextInput
              label="Choices (comma separated)"
              value={config.choices || ''}
              onChangeText={(text) => updateConfig({ choices: text })}
              placeholder="Option 1, Option 2, Option 3"
              icon="format-list-bulleted"
            />
          )}
          <ModernTextInput
            label="Variable Name"
            value={config.variableName || ''}
            onChangeText={(text) => updateConfig({ variableName: text })}
            placeholder="randomValue"
            icon="variable"
          />
        </FormSection>
      );

    case 'group':
      return (
        <FormSection>
          <InfoCard
            icon="group"
            title="Group Actions"
            description="Execute multiple steps together in sequence or parallel"
            color="#3F51B5"
          />
          <ModernSegmentedButtons
            value={config.mode || 'sequential'}
            onValueChange={(value) => updateConfig({ mode: value })}
            buttons={[
              { value: 'sequential', label: 'Sequential' },
              { value: 'parallel', label: 'Parallel' },
              { value: 'conditional', label: 'Conditional' },
            ]}
          />
          <ChipGroup
            label="Continue on Error"
            value={config.continueOnError || false}
            onValueChange={(value) => updateConfig({ continueOnError: value })}
            options={[
              { value: true, label: 'Yes' },
              { value: false, label: 'No' },
            ]}
          />
          {config.mode === 'conditional' && (
            <>
              <ModernTextInput
                label="Condition Variable"
                value={config.conditionVariable || ''}
                onChangeText={(text) => updateConfig({ conditionVariable: text })}
                placeholder="isEnabled"
                icon="help-rhombus"
              />
              <ModernTextInput
                label="Expected Value"
                value={config.expectedValue || ''}
                onChangeText={(text) => updateConfig({ expectedValue: text })}
                placeholder="true"
                icon="equal"
              />
            </>
          )}
          <InfoCard
            icon="information"
            title="Note"
            description="Add child steps after creating this group action"
            color="#757575"
          />
        </FormSection>
      );

    case 'external_automation':
      return (
        <FormSection>
          <InfoCard
            icon="play-circle"
            title="Run Automation"
            description="Trigger another automation by name or ID"
            color="#E91E63"
          />
          <ModernTextInput
            label="Automation Name or ID"
            value={config.automationId || ''}
            onChangeText={(text) => updateConfig({ automationId: text })}
            placeholder="My Other Automation"
            icon="play"
            helper="Name or ID of the automation to run"
          />
          <ChipGroup
            label="Wait for Completion"
            value={config.waitForCompletion || false}
            onValueChange={(value) => updateConfig({ waitForCompletion: value })}
            options={[
              { value: true, label: 'Yes' },
              { value: false, label: 'No' },
            ]}
          />
          {config.waitForCompletion && (
            <ModernTextInput
              label="Timeout (seconds)"
              value={config.timeout?.toString() || '30'}
              onChangeText={(text) => updateConfig({ timeout: parseInt(text) || 30 })}
              placeholder="30"
              keyboardType="numeric"
              icon="timer"
            />
          )}
          <ModernTextInput
            label="Input Variables (JSON)"
            value={config.inputs || '{}'}
            onChangeText={(text) => updateConfig({ inputs: text })}
            placeholder='{"key": "value"}'
            multiline
            icon="code-json"
            helper="Variables to pass to the automation"
          />
        </FormSection>
      );

    case 'qr_code':
      return (
        <FormSection>
          <InfoCard
            icon="qrcode"
            title="QR Code"
            description="Generate QR codes with custom data"
            color="#212121"
          />
          <ModernSegmentedButtons
            value={config.action || 'generate'}
            onValueChange={(value) => updateConfig({ action: value })}
            buttons={[
              { value: 'generate', label: 'Generate' },
              { value: 'generateFile', label: 'Save File' },
              { value: 'share', label: 'Share' },
            ]}
          />
          <ModernTextInput
            label="Data"
            value={config.data || ''}
            onChangeText={(text) => updateConfig({ data: text })}
            placeholder="https://example.com or {{variableName}}"
            multiline
            icon="text"
            helper="Text, URL, or data to encode"
          />
          {(config.action === 'generateFile' || config.action === 'share') && (
            <ModernTextInput
              label="File Name"
              value={config.fileName || ''}
              onChangeText={(text) => updateConfig({ fileName: text })}
              placeholder="qr_code.png"
              icon="file-image"
            />
          )}
          {config.action === 'share' && (
            <ModernTextInput
              label="Share Message"
              value={config.message || ''}
              onChangeText={(text) => updateConfig({ message: text })}
              placeholder="Check out this QR code"
              icon="message"
            />
          )}
          <ModernTextInput
            label="Size (pixels)"
            value={config.size?.toString() || '200'}
            onChangeText={(text) => updateConfig({ size: parseInt(text) || 200 })}
            placeholder="200"
            keyboardType="numeric"
            icon="resize"
          />
          <ModernTextInput
            label="Variable Name"
            value={config.variableName || ''}
            onChangeText={(text) => updateConfig({ variableName: text })}
            placeholder="qrCodeData"
            icon="variable"
          />
        </FormSection>
      );

    case 'facetime':
      return (
        <FormSection>
          <InfoCard
            icon="video"
            title="FaceTime Call"
            description="Make a FaceTime video or audio call to a contact."
            color="#34C759"
          />
          <ModernTextInput
            label="Phone Number or Email"
            value={config.recipient || ''}
            onChangeText={(text) => updateConfig({ recipient: text })}
            placeholder="+1234567890 or email@example.com"
            icon="phone"
            helper="Enter phone number or email address for FaceTime"
          />
          <ModernSegmentedButtons
            value={config.callType || 'video'}
            onValueChange={(value) => updateConfig({ callType: value })}
            buttons={[
              { value: 'video', label: 'Video Call', icon: 'video' },
              { value: 'audio', label: 'Audio Call', icon: 'phone' },
            ]}
          />
        </FormSection>
      );

    case 'call':
      return (
        <FormSection>
          <InfoCard
            icon="phone"
            title="Phone Call"
            description="Make a phone call to a contact."
            color="#007AFF"
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
            label="Caller ID Name (Optional)"
            value={config.callerName || ''}
            onChangeText={(text) => updateConfig({ callerName: text })}
            placeholder="Contact Name"
            icon="account"
            helper="Optional display name for the call"
          />
        </FormSection>
      );

    case 'http_request':
      return (
        <FormSection>
          <InfoCard
            icon="api"
            title="HTTP Request"
            description="Make HTTP/HTTPS requests to APIs and web services."
            color="#6A1B9A"
          />
          <ModernTextInput
            label="URL"
            value={config.url || ''}
            onChangeText={(text) => updateConfig({ url: text })}
            placeholder="https://api.example.com/endpoint"
            icon="web"
            helper="Enter the full URL including protocol"
          />
          <ModernSegmentedButtons
            value={config.method || 'GET'}
            onValueChange={(value) => updateConfig({ method: value })}
            buttons={[
              { value: 'GET', label: 'GET' },
              { value: 'POST', label: 'POST' },
              { value: 'PUT', label: 'PUT' },
              { value: 'DELETE', label: 'DELETE' },
            ]}
          />
          {(config.method === 'POST' || config.method === 'PUT') && (
            <ModernTextInput
              label="Request Body (JSON)"
              value={config.body || ''}
              onChangeText={(text) => updateConfig({ body: text })}
              placeholder='{"key": "value"}'
              multiline
              numberOfLines={4}
              icon="code-json"
              helper="Enter valid JSON for the request body"
            />
          )}
          <ModernTextInput
            label="Headers (JSON)"
            value={config.headers || ''}
            onChangeText={(text) => updateConfig({ headers: text })}
            placeholder='{"Authorization": "Bearer token"}'
            multiline
            numberOfLines={3}
            icon="format-header-pound"
            helper="Optional: Add custom headers as JSON"
          />
          <ModernTextInput
            label="Result Variable"
            value={config.variableName || ''}
            onChangeText={(text) => updateConfig({ variableName: text })}
            placeholder="apiResponse"
            icon="variable"
            helper="Store the response in this variable"
          />
        </FormSection>
      );

    case 'share_text':
      return (
        <FormSection>
          <InfoCard
            icon="share-variant"
            title="Share Text"
            description="Share text content via the system share sheet."
            color="#00BCD4"
          />
          <ModernTextInput
            label="Text to Share"
            value={config.text || ''}
            onChangeText={(text) => updateConfig({ text: text })}
            placeholder="Content to share..."
            multiline
            numberOfLines={3}
            icon="text"
            helper="Text content or use {{variables}}"
          />
          <ModernTextInput
            label="Share Title (Optional)"
            value={config.title || ''}
            onChangeText={(text) => updateConfig({ title: text })}
            placeholder="Share Title"
            icon="format-title"
            helper="Optional title for the share dialog"
          />
          <ModernTextInput
            label="Share Message (Optional)"
            value={config.message || ''}
            onChangeText={(text) => updateConfig({ message: text })}
            placeholder="Check this out!"
            icon="message"
            helper="Optional message for the share dialog"
          />
        </FormSection>
      );

    case 'json_parser':
      return (
        <FormSection>
          <InfoCard
            icon="code-braces"
            title="JSON Parser"
            description="Parse and extract data from JSON strings."
            color="#FF5722"
          />
          <ModernTextInput
            label="JSON Input"
            value={config.jsonInput || ''}
            onChangeText={(text) => updateConfig({ jsonInput: text })}
            placeholder='{"key": "value", "array": [1, 2, 3]}'
            multiline
            numberOfLines={4}
            icon="code-json"
            helper="Enter or use a variable containing JSON data"
          />
          <ModernTextInput
            label="Extract Path"
            value={config.extractPath || ''}
            onChangeText={(text) => updateConfig({ extractPath: text })}
            placeholder="data.items[0].name"
            icon="magnify"
            helper="Use dot notation to extract specific values"
          />
          <ModernTextInput
            label="Output Variable"
            value={config.outputVariable || ''}
            onChangeText={(text) => updateConfig({ outputVariable: text })}
            placeholder="extractedData"
            icon="variable"
            helper="Store the extracted value in this variable"
          />
        </FormSection>
      );

    case 'text_to_speech':
      return (
        <FormSection>
          <InfoCard
            icon="volume-high"
            title="Text to Speech"
            description="Convert text to speech and play it."
            color="#8BC34A"
          />
          <ModernTextInput
            label="Text to Speak"
            value={config.text || ''}
            onChangeText={(text) => updateConfig({ text: text })}
            placeholder="Text to convert to speech..."
            multiline
            numberOfLines={3}
            icon="text"
            helper="Enter text or use {{variables}}"
          />
          <ModernTextInput
            label="Language Code"
            value={config.language || 'en-US'}
            onChangeText={(text) => updateConfig({ language: text })}
            placeholder="en-US"
            icon="translate"
            helper="Language code (e.g., en-US, es-ES, fr-FR)"
          />
          <ModernTextInput
            label="Speech Rate"
            value={config.rate?.toString() || '1.0'}
            onChangeText={(text) => updateConfig({ rate: parseFloat(text) || 1.0 })}
            placeholder="1.0"
            keyboardType="numeric"
            icon="speedometer"
            helper="Speech rate (0.5 = slower, 2.0 = faster)"
          />
          <ModernTextInput
            label="Pitch"
            value={config.pitch?.toString() || '1.0'}
            onChangeText={(text) => updateConfig({ pitch: parseFloat(text) || 1.0 })}
            placeholder="1.0"
            keyboardType="numeric"
            icon="music-note"
            helper="Voice pitch (0.5 = lower, 2.0 = higher)"
          />
        </FormSection>
      );

    case 'menu_selection':
      return (
        <FormSection>
          <InfoCard
            icon="format-list-bulleted"
            title="Menu Selection"
            description="Show an interactive menu for user selection."
            color="#4CAF50"
          />
          <ModernTextInput
            label="Menu Title"
            value={config.title || ''}
            onChangeText={(text) => updateConfig({ title: text })}
            placeholder="Choose an option"
            icon="format-title"
            helper="Title shown at the top of the menu"
          />
          <ModernTextInput
            label="Menu Options (comma separated)"
            value={config.options || ''}
            onChangeText={(text) => updateConfig({ options: text })}
            placeholder="Option 1, Option 2, Option 3"
            multiline
            numberOfLines={2}
            icon="format-list-bulleted"
            helper="Comma-separated list of menu options"
          />
          <ModernTextInput
            label="Result Variable"
            value={config.variableName || ''}
            onChangeText={(text) => updateConfig({ variableName: text })}
            placeholder="selectedOption"
            icon="variable"
            helper="Store the selected option in this variable"
          />
          <ModernSegmentedButtons
            value={config.allowMultiple ? 'multiple' : 'single'}
            onValueChange={(value) => updateConfig({ allowMultiple: value === 'multiple' })}
            buttons={[
              { value: 'single', label: 'Single Selection' },
              { value: 'multiple', label: 'Multiple Selection' },
            ]}
          />
        </FormSection>
      );

    case 'get_variable':
      return (
        <FormSection>
          <InfoCard
            icon="variable-box"
            title="Get Variable"
            description="Retrieve a stored variable value."
            color="#9C27B0"
          />
          <ModernTextInput
            label="Variable Name"
            value={config.variableName || ''}
            onChangeText={(text) => updateConfig({ variableName: text })}
            placeholder="myVariable"
            icon="variable"
            helper="Name of the variable to retrieve"
          />
          <ModernTextInput
            label="Default Value (Optional)"
            value={config.defaultValue || ''}
            onChangeText={(text) => updateConfig({ defaultValue: text })}
            placeholder="Default if not found"
            icon="text"
            helper="Value to use if variable doesn't exist"
          />
        </FormSection>
      );

    case 'open_url':
      return (
        <FormSection>
          <InfoCard
            icon="open-in-new"
            title="Open URL"
            description="Open a web link in the default browser."
            color="#2196F3"
          />
          <ModernTextInput
            label="URL"
            value={config.url || ''}
            onChangeText={(text) => updateConfig({ url: text })}
            placeholder="https://example.com"
            keyboardType="url"
            icon="link"
            helper="Web URL to open"
          />
          <ModernSegmentedButtons
            value={config.openIn || 'browser'}
            onValueChange={(value) => updateConfig({ openIn: value })}
            buttons={[
              { value: 'browser', label: 'Browser' },
              { value: 'in-app', label: 'In-App' },
              { value: 'external', label: 'External App' },
            ]}
          />
        </FormSection>
      );

    case 'app':
      return (
        <FormSection>
          <InfoCard
            icon="application"
            title="Open App"
            description="Launch another application on your device."
            color="#3F51B5"
          />
          <ModernTextInput
            label="App Name or Bundle ID"
            value={config.appId || ''}
            onChangeText={(text) => updateConfig({ appId: text })}
            placeholder="com.example.app"
            icon="application"
            helper="Enter the app name or bundle identifier"
          />
          <ModernTextInput
            label="Deep Link URL (Optional)"
            value={config.deepLink || ''}
            onChangeText={(text) => updateConfig({ deepLink: text })}
            placeholder="app://path/to/content"
            icon="link"
            helper="Optional: Open specific content within the app"
          />
          <ModernTextInput
            label="Launch Parameters (Optional)"
            value={config.params || ''}
            onChangeText={(text) => updateConfig({ params: text })}
            placeholder='{"key": "value"}'
            multiline
            icon="code-json"
            helper="Optional: Pass parameters to the app as JSON"
          />
        </FormSection>
      );

    default:
      return (
        <InfoCard
          icon="help-circle"
          title="Configuration Not Available"
          description={`Configuration for ${step.type} step type is not yet implemented. This step will use default settings when executed.`}
          color="#757575"
        />
      );
  }
};

export default ModernStepConfigRenderer;