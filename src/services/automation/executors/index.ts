// Export all base and executor classes
export { BaseExecutor } from './BaseExecutor';
export { NotificationExecutor } from './NotificationExecutor';
export { SMSExecutor } from './SMSExecutor';
export { EmailExecutor } from './EmailExecutor';
export { WebhookExecutor } from './WebhookExecutor';
export { DelayExecutor } from './DelayExecutor';
export { VariableExecutor } from './VariableExecutor';
export { GetVariableExecutor } from './GetVariableExecutor';
export { PromptInputExecutor } from './PromptInputExecutor';
export { LocationExecutor } from './LocationExecutor';
export { ConditionExecutor } from './ConditionExecutor';
export { TextExecutor } from './TextExecutor';
export { MathExecutor } from './MathExecutor';
export { PhotoExecutor } from './PhotoExecutor';
export { ClipboardExecutor } from './ClipboardExecutor';
export { AppExecutor } from './AppExecutor';
export { LoopExecutor } from './LoopExecutor';
export { OpenUrlExecutor } from './OpenUrlExecutor';
export { ShareTextExecutor } from './ShareTextExecutor';
// New executors
export { CloudStorageExecutor } from './CloudStorageExecutor';
export { FileExecutor } from './FileExecutor';
export { RandomExecutor } from './RandomExecutor';
export { GroupExecutor } from './GroupExecutor';
export { ExternalAutomationExecutor } from './ExternalAutomationExecutor';
export { QRCodeExecutor } from './QRCodeExecutor';
export { FaceTimeExecutor } from './FaceTimeExecutor';
export { CallExecutor } from './CallExecutor';
export { HttpRequestExecutor } from './HttpRequestExecutor';
export { JsonParserExecutor } from './JsonParserExecutor';
export { TextToSpeechExecutor } from './TextToSpeechExecutor';
export { MenuSelectionExecutor } from './MenuSelectionExecutor';

// Import all executors for registration
import { NotificationExecutor } from './NotificationExecutor';
import { SMSExecutor } from './SMSExecutor';
import { EmailExecutor } from './EmailExecutor';
import { WebhookExecutor } from './WebhookExecutor';
import { DelayExecutor } from './DelayExecutor';
import { VariableExecutor } from './VariableExecutor';
import { GetVariableExecutor } from './GetVariableExecutor';
import { PromptInputExecutor } from './PromptInputExecutor';
import { LocationExecutor } from './LocationExecutor';
import { ConditionExecutor } from './ConditionExecutor';
import { TextExecutor } from './TextExecutor';
import { MathExecutor } from './MathExecutor';
import { PhotoExecutor } from './PhotoExecutor';
import { ClipboardExecutor } from './ClipboardExecutor';
import { AppExecutor } from './AppExecutor';
import { LoopExecutor } from './LoopExecutor';
import { OpenUrlExecutor } from './OpenUrlExecutor';
import { ShareTextExecutor } from './ShareTextExecutor';
// New executors
import { CloudStorageExecutor } from './CloudStorageExecutor';
import { FileExecutor } from './FileExecutor';
import { RandomExecutor } from './RandomExecutor';
import { GroupExecutor } from './GroupExecutor';
import { ExternalAutomationExecutor } from './ExternalAutomationExecutor';
import { QRCodeExecutor } from './QRCodeExecutor';
import { FaceTimeExecutor } from './FaceTimeExecutor';
import { CallExecutor } from './CallExecutor';
import { HttpRequestExecutor } from './HttpRequestExecutor';
import { JsonParserExecutor } from './JsonParserExecutor';
import { TextToSpeechExecutor } from './TextToSpeechExecutor';
import { MenuSelectionExecutor } from './MenuSelectionExecutor';

