export const ICON_MAPPINGS = {
  // Core features
  automation: 'robot',
  myAutomations: 'folder-multiple',
  gallery: 'view-gallery',
  templates: 'file-document-multiple',
  locationTriggers: 'map-marker-radius',
  
  // Navigation
  home: 'home',
  back: 'arrow-left',
  menu: 'menu',
  close: 'close',
  
  // Actions
  build: 'wrench',
  scan: 'qrcode-scan',
  share: 'share-variant',
  developer: 'code-braces',
  settings: 'cog',
  add: 'plus',
  edit: 'pencil',
  delete: 'delete',
  save: 'content-save',
  
  // Status
  success: 'check-circle',
  warning: 'alert-circle',
  error: 'close-circle',
  info: 'information',
  
  // Step types
  notification: 'bell',
  sms: 'message-text',
  email: 'email',
  webhook: 'webhook',
  delay: 'timer-sand',
  location: 'crosshairs-gps',
  variable: 'variable',
  prompt: 'form-textbox',
  condition: 'help-rhombus',
  loop: 'repeat',
  
  // System status
  engine: 'engine',
  cloud: 'cloud-check',
  nfc: 'nfc',
  authenticated: 'account-check',
  
  // Additional icons
  lightning: 'lightning-bolt',
  zap: 'flash',
  tap: 'gesture-tap',
  camera: 'camera',
  qrcode: 'qrcode',
  play: 'play',
  pause: 'pause',
  stop: 'stop',
  refresh: 'refresh',
  filter: 'filter',
  sort: 'sort',
  search: 'magnify',
} as const;

export type IconName = keyof typeof ICON_MAPPINGS;