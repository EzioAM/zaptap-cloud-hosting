export const ANIMATION_CONFIG = {
  // Execution timing
  STEP_EXECUTION_DELAY: 1000,
  STEP_EXECUTION_DURATION_PER_STEP: 1000,
  
  // Entry animations
  ENTRY_ANIMATION_DURATION: 600,
  ENTRY_ANIMATION_DELAY: 300,
  STAGGERED_ENTRY_DELAY: 100,
  
  // Spring physics (optimized for 60fps)
  SPRING_TENSION: 300,
  SPRING_FRICTION: 10,
  GENTLE_SPRING_TENSION: 20,
  GENTLE_SPRING_FRICTION: 7,
  
  // Micro-interactions
  MICRO_INTERACTION_DURATION: 150,
  MICRO_INTERACTION_SCALE: 0.95,
  BUTTON_PRESS_DURATION: 100,
  
  // Scroll and UI
  HAPTIC_DELAY: 10,
  SCROLL_THROTTLE: 16,
  FOCUS_ANIMATION_DURATION: 200,
  
  // Visual effects
  GLASSMORPHISM_INTENSITY: 80,
  MODAL_ANIMATION_DURATION: 300,
  FADE_ANIMATION_DURATION: 250,
  
  // Easing curves (for web compatibility)
  EASING: {
    ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
} as const;