// Create executor map with all step types
export const executorMap = new Map([
  // Communication
  ['notification', new NotificationExecutor()],
  ['sms', new SMSExecutor()],
  ['email', new EmailExecutor()],
  ['facetime', new FaceTimeExecutor()],
  ['call', new CallExecutor()],
  ['webhook', new WebhookExecutor()],
  ['http_request', new HttpRequestExecutor()],
  ['share_text', new ShareTextExecutor()],
  
  // Control Flow
  ['delay', new DelayExecutor()],
  ['condition', new ConditionExecutor()],
  ['loop', new LoopExecutor()],
  ['group', new GroupExecutor()],
  ['external_automation', new ExternalAutomationExecutor()],
  
  // Variables & Data
  ['variable', new VariableExecutor()],
  ['get_variable', new GetVariableExecutor()],
  ['prompt_input', new PromptInputExecutor()],
  ['menu_selection', new MenuSelectionExecutor()],
  ['random', new RandomExecutor()],
  ['json_parser', new JsonParserExecutor()],
  
  // File & Storage
  ['file', new FileExecutor()],
  ['cloud_storage', new CloudStorageExecutor()],
  
  // Location & Device
  ['location', new LocationExecutor()],
  ['photo', new PhotoExecutor()],
  ['clipboard', new ClipboardExecutor()],
  ['qr_code', new QRCodeExecutor()],
  
  // Text & Math Operations
  ['text', new TextExecutor()],
  ['math', new MathExecutor()],
  ['text_to_speech', new TextToSpeechExecutor()],
  
  // App Integration
  ['app', new AppExecutor()],
  ['open_url', new OpenUrlExecutor()],
]);

// Export available step types
export const availableStepTypes = Array.from(executorMap.keys());

// Helper function to get executor by type
export function getExecutor(stepType: string) {
  const executor = executorMap.get(stepType);
  if (!executor) {
    throw new Error(`No executor found for step type: ${stepType}`);
  }
  return executor;
}

// Helper function to check if step type is supported
export function isStepTypeSupported(stepType: string): boolean {
  return executorMap.has(stepType);
}

// Export step type categories for UI organization
export const stepTypeCategories = {
  communication: {
    title: 'Communication',
    icon: 'message',
    steps: ['notification', 'sms', 'email', 'facetime', 'call', 'webhook', 'http_request', 'share_text']
  },
  controlFlow: {
    title: 'Control Flow',
    icon: 'shuffle',
    steps: ['delay', 'condition', 'loop', 'group', 'external_automation']
  },
  variables: {
    title: 'Variables & Data',
    icon: 'variable',
    steps: ['variable', 'get_variable', 'prompt_input', 'menu_selection', 'random', 'json_parser']
  },
  fileStorage: {
    title: 'Files & Storage',
    icon: 'folder',
    steps: ['file', 'cloud_storage']
  },
  device: {
    title: 'Device & Location',
    icon: 'cellphone',
    steps: ['location', 'photo', 'clipboard', 'qr_code']
  },
  operations: {
    title: 'Text & Math',
    icon: 'calculator',
    steps: ['text', 'math', 'text_to_speech']
  },
  integration: {
    title: 'App Integration',
    icon: 'application',
    steps: ['app', 'open_url']
  }
};

