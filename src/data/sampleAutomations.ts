/**
 * Sample Automations Data for Onboarding
 * These are pre-built automation templates that new users can explore during onboarding
 */

export interface SampleAutomationStep {
  id: string;
  type: string;
  title: string;
  icon: string;
  color: string;
  config: any;
  description: string;
}

export interface SampleAutomation {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  gradient: string[];
  category: 'productivity' | 'lifestyle' | 'communication' | 'device' | 'fun';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string; // e.g., "< 1 min", "2-3 mins"
  useCase: string;
  steps: SampleAutomationStep[];
  shareUrl?: string;
  tags: string[];
  isPopular?: boolean;
  isFeatured?: boolean;
}

export const sampleAutomations: SampleAutomation[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    name: 'Perfect Morning',
    description: 'Start your day with automated morning routine',
    icon: 'weather-sunny',
    color: '#FF9800',
    gradient: ['#FF9800', '#FFC107'],
    category: 'lifestyle',
    difficulty: 'beginner',
    estimatedTime: '< 1 min',
    useCase: 'Wake up refreshed with automated device settings and weather updates',
    tags: ['morning', 'routine', 'productivity', 'wellness'],
    isPopular: true,
    isFeatured: true,
    steps: [
      {
        id: '1',
        type: 'notification',
        title: 'Good Morning!',
        icon: 'weather-sunny',
        color: '#FF9800',
        description: 'Show energizing morning greeting',
        config: {
          title: 'Good Morning! ☀️',
          message: 'Ready to make today amazing?',
          sound: 'default',
        },
      },
      {
        id: '2',
        type: 'wifi',
        title: 'Enable WiFi',
        icon: 'wifi',
        color: '#2196F3',
        description: 'Turn on WiFi for connectivity',
        config: {
          enabled: true,
        },
      },
      {
        id: '3',
        type: 'brightness',
        title: 'Set Brightness',
        icon: 'brightness-6',
        color: '#FFC107',
        description: 'Comfortable morning brightness',
        config: {
          level: 75,
        },
      },
      {
        id: '4',
        type: 'http',
        title: 'Get Weather',
        icon: 'weather-partly-cloudy',
        color: '#00BCD4',
        description: 'Fetch current weather information',
        config: {
          method: 'GET',
          url: 'https://api.openweathermap.org/data/2.5/weather',
          showResponse: true,
        },
      },
    ],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    name: 'Meeting Mode',
    description: 'Instantly prepare your device for important meetings',
    icon: 'account-group',
    color: '#3F51B5',
    gradient: ['#3F51B5', '#5C6BC0'],
    category: 'productivity',
    difficulty: 'beginner',
    estimatedTime: '< 30 sec',
    useCase: 'Quickly silence device and send auto-reply messages',
    tags: ['meeting', 'work', 'professional', 'silence'],
    isPopular: true,
    steps: [
      {
        id: '1',
        type: 'volume',
        title: 'Silent Mode',
        icon: 'volume-off',
        color: '#9E9E9E',
        description: 'Set device to silent mode',
        config: {
          level: 0,
          vibrate: true,
        },
      },
      {
        id: '2',
        type: 'notification',
        title: 'Meeting Alert',
        icon: 'account-group',
        color: '#3F51B5',
        description: 'Show meeting mode confirmation',
        config: {
          title: 'Meeting Mode Active',
          message: 'Device is now silent. Focus on your meeting! 🤝',
          silent: true,
        },
      },
      {
        id: '3',
        type: 'sms',
        title: 'Auto Reply SMS',
        icon: 'message-reply-text',
        color: '#4CAF50',
        description: 'Send auto-reply to last message',
        config: {
          message: 'Currently in a meeting. Will get back to you shortly! 📞',
          autoReply: true,
        },
      },
    ],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440006',
    name: 'Sleep Well',
    description: 'Wind down with a relaxing bedtime routine',
    icon: 'weather-night',
    color: '#673AB7',
    gradient: ['#673AB7', '#9C27B0'],
    category: 'lifestyle',
    difficulty: 'beginner',
    estimatedTime: '1 min',
    useCase: 'Prepare your device and environment for restful sleep',
    tags: ['sleep', 'bedtime', 'wellness', 'night'],
    isPopular: true,
    steps: [
      {
        id: '1',
        type: 'brightness',
        title: 'Dim Screen',
        icon: 'brightness-4',
        color: '#FF9800',
        description: 'Reduce screen brightness for comfort',
        config: {
          level: 20,
        },
      },
      {
        id: '2',
        type: 'wifi',
        title: 'Disable WiFi',
        icon: 'wifi-off',
        color: '#9E9E9E',
        description: 'Turn off WiFi to reduce distractions',
        config: {
          enabled: false,
        },
      },
      {
        id: '3',
        type: 'volume',
        title: 'Low Volume',
        icon: 'volume-low',
        color: '#607D8B',
        description: 'Set comfortable volume for sleep',
        config: {
          level: 30,
        },
      },
      {
        id: '4',
        type: 'notification',
        title: 'Sleep Time',
        icon: 'weather-night',
        color: '#673AB7',
        description: 'Sweet dreams notification',
        config: {
          title: 'Sweet Dreams! 🌙',
          message: 'Your device is ready for rest. Sleep well!',
          sound: 'soft',
        },
      },
    ],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440007',
    name: 'Workout Ready',
    description: 'Get pumped up for your fitness session',
    icon: 'dumbbell',
    color: '#F44336',
    gradient: ['#F44336', '#FF5722'],
    category: 'lifestyle',
    difficulty: 'intermediate',
    estimatedTime: '45 sec',
    useCase: 'Optimize your device settings for workout sessions',
    tags: ['fitness', 'workout', 'motivation', 'health'],
    steps: [
      {
        id: '1',
        type: 'volume',
        title: 'Max Volume',
        icon: 'volume-high',
        color: '#F44336',
        description: 'Pump up the volume for motivation',
        config: {
          level: 85,
        },
      },
      {
        id: '2',
        type: 'brightness',
        title: 'Bright Screen',
        icon: 'brightness-7',
        color: '#FFC107',
        description: 'Increase brightness for outdoor visibility',
        config: {
          level: 90,
        },
      },
      {
        id: '3',
        type: 'open-app',
        title: 'Open Music App',
        icon: 'music',
        color: '#E91E63',
        description: 'Launch your favorite music app',
        config: {
          appName: 'Music',
          playlist: 'Workout Mix',
        },
      },
      {
        id: '4',
        type: 'notification',
        title: 'Let\'s Go!',
        icon: 'dumbbell',
        color: '#F44336',
        description: 'Motivational workout message',
        config: {
          title: 'Workout Time! 💪',
          message: 'You\'ve got this! Time to crush your goals!',
          sound: 'energetic',
        },
      },
    ],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440008',
    name: 'Smart Commute',
    description: 'Optimize your daily commute experience',
    icon: 'car',
    color: '#009688',
    gradient: ['#009688', '#4DB6AC'],
    category: 'productivity',
    difficulty: 'intermediate',
    estimatedTime: '1-2 mins',
    useCase: 'Get traffic updates, play music, and send arrival ETAs',
    tags: ['commute', 'travel', 'navigation', 'productivity'],
    steps: [
      {
        id: '1',
        type: 'location',
        title: 'Get Location',
        icon: 'map-marker',
        color: '#F44336',
        description: 'Get current location for navigation',
        config: {
          accuracy: 'high',
        },
      },
      {
        id: '2',
        type: 'http',
        title: 'Traffic Update',
        icon: 'traffic-light',
        color: '#FF9800',
        description: 'Check current traffic conditions',
        config: {
          method: 'GET',
          url: 'https://api.traffic.com/conditions',
          showResponse: true,
        },
      },
      {
        id: '3',
        type: 'sms',
        title: 'Send ETA',
        icon: 'message-text',
        color: '#4CAF50',
        description: 'Send arrival time to family',
        config: {
          message: 'On my way! Should arrive in about 25 minutes 🚗',
          contact: 'Family',
        },
      },
      {
        id: '4',
        type: 'open-app',
        title: 'Navigation App',
        icon: 'navigation',
        color: '#2196F3',
        description: 'Open maps for navigation',
        config: {
          appName: 'Maps',
          destination: 'Work',
        },
      },
    ],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440009',
    name: 'Deep Focus',
    description: 'Eliminate distractions for productive work sessions',
    icon: 'target',
    color: '#795548',
    gradient: ['#795548', '#8D6E63'],
    category: 'productivity',
    difficulty: 'advanced',
    estimatedTime: '30 sec',
    useCase: 'Block notifications and create optimal environment for focus',
    tags: ['focus', 'productivity', 'work', 'concentration'],
    steps: [
      {
        id: '1',
        type: 'volume',
        title: 'Mute Notifications',
        icon: 'bell-off',
        color: '#9E9E9E',
        description: 'Silence all notification sounds',
        config: {
          level: 0,
          notifications: false,
        },
      },
      {
        id: '2',
        type: 'condition',
        title: 'If Work Hours',
        icon: 'clock',
        color: '#FF9800',
        description: 'Only during work hours',
        config: {
          condition: 'time_between',
          startTime: '09:00',
          endTime: '17:00',
        },
      },
      {
        id: '3',
        type: 'notification',
        title: 'Focus Mode On',
        icon: 'target',
        color: '#795548',
        description: 'Confirm focus mode activation',
        config: {
          title: 'Focus Mode Active 🎯',
          message: 'Deep work time! All distractions blocked.',
          silent: true,
        },
      },
    ],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440010',
    name: 'Date Night',
    description: 'Set the perfect mood for a romantic evening',
    icon: 'heart',
    color: '#E91E63',
    gradient: ['#E91E63', '#F06292'],
    category: 'lifestyle',
    difficulty: 'beginner',
    estimatedTime: '45 sec',
    useCase: 'Prepare device settings for a romantic date',
    tags: ['date', 'romance', 'evening', 'mood'],
    isFeatured: true,
    steps: [
      {
        id: '1',
        type: 'brightness',
        title: 'Mood Lighting',
        icon: 'brightness-5',
        color: '#FF9800',
        description: 'Set romantic dim lighting',
        config: {
          level: 40,
        },
      },
      {
        id: '2',
        type: 'volume',
        title: 'Soft Volume',
        icon: 'volume-medium',
        color: '#9C27B0',
        description: 'Perfect volume for conversation',
        config: {
          level: 50,
        },
      },
      {
        id: '3',
        type: 'sms',
        title: 'Sweet Message',
        icon: 'heart',
        color: '#E91E63',
        description: 'Send romantic message to partner',
        config: {
          message: 'Looking forward to our special evening together! ❤️',
          contact: 'Partner',
        },
      },
    ],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440011',
    name: 'Study Mode',
    description: 'Create the perfect learning environment',
    icon: 'book-open-variant',
    color: '#3F51B5',
    gradient: ['#3F51B5', '#7986CB'],
    category: 'productivity',
    difficulty: 'intermediate',
    estimatedTime: '1 min',
    useCase: 'Optimize device and environment for effective studying',
    tags: ['study', 'learning', 'education', 'focus'],
    steps: [
      {
        id: '1',
        type: 'volume',
        title: 'Study Volume',
        icon: 'volume-low',
        color: '#607D8B',
        description: 'Set optimal volume for concentration',
        config: {
          level: 25,
        },
      },
      {
        id: '2',
        type: 'brightness',
        title: 'Reading Brightness',
        icon: 'brightness-6',
        color: '#FFC107',
        description: 'Comfortable brightness for reading',
        config: {
          level: 70,
        },
      },
      {
        id: '3',
        type: 'wait',
        title: 'Study Timer',
        icon: 'timer',
        color: '#795548',
        description: 'Pomodoro-style study session',
        config: {
          duration: 25,
          unit: 'minutes',
        },
      },
      {
        id: '4',
        type: 'notification',
        title: 'Break Time',
        icon: 'coffee',
        color: '#8BC34A',
        description: 'Remind to take study break',
        config: {
          title: 'Study Break! ☕',
          message: 'Great job! Time for a 5-minute break.',
          delay: 1500,
        },
      },
    ],
  },
];

