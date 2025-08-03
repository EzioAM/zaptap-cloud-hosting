// Sample automations for new users
export const sampleAutomations = [
  {
    title: 'Good Morning Routine',
    description: 'Start your day right with automated notifications and reminders',
    category: 'morning-routine',
    is_public: true,
    is_template: true,
    icon: 'weather-sunny',
    color: '#FFA726',
    tags: ['morning', 'routine', 'daily'],
    steps: [
      {
        type: 'notification',
        config: {
          title: 'Good Morning! ☀️',
          message: 'Time to start your day!',
          sound: true,
          vibrate: true
        },
        order_index: 0
      },
      {
        type: 'delay',
        config: {
          seconds: 3
        },
        order_index: 1
      },
      {
        type: 'text',
        config: {
          action: 'speak',
          text: 'Good morning! Here is your daily motivation: You can do anything you set your mind to!'
        },
        order_index: 2
      }
    ]
  },
  {
    title: 'Emergency Alert',
    description: 'Quick emergency notification to your contacts',
    category: 'emergency',
    is_public: true,
    is_template: true,
    icon: 'alert-circle',
    color: '#F44336',
    tags: ['emergency', 'alert', 'safety'],
    steps: [
      {
        type: 'location',
        config: {
          action: 'get'
        },
        order_index: 0
      },
      {
        type: 'sms',
        config: {
          phoneNumber: '',
          message: 'EMERGENCY: I need help! My location is: {{location}}'
        },
        order_index: 1
      },
      {
        type: 'notification',
        config: {
          title: '🚨 Emergency Alert Sent',
          message: 'Your emergency contact has been notified',
          sound: true,
          vibrate: true
        },
        order_index: 2
      }
    ]
  },
  {
    title: 'Meeting Reminder',
    description: 'Get reminded 15 minutes before your meetings',
    category: 'productivity',
    is_public: true,
    is_template: true,
    icon: 'calendar-clock',
    color: '#2196F3',
    tags: ['productivity', 'reminder', 'work'],
    steps: [
      {
        type: 'notification',
        config: {
          title: '📅 Meeting in 15 minutes',
          message: 'Your meeting is coming up soon',
          sound: true
        },
        order_index: 0
      },
      {
        type: 'delay',
        config: {
          seconds: 300 // 5 minutes
        },
        order_index: 1
      },
      {
        type: 'notification',
        config: {
          title: '⏰ Meeting in 10 minutes',
          message: 'Time to wrap up and prepare',
          sound: true,
          vibrate: true
        },
        order_index: 2
      }
    ]
  },
  {
    title: 'Water Reminder',
    description: 'Stay hydrated with hourly water reminders',
    category: 'health',
    is_public: true,
    is_template: true,
    icon: 'water',
    color: '#00BCD4',
    tags: ['health', 'hydration', 'wellness'],
    steps: [
      {
        type: 'notification',
        config: {
          title: '💧 Time to Hydrate',
          message: 'Drink a glass of water to stay healthy!',
          sound: false,
          vibrate: true
        },
        order_index: 0
      }
    ]
  },
  {
    title: 'Quick Math Calculator',
    description: 'Perform quick calculations with variables',
    category: 'utility',
    is_public: true,
    is_template: true,
    icon: 'calculator',
    color: '#9C27B0',
    tags: ['utility', 'calculator', 'math'],
    steps: [
      {
        type: 'variable',
        config: {
          name: 'number1',
          value: '10',
          operation: 'set'
        },
        order_index: 0
      },
      {
        type: 'variable',
        config: {
          name: 'number2',
          value: '5',
          operation: 'set'
        },
        order_index: 1
      },
      {
        type: 'math',
        config: {
          expression: '{{number1}} + {{number2}}',
          resultVariable: 'result'
        },
        order_index: 2
      },
      {
        type: 'notification',
        config: {
          title: '🧮 Calculation Result',
          message: 'The result is: {{result}}',
          sound: false
        },
        order_index: 3
      }
    ]
  },
  {
    title: 'Welcome Message',
    description: 'A friendly welcome for new app users',
    category: 'social',
    is_public: true,
    is_template: true,
    icon: 'hand-wave',
    color: '#4CAF50',
    tags: ['welcome', 'greeting', 'social'],
    steps: [
      {
        type: 'notification',
        config: {
          title: '👋 Welcome to Zaptap!',
          message: 'Tap to explore amazing automations',
          sound: true
        },
        order_index: 0
      },
      {
        type: 'delay',
        config: {
          seconds: 2
        },
        order_index: 1
      },
      {
        type: 'text',
        config: {
          action: 'speak',
          text: 'Welcome to Zaptap! Let us help you automate your world.'
        },
        order_index: 2
      }
    ]
  }
];

// Function to get sample automations for database insertion
export function getSampleAutomationsForUser(userId: string) {
  return sampleAutomations.map(automation => ({
    ...automation,
    user_id: userId,
    steps: JSON.stringify(automation.steps),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));
}