// Export step type metadata for UI
export const stepTypeMetadata = {
  // Communication
  notification: { 
    title: 'Send Notification', 
    icon: 'bell', 
    description: 'Display a local notification',
    color: '#4CAF50'
  },
  sms: { 
    title: 'Send SMS', 
    icon: 'message-text', 
    description: 'Send a text message',
    color: '#2196F3'
  },
  email: { 
    title: 'Send Email', 
    icon: 'email', 
    description: 'Compose and send an email',
    color: '#FF9800'
  },
  facetime: {
    title: 'FaceTime Call',
    icon: 'video',
    description: 'Make a FaceTime video or audio call',
    color: '#34C759'
  },
  call: {
    title: 'Phone Call',
    icon: 'phone',
    description: 'Make a phone call',
    color: '#007AFF'
  },
  webhook: { 
    title: 'Webhook', 
    icon: 'web', 
    description: 'Make a webhook request',
    color: '#9C27B0'
  },
  http_request: {
    title: 'HTTP Request',
    icon: 'api',
    description: 'Make HTTP API calls with response handling',
    color: '#6A1B9A'
  },
  share_text: { 
    title: 'Share Text', 
    icon: 'share-variant', 
    description: 'Share text via system share sheet',
    color: '#00BCD4'
  },
  
  // Control Flow
  delay: { 
    title: 'Delay', 
    icon: 'timer-sand', 
    description: 'Wait for a specified duration',
    color: '#607D8B'
  },
  condition: { 
    title: 'If/Then', 
    icon: 'help-rhombus', 
    description: 'Conditional logic branching',
    color: '#795548'
  },
  loop: { 
    title: 'Repeat Loop', 
    icon: 'repeat', 
    description: 'Repeat actions multiple times',
    color: '#FF5722'
  },
  group: { 
    title: 'Group Actions', 
    icon: 'group', 
    description: 'Execute multiple steps together',
    color: '#3F51B5'
  },
  external_automation: { 
    title: 'Run Automation', 
    icon: 'play-circle', 
    description: 'Trigger another automation',
    color: '#E91E63'
  },
  
  // Variables & Data
  variable: { 
    title: 'Set Variable', 
    icon: 'variable', 
    description: 'Store a value in a variable',
    color: '#673AB7'
  },
  get_variable: { 
    title: 'Get Variable', 
    icon: 'variable-box', 
    description: 'Retrieve a stored variable',
    color: '#9C27B0'
  },
  prompt_input: { 
    title: 'Prompt Input', 
    icon: 'form-textbox', 
    description: 'Ask user for input',
    color: '#00BCD4'
  },
  menu_selection: {
    title: 'Menu Selection',
    icon: 'format-list-bulleted',
    description: 'Show interactive menu for user selection',
    color: '#4CAF50'
  },
  random: { 
    title: 'Random', 
    icon: 'dice-multiple', 
    description: 'Generate random values',
    color: '#FF6B6B'
  },
  json_parser: {
    title: 'JSON Parser',
    icon: 'code-braces',
    description: 'Parse and extract data from JSON',
    color: '#FF5722'
  },
  
  // File & Storage
  file: { 
    title: 'File Operations', 
    icon: 'file', 
    description: 'Read, write, or manage files',
    color: '#4CAF50'
  },
  cloud_storage: { 
    title: 'Cloud Storage', 
    icon: 'cloud-upload', 
    description: 'Upload/download from cloud',
    color: '#2196F3'
  },
  
  // Device & Location
  location: { 
    title: 'Location', 
    icon: 'map-marker', 
    description: 'Get or share location',
    color: '#F44336'
  },
  photo: { 
    title: 'Camera/Photo', 
    icon: 'camera', 
    description: 'Take or select a photo',
    color: '#FF9800'
  },
  clipboard: { 
    title: 'Clipboard', 
    icon: 'content-copy', 
    description: 'Copy or paste from clipboard',
    color: '#9E9E9E'
  },
  qr_code: { 
    title: 'QR Code', 
    icon: 'qrcode', 
    description: 'Generate or scan QR codes',
    color: '#212121'
  },
  
  // Text & Math
  text: { 
    title: 'Text Operations', 
    icon: 'format-text', 
    description: 'Manipulate text strings',
    color: '#009688'
  },
  math: { 
    title: 'Math Operations', 
    icon: 'calculator', 
    description: 'Perform calculations',
    color: '#FFC107'
  },
  text_to_speech: {
    title: 'Text to Speech',
    icon: 'volume-high',
    description: 'Convert text to speech',
    color: '#8BC34A'
  },
  
  // App Integration
  app: { 
    title: 'Open App', 
    icon: 'application', 
    description: 'Launch another application',
    color: '#3F51B5'
  },
  open_url: { 
    title: 'Open URL', 
    icon: 'open-in-new', 
    description: 'Open a web link',
    color: '#2196F3'
  }
};