/**
 * Get featured sample automations for onboarding
 */
export const getFeaturedAutomations = (): SampleAutomation[] => {
  return sampleAutomations.filter(automation => automation.isFeatured);
};

/**
 * Get popular sample automations
 */
export const getPopularAutomations = (): SampleAutomation[] => {
  return sampleAutomations.filter(automation => automation.isPopular);
};

/**
 * Get automations by category
 */
export const getAutomationsByCategory = (category: SampleAutomation['category']): SampleAutomation[] => {
  return sampleAutomations.filter(automation => automation.category === category);
};

/**
 * Get beginner-friendly automations for new users
 */
export const getBeginnerAutomations = (): SampleAutomation[] => {
  return sampleAutomations.filter(automation => automation.difficulty === 'beginner');
};

/**
 * Get automation by ID
 */
export const getAutomationById = (id: string): SampleAutomation | undefined => {
  return sampleAutomations.find(automation => automation.id === id);
};

/**
 * Generate share URL for automation
 */
export const generateShareUrl = (automationId: string): string => {
  return `https://www.zaptap.cloud/share/${automationId}`;
};

/**
 * Sample automation categories with metadata
 */
export const automationCategories = [
  {
    id: 'productivity',
    name: 'Productivity',
    description: 'Boost your efficiency with smart workflows',
    icon: 'briefcase',
    color: '#2196F3',
    count: sampleAutomations.filter(a => a.category === 'productivity').length,
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle',
    description: 'Enhance your daily routines and habits',
    icon: 'home',
    color: '#4CAF50',
    count: sampleAutomations.filter(a => a.category === 'lifestyle').length,
  },
  {
    id: 'communication',
    name: 'Communication',
    description: 'Stay connected with smart messaging',
    icon: 'message',
    color: '#FF9800',
    count: sampleAutomations.filter(a => a.category === 'communication').length,
  },
  {
    id: 'device',
    name: 'Device Control',
    description: 'Automate your device settings',
    icon: 'cellphone',
    color: '#9C27B0',
    count: sampleAutomations.filter(a => a.category === 'device').length,
  },
  {
    id: 'fun',
    name: 'Fun & Creative',
    description: 'Playful automations for entertainment',
    icon: 'palette',
    color: '#E91E63',
    count: sampleAutomations.filter(a => a.category === 'fun').length,
  },
];

export default sampleAutomations;