export { BaseExecutor } from './BaseExecutor';
export { NotificationExecutor } from './NotificationExecutor';
export { SMSExecutor } from './SMSExecutor';
export { EmailExecutor } from './EmailExecutor';
export { WebhookExecutor } from './WebhookExecutor';
export { DelayExecutor } from './DelayExecutor';

// Import all executors
import { NotificationExecutor } from './NotificationExecutor';
import { SMSExecutor } from './SMSExecutor';
import { EmailExecutor } from './EmailExecutor';
import { WebhookExecutor } from './WebhookExecutor';
import { DelayExecutor } from './DelayExecutor';

// Create executor map
export const executorMap = new Map([
  ['notification', new NotificationExecutor()],
  ['sms', new SMSExecutor()],
  ['email', new EmailExecutor()],
  ['webhook', new WebhookExecutor()],
  ['delay', new DelayExecutor()],
]);