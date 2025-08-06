// Platform-aware components
export { PlatformButton } from './PlatformButton';
export type { PlatformButtonProps, PlatformButtonVariant, PlatformButtonSize } from './PlatformButton';

export {
  PlatformCard,
  ElevatedCard,
  OutlinedCard,
  FilledCard,
  GhostCard,
} from './PlatformCard';
export type {
  PlatformCardProps,
  PlatformCardVariant,
  PlatformCardElevation,
} from './PlatformCard';

export { PlatformInput } from './PlatformInput';
export type {
  PlatformInputProps,
  PlatformInputVariant,
  PlatformInputSize,
} from './PlatformInput';

export {
  PlatformModal,
  BottomSheetModal,
  CardModal,
  PopupModal,
  FullscreenModal,
} from './PlatformModal';
export type {
  PlatformModalProps,
  PlatformModalPresentationStyle,
  PlatformModalAnimationType,
} from './PlatformModal';

export {
  usePlatformNavigationOptions,
  usePlatformScreenOptions,
  PlatformTransitions,
  PlatformHeaderTransitions,
  PlatformGestureConfig,
  createPlatformStackNavigator,
  PlatformStack,
} from './PlatformNavigator';
export type {
  PlatformNavigatorConfig,
  PlatformScreenOptions,
  PlatformNavigationTransition,
} from './PlatformNavigator';