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