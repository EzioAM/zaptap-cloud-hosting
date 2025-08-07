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

// Import all executors
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

// Create executor map with all step types
export const executorMap = new Map([
  ['notification', new NotificationExecutor()],
  ['sms', new SMSExecutor()],
  ['email', new EmailExecutor()],
  ['webhook', new WebhookExecutor()],
  ['delay', new DelayExecutor()],
  ['variable', new VariableExecutor()],
  ['get_variable', new GetVariableExecutor()],
  ['prompt_input', new PromptInputExecutor()],
  ['location', new LocationExecutor()],
  ['condition', new ConditionExecutor()],
  ['text', new TextExecutor()],
  ['math', new MathExecutor()],
  ['photo', new PhotoExecutor()],
  ['clipboard', new ClipboardExecutor()],
  ['app', new AppExecutor()],
  ['loop', new LoopExecutor()],
  ['open_url', new OpenUrlExecutor()],
  ['share_text', new ShareTextExecutor()],
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