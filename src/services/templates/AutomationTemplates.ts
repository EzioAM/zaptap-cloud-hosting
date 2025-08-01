import { AutomationData, AutomationStep } from '../../types';
import uuid from 'react-native-uuid';

export interface AutomationTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  icon: string;
  color: string;
  isPopular: boolean;
  steps: AutomationStep[];
}

export class AutomationTemplateService {
  private static templates: AutomationTemplate[] = [
    {
      id: 'morning-routine',
      title: 'Morning Routine',
      description: 'Start your day with a comprehensive morning routine automation',
      category: 'productivity',
      tags: ['morning', 'routine', 'productivity', 'daily'],
      difficulty: 'beginner',
      estimatedTime: '2 minutes',
      icon: 'weather-sunny',
      color: '#FF9800',
      isPopular: true,
      steps: [
        {
          id: 'morning-1',
          type: 'notification',
          title: 'Good Morning Message',
          enabled: true,
          config: {
            message: 'Good morning! Starting your daily routine 🌅'
          }
        },
        {
          id: 'morning-2',
          type: 'prompt_input',
          title: 'Daily Goal',
          enabled: true,
          config: {
            title: 'Daily Goal',
            message: 'What is your main goal for today?',
            variableName: 'dailyGoal',
            defaultValue: 'Be productive and stay positive'
          }
        },
        {
          id: 'morning-3',
          type: 'location',
          title: 'Check Weather Location',
          enabled: true,
          config: {
            action: 'get_current',
            showResult: false
          }
        },
        {
          id: 'morning-4',
          type: 'sms',
          title: 'Text Family',
          enabled: true,
          config: {
            phoneNumber: '',
            message: 'Good morning! My goal for today: {{dailyGoal}} ☀️'
          }
        },
        {
          id: 'morning-5',
          type: 'notification',
          title: 'Motivation',
          enabled: true,
          config: {
            message: 'Remember: {{dailyGoal}}. You got this! 💪'
          }
        }
      ]
    },
    {
      id: 'emergency-contacts',
      title: 'Emergency Alert',
      description: 'Quickly notify emergency contacts with your location',
      category: 'emergency',
      tags: ['emergency', 'safety', 'location', 'contacts'],
      difficulty: 'beginner',
      estimatedTime: '30 seconds',
      icon: 'alert',
      color: '#F44336',
      isPopular: true,
      steps: [
        {
          id: 'emergency-1',
          type: 'prompt_input',
          title: 'Emergency Type',
          enabled: true,
          config: {
            title: 'Emergency Alert',
            message: 'What type of emergency? (optional)',
            variableName: 'emergencyType',
            defaultValue: 'Emergency assistance needed'
          }
        },
        {
          id: 'emergency-2',
          type: 'location',
          title: 'Get Current Location',
          enabled: true,
          config: {
            action: 'get_current',
            showResult: false
          }
        },
        {
          id: 'emergency-3',
          type: 'location',
          title: 'Share Location via SMS',
          enabled: true,
          config: {
            action: 'share_location',
            phoneNumber: '',
            message: 'EMERGENCY: {{emergencyType}}. My location:'
          }
        },
        {
          id: 'emergency-4',
          type: 'notification',
          title: 'Confirmation',
          enabled: true,
          config: {
            message: 'Emergency alert sent! 🚨'
          }
        }
      ]
    },
    {
      id: 'meeting-setup',
      title: 'Meeting Preparation',
      description: 'Prepare for meetings with location sharing and notifications',
      category: 'productivity',
      tags: ['meeting', 'work', 'location', 'productivity'],
      difficulty: 'intermediate',
      estimatedTime: '1 minute',
      icon: 'calendar-clock',
      color: '#2196F3',
      isPopular: false,
      steps: [
        {
          id: 'meeting-1',
          type: 'prompt_input',
          title: 'Meeting Details',
          enabled: true,
          config: {
            title: 'Meeting Info',
            message: 'What meeting are you attending?',
            variableName: 'meetingName',
            defaultValue: 'Team Meeting'
          }
        },
        {
          id: 'meeting-2',
          type: 'prompt_input',
          title: 'Contact Person',
          enabled: true,
          config: {
            title: 'Contact Number',
            message: 'Phone number to notify (optional):',
            variableName: 'contactNumber',
            defaultValue: ''
          }
        },
        {
          id: 'meeting-3',
          type: 'location',
          title: 'Share Meeting Location',
          enabled: true,
          config: {
            action: 'share_location',
            phoneNumber: '{{contactNumber}}',
            message: 'On my way to {{meetingName}}. Current location:'
          }
        },
        {
          id: 'meeting-4',
          type: 'clipboard',
          title: 'Copy Meeting Info',
          enabled: true,
          config: {
            action: 'copy',
            text: 'Meeting: {{meetingName}} - Location shared'
          }
        }
      ]
    },
    {
      id: 'lost-pet',
      title: 'Lost Pet Alert',
      description: 'NFC tag automation for lost pets with owner contact info',
      category: 'emergency',
      tags: ['pet', 'lost', 'nfc', 'emergency', 'contact'],
      difficulty: 'beginner',
      estimatedTime: '45 seconds',
      icon: 'dog',
      color: '#8BC34A',
      isPopular: true,
      steps: [
        {
          id: 'pet-1',
          type: 'notification',
          title: 'Found Pet Notice',
          enabled: true,
          config: {
            message: '🐕 You found a lost pet! Contacting owner...'
          }
        },
        {
          id: 'pet-2',
          type: 'variable',
          title: 'Pet Owner Info',
          enabled: true,
          config: {
            name: 'ownerInfo',
            value: 'Pet Owner: [Your Name]\nPhone: [Your Phone]\nPet Name: [Pet Name]\nSpecial Notes: [Medical info, etc.]'
          }
        },
        {
          id: 'pet-3',
          type: 'sms',
          title: 'Text Owner',
          enabled: true,
          config: {
            phoneNumber: '',
            message: '🐕 GOOD NEWS! Someone found your pet and scanned their tag. Current location will be shared shortly. Please respond with pickup instructions.'
          }
        },
        {
          id: 'pet-4',
          type: 'location',
          title: 'Share Location',
          enabled: true,
          config: {
            action: 'share_location',
            phoneNumber: '',
            message: 'Your pet was found here:'
          }
        },
        {
          id: 'pet-5',
          type: 'notification',
          title: 'Success Message',
          enabled: true,
          config: {
            message: 'Owner has been notified! Thank you for helping! 🐾'
          }
        }
      ]
    },
    {
      id: 'travel-checkin',
      title: 'Travel Check-in',
      description: 'Automatic check-in and location sharing when traveling',
      category: 'travel',
      tags: ['travel', 'checkin', 'location', 'safety'],
      difficulty: 'intermediate',
      estimatedTime: '1 minute',
      icon: 'airplane',
      color: '#E91E63',
      isPopular: false,
      steps: [
        {
          id: 'travel-1',
          type: 'prompt_input',
          title: 'Destination',
          enabled: true,
          config: {
            title: 'Travel Destination',
            message: 'Where are you traveling to?',
            variableName: 'destination',
            defaultValue: 'Unknown Location'
          }
        },
        {
          id: 'travel-2',
          type: 'location',
          title: 'Current Location',
          enabled: true,
          config: {
            action: 'get_current',
            showResult: false
          }
        },
        {
          id: 'travel-3',
          type: 'sms',
          title: 'Check-in Message',
          enabled: true,
          config: {
            phoneNumber: '',
            message: '✈️ Travel Update: Arrived safely at {{destination}}!'
          }
        },
        {
          id: 'travel-4',
          type: 'location',
          title: 'Share Location',
          enabled: true,
          config: {
            action: 'share_location',
            phoneNumber: '',
            message: 'My current location at {{destination}}:'
          }
        }
      ]
    },
    {
      id: 'workout-tracker',
      title: 'Workout Session',
      description: 'Track workout sessions with time and location logging',
      category: 'health-fitness',
      tags: ['workout', 'fitness', 'health', 'tracking'],
      difficulty: 'beginner',
      estimatedTime: '30 seconds',
      icon: 'dumbbell',
      color: '#FF5722',
      isPopular: false,
      steps: [
        {
          id: 'workout-1',
          type: 'prompt_input',
          title: 'Workout Type',
          enabled: true,
          config: {
            title: 'Workout Session',
            message: 'What type of workout?',
            variableName: 'workoutType',
            defaultValue: 'General Workout'
          }
        },
        {
          id: 'workout-2',
          type: 'variable',
          title: 'Start Time',
          enabled: true,
          config: {
            name: 'startTime',
            value: 'Started workout session'
          }
        },
        {
          id: 'workout-3',
          type: 'location',
          title: 'Workout Location',
          enabled: true,
          config: {
            action: 'get_current',
            showResult: false
          }
        },
        {
          id: 'workout-4',
          type: 'notification',
          title: 'Start Notification',
          enabled: true,
          config: {
            message: '💪 {{workoutType}} session started! Stay hydrated!'
          }
        },
        {
          id: 'workout-5',
          type: 'delay',
          title: 'Workout Duration',
          enabled: true,
          config: {
            delay: 30000
          }
        },
        {
          id: 'workout-6',
          type: 'notification',
          title: 'Completion',
          enabled: true,
          config: {
            message: '🎉 Great job! {{workoutType}} session completed!'
          }
        }
      ]
    },
    {
      id: 'smart-home-away',
      title: 'Leaving Home',
      description: 'Automation for when leaving home - security and energy saving',
      category: 'smart-home',
      tags: ['home', 'security', 'energy', 'away'],
      difficulty: 'advanced',
      estimatedTime: '1 minute',
      icon: 'home-export-outline',
      color: '#607D8B',
      isPopular: false,
      steps: [
        {
          id: 'home-1',
          type: 'notification',
          title: 'Leaving Home',
          enabled: true,
          config: {
            message: '🏠 Leaving home sequence initiated...'
          }
        },
        {
          id: 'home-2',
          type: 'location',
          title: 'Record Home Location',
          enabled: true,
          config: {
            action: 'get_current',
            showResult: false
          }
        },
        {
          id: 'home-3',
          type: 'webhook',
          title: 'Smart Home API',
          enabled: true,
          config: {
            url: 'https://your-smart-home-api.com/away',
            method: 'POST'
          }
        },
        {
          id: 'home-4',
          type: 'sms',
          title: 'Family Notification',
          enabled: true,
          config: {
            phoneNumber: '',
            message: '🏠 Left home safely. Security system is now active.'
          }
        },
        {
          id: 'home-5',
          type: 'notification',
          title: 'Confirmation',
          enabled: true,
          config: {
            message: '✅ Home secured! Have a great day!'
          }
        }
      ]
    },
    {
      id: 'evening-routine',
      title: 'Evening Wind Down',
      description: 'Relax and prepare for a good night\'s sleep',
      category: 'productivity',
      tags: ['evening', 'sleep', 'routine', 'relaxation'],
      difficulty: 'beginner',
      estimatedTime: '1 minute',
      icon: 'weather-night',
      color: '#3F51B5',
      isPopular: true,
      steps: [
        {
          id: 'evening-1',
          type: 'notification',
          title: 'Good Evening',
          enabled: true,
          config: {
            message: 'Time to wind down for the night 🌙'
          }
        },
        {
          id: 'evening-2',
          type: 'prompt_input',
          title: 'Rate Your Day',
          enabled: true,
          config: {
            title: 'Daily Reflection',
            message: 'How was your day? (1-10)',
            variableName: 'dayRating',
            defaultValue: '8'
          }
        },
        {
          id: 'evening-3',
          type: 'variable',
          title: 'Set Sleep Goal',
          enabled: true,
          config: {
            name: 'sleepGoal',
            value: 'Get 8 hours of quality sleep'
          }
        },
        {
          id: 'evening-4',
          type: 'sms',
          title: 'Good Night Message',
          enabled: true,
          config: {
            phoneNumber: '',
            message: 'Good night! Today was a {{dayRating}}/10. Sleep goal: {{sleepGoal}} 😴'
          }
        },
        {
          id: 'evening-5',
          type: 'notification',
          title: 'Sleep Reminder',
          enabled: true,
          config: {
            message: 'Remember: {{sleepGoal}}. Sweet dreams! 🌟'
          }
        }
      ]
    },
    {
      id: 'parking-tracker',
      title: 'Remember My Parking',
      description: 'Never forget where you parked your car again',
      category: 'tools',
      tags: ['parking', 'location', 'car', 'memory'],
      difficulty: 'beginner',
      estimatedTime: '30 seconds',
      icon: 'car',
      color: '#795548',
      isPopular: true,
      steps: [
        {
          id: 'parking-1',
          type: 'notification',
          title: 'Parking Tracker',
          enabled: true,
          config: {
            message: '🚗 Recording your parking location...'
          }
        },
        {
          id: 'parking-2',
          type: 'location',
          title: 'Get Parking Location',
          enabled: true,
          config: {
            action: 'get_current',
            showResult: false
          }
        },
        {
          id: 'parking-3',
          type: 'prompt_input',
          title: 'Parking Notes',
          enabled: true,
          config: {
            title: 'Parking Details',
            message: 'Any notes about parking? (floor, section, etc.)',
            variableName: 'parkingNotes',
            defaultValue: 'Level 2, Section B'
          }
        },
        {
          id: 'parking-4',
          type: 'sms',
          title: 'Text Parking Info',
          enabled: true,
          config: {
            phoneNumber: '',
            message: '🚗 Car parked! Notes: {{parkingNotes}}. Location will be shared in next message.'
          }
        },
        {
          id: 'parking-5',
          type: 'location',
          title: 'Share Parking Location',
          enabled: true,
          config: {
            action: 'share_location',
            phoneNumber: '',
            message: 'My car is parked here:'
          }
        }
      ]
    },
    {
      id: 'grocery-list',
      title: 'Quick Grocery List',
      description: 'Create and share a grocery list with voice notes',
      category: 'productivity',
      tags: ['grocery', 'shopping', 'list', 'family'],
      difficulty: 'intermediate',
      estimatedTime: '2 minutes',
      icon: 'cart',
      color: '#4CAF50',
      isPopular: false,
      steps: [
        {
          id: 'grocery-1',
          type: 'notification',
          title: 'Grocery List Started',
          enabled: true,
          config: {
            message: '🛒 Creating your grocery list...'
          }
        },
        {
          id: 'grocery-2',
          type: 'prompt_input',
          title: 'Main Items',
          enabled: true,
          config: {
            title: 'Grocery Items',
            message: 'What do you need to buy?',
            variableName: 'groceryItems',
            defaultValue: 'Milk, Bread, Eggs, Fruits'
          }
        },
        {
          id: 'grocery-3',
          type: 'prompt_input',
          title: 'Store Location',
          enabled: true,
          config: {
            title: 'Store Info',
            message: 'Which store are you going to?',
            variableName: 'storeName',
            defaultValue: 'Local Supermarket'
          }
        },
        {
          id: 'grocery-4',
          type: 'variable',
          title: 'Create List',
          enabled: true,
          config: {
            name: 'completeList',
            value: 'Grocery List for {{storeName}}:\\n• {{groceryItems}}\\n\\nCreated on [current date]'
          }
        },
        {
          id: 'grocery-5',
          type: 'clipboard',
          title: 'Copy to Clipboard',
          enabled: true,
          config: {
            action: 'copy',
            text: '{{completeList}}'
          }
        },
        {
          id: 'grocery-6',
          type: 'sms',
          title: 'Share with Family',
          enabled: true,
          config: {
            phoneNumber: '',
            message: '{{completeList}}'
          }
        }
      ]
    },
    {
      id: 'water-reminder',
      title: 'Stay Hydrated',
      description: 'Remind yourself to drink water throughout the day',
      category: 'health-fitness',
      tags: ['water', 'health', 'reminder', 'hydration'],
      difficulty: 'beginner',
      estimatedTime: '15 seconds',
      icon: 'water',
      color: '#00BCD4',
      isPopular: false,
      steps: [
        {
          id: 'water-1',
          type: 'notification',
          title: 'Hydration Check',
          enabled: true,
          config: {
            message: '💧 Time to drink some water! Stay hydrated!'
          }
        },
        {
          id: 'water-2',
          type: 'prompt_input',
          title: 'Glasses Count',
          enabled: true,
          config: {
            title: 'Water Intake',
            message: 'How many glasses have you had today?',
            variableName: 'glassesCount',
            defaultValue: '3'
          }
        },
        {
          id: 'water-3',
          type: 'math',
          title: 'Calculate Remaining',
          enabled: true,
          config: {
            operation: 'subtract',
            number1: 8,
            number2: '{{glassesCount}}'
          }
        },
        {
          id: 'water-4',
          type: 'condition',
          title: 'Check Goal',
          enabled: true,
          config: {
            variable: 'glassesCount',
            condition: 'greater',
            value: '7'
          }
        },
        {
          id: 'water-5',
          type: 'notification',
          title: 'Progress Update',
          enabled: true,
          config: {
            message: 'You\'ve had {{glassesCount}} glasses today. Keep it up! 🌊'
          }
        }
      ]
    },
    {
      id: 'daily-commute',
      title: 'Smart Commute Helper',
      description: 'Get traffic updates and notify contacts about your commute',
      category: 'travel',
      tags: ['commute', 'traffic', 'work', 'navigation'],
      difficulty: 'intermediate',
      estimatedTime: '45 seconds',
      icon: 'train',
      color: '#FF9800',
      isPopular: true,
      steps: [
        {
          id: 'commute-1',
          type: 'notification',
          title: 'Commute Started',
          enabled: true,
          config: {
            message: '🚊 Starting your commute tracking...'
          }
        },
        {
          id: 'commute-2',
          type: 'location',
          title: 'Current Location',
          enabled: true,
          config: {
            action: 'get_current',
            showResult: false
          }
        },
        {
          id: 'commute-3',
          type: 'prompt_input',
          title: 'Destination',
          enabled: true,
          config: {
            title: 'Where to?',
            message: 'What\'s your destination?',
            variableName: 'destination',
            defaultValue: 'Office'
          }
        },
        {
          id: 'commute-4',
          type: 'prompt_input',
          title: 'ETA',
          enabled: true,
          config: {
            title: 'Estimated Arrival',
            message: 'When do you expect to arrive?',
            variableName: 'eta',
            defaultValue: '9:00 AM'
          }
        },
        {
          id: 'commute-5',
          type: 'sms',
          title: 'Notify Contacts',
          enabled: true,
          config: {
            phoneNumber: '',
            message: '🚊 On my way to {{destination}}. ETA: {{eta}}. Will share location if needed.'
          }
        },
        {
          id: 'commute-6',
          type: 'location',
          title: 'Open Navigation',
          enabled: true,
          config: {
            action: 'open_maps',
            useCurrentLocation: true,
            label: '{{destination}}'
          }
        }
      ]
    },
    {
      id: 'meeting-notes',
      title: 'Quick Meeting Notes',
      description: 'Capture meeting details and action items efficiently',
      category: 'productivity',
      tags: ['meeting', 'notes', 'work', 'productivity'],
      difficulty: 'intermediate',
      estimatedTime: '2 minutes',
      icon: 'clipboard-text',
      color: '#9C27B0',
      isPopular: false,
      steps: [
        {
          id: 'meeting-1',
          type: 'notification',
          title: 'Meeting Notes',
          enabled: true,
          config: {
            message: '📝 Starting meeting notes capture...'
          }
        },
        {
          id: 'meeting-2',
          type: 'prompt_input',
          title: 'Meeting Title',
          enabled: true,
          config: {
            title: 'Meeting Info',
            message: 'What\'s the meeting about?',
            variableName: 'meetingTitle',
            defaultValue: 'Weekly Team Sync'
          }
        },
        {
          id: 'meeting-3',
          type: 'prompt_input',
          title: 'Attendees',
          enabled: true,
          config: {
            title: 'Who\'s There?',
            message: 'List the attendees:',
            variableName: 'attendees',
            defaultValue: 'John, Sarah, Mike'
          }
        },
        {
          id: 'meeting-4',
          type: 'prompt_input',
          title: 'Key Points',
          enabled: true,
          config: {
            title: 'Main Discussion',
            message: 'What were the key points?',
            variableName: 'keyPoints',
            defaultValue: 'Project status, deadlines, next steps'
          }
        },
        {
          id: 'meeting-5',
          type: 'prompt_input',
          title: 'Action Items',
          enabled: true,
          config: {
            title: 'Next Steps',
            message: 'What are the action items?',
            variableName: 'actionItems',
            defaultValue: 'Update documentation, schedule follow-up'
          }
        },
        {
          id: 'meeting-6',
          type: 'variable',
          title: 'Compile Notes',
          enabled: true,
          config: {
            name: 'meetingNotes',
            value: 'MEETING NOTES: {{meetingTitle}}\\n\\nAttendees: {{attendees}}\\n\\nKey Points:\\n- {{keyPoints}}\\n\\nAction Items:\\n- {{actionItems}}\\n\\nDate: [Today]'
          }
        },
        {
          id: 'meeting-7',
          type: 'clipboard',
          title: 'Copy Notes',
          enabled: true,
          config: {
            action: 'copy',
            text: '{{meetingNotes}}'
          }
        },
        {
          id: 'meeting-8',
          type: 'notification',
          title: 'Notes Ready',
          enabled: true,
          config: {
            message: '✅ Meeting notes copied to clipboard and ready to share!'
          }
        }
      ]
    },
    {
      id: 'phone-battery-low',
      title: 'Low Battery Protocol',
      description: 'Optimize phone settings and notify contacts when battery is low',
      category: 'tools',
      tags: ['battery', 'emergency', 'phone', 'power'],
      difficulty: 'advanced',
      estimatedTime: '1 minute',
      icon: 'battery-20',
      color: '#F44336',
      isPopular: false,
      steps: [
        {
          id: 'battery-1',
          type: 'notification',
          title: 'Low Battery Mode',
          enabled: true,
          config: {
            message: '🔋 Activating low battery protocol...'
          }
        },
        {
          id: 'battery-2',
          type: 'prompt_input',
          title: 'Battery Level',
          enabled: true,
          config: {
            title: 'Current Battery',
            message: 'What\'s your current battery percentage?',
            variableName: 'batteryLevel',
            defaultValue: '15%'
          }
        },
        {
          id: 'battery-3',
          type: 'prompt_input',
          title: 'Expected Availability',
          enabled: true,
          config: {
            title: 'When will you charge?',
            message: 'When can you next charge your phone?',
            variableName: 'chargeTime',
            defaultValue: 'In 2 hours'
          }
        },
        {
          id: 'battery-4',
          type: 'sms',
          title: 'Alert Emergency Contact',
          enabled: true,
          config: {
            phoneNumber: '',
            message: '🔋 Low battery alert! Currently at {{batteryLevel}}. Will charge {{chargeTime}}. May be unreachable temporarily.'
          }
        },
        {
          id: 'battery-5',
          type: 'location',
          title: 'Share Current Location',
          enabled: true,
          config: {
            action: 'share_location',
            phoneNumber: '',
            message: 'Current location (low battery backup):'
          }
        },
        {
          id: 'battery-6',
          type: 'notification',
          title: 'Power Saving Tips',
          enabled: true,
          config: {
            message: '💡 Tip: Turn on airplane mode, lower brightness, close apps to save battery!'
          }
        }
      ]
    },
    {
      id: 'photo-backup',
      title: 'Quick Photo Backup',
      description: 'Take photos and prepare them for backup with notes',
      category: 'tools',
      tags: ['photo', 'backup', 'memory', 'documentation'],
      difficulty: 'beginner',
      estimatedTime: '1 minute',
      icon: 'camera-plus',
      color: '#E91E63',
      isPopular: false,
      steps: [
        {
          id: 'photo-1',
          type: 'notification',
          title: 'Photo Session',
          enabled: true,
          config: {
            message: '📸 Starting photo capture session...'
          }
        },
        {
          id: 'photo-2',
          type: 'photo',
          title: 'Take Photo',
          enabled: true,
          config: {
            action: 'take',
            saveToAlbum: true
          }
        },
        {
          id: 'photo-3',
          type: 'prompt_input',
          title: 'Photo Description',
          enabled: true,
          config: {
            title: 'Describe the Photo',
            message: 'What\'s in this photo?',
            variableName: 'photoDesc',
            defaultValue: 'Important document or memory'
          }
        },
        {
          id: 'photo-4',
          type: 'location',
          title: 'Photo Location',
          enabled: true,
          config: {
            action: 'get_current',
            showResult: false
          }
        },
        {
          id: 'photo-5',
          type: 'variable',
          title: 'Create Photo Log',
          enabled: true,
          config: {
            name: 'photoLog',
            value: 'PHOTO LOG\\n\\nDescription: {{photoDesc}}\\nDate: [Current date]\\nLocation: [GPS coordinates]\\n\\nBackup needed: Yes'
          }
        },
        {
          id: 'photo-6',
          type: 'clipboard',
          title: 'Copy Photo Info',
          enabled: true,
          config: {
            action: 'copy',
            text: '{{photoLog}}'
          }
        }
      ]
    },
    {
      id: 'expense-tracker',
      title: 'Quick Expense Log',
      description: 'Log expenses with receipt photos and categorization',
      category: 'productivity',
      tags: ['expense', 'money', 'budget', 'receipt'],
      difficulty: 'intermediate',
      estimatedTime: '90 seconds',
      icon: 'cash',
      color: '#4CAF50',
      isPopular: false,
      steps: [
        {
          id: 'expense-1',
          type: 'notification',
          title: 'Expense Tracker',
          enabled: true,
          config: {
            message: '💰 Logging new expense...'
          }
        },
        {
          id: 'expense-2',
          type: 'prompt_input',
          title: 'Amount',
          enabled: true,
          config: {
            title: 'Expense Amount',
            message: 'How much did you spend?',
            variableName: 'amount',
            defaultValue: '$25.00'
          }
        },
        {
          id: 'expense-3',
          type: 'prompt_input',
          title: 'Category',
          enabled: true,
          config: {
            title: 'Expense Category',
            message: 'What category? (Food, Transport, etc.)',
            variableName: 'category',
            defaultValue: 'Food'
          }
        },
        {
          id: 'expense-4',
          type: 'prompt_input',
          title: 'Description',
          enabled: true,
          config: {
            title: 'What for?',
            message: 'Brief description:',
            variableName: 'description',
            defaultValue: 'Lunch at restaurant'
          }
        },
        {
          id: 'expense-5',
          type: 'photo',
          title: 'Receipt Photo',
          enabled: true,
          config: {
            action: 'take',
            saveToAlbum: true
          }
        },
        {
          id: 'expense-6',
          type: 'location',
          title: 'Expense Location',
          enabled: true,
          config: {
            action: 'get_current',
            showResult: false
          }
        },
        {
          id: 'expense-7',
          type: 'variable',
          title: 'Create Expense Entry',
          enabled: true,
          config: {
            name: 'expenseEntry',
            value: 'EXPENSE: {{amount}}\\nCategory: {{category}}\\nDescription: {{description}}\\nDate: [Today]\\nLocation: [Current location]\\nReceipt: Photo saved'
          }
        },
        {
          id: 'expense-8',
          type: 'clipboard',
          title: 'Copy Expense Data',
          enabled: true,
          config: {
            action: 'copy',
            text: '{{expenseEntry}}'
          }
        }
      ]
    },
    {
      id: 'bedtime-routine',
      title: 'Smart Bedtime Setup',
      description: 'Prepare your environment for optimal sleep',
      category: 'health-fitness',
      tags: ['sleep', 'bedtime', 'health', 'routine'],
      difficulty: 'beginner',
      estimatedTime: '30 seconds',
      icon: 'bed',
      color: '#673AB7',
      isPopular: true,
      steps: [
        {
          id: 'bedtime-1',
          type: 'notification',
          title: 'Bedtime Routine',
          enabled: true,
          config: {
            message: '🛏️ Starting bedtime routine...'
          }
        },
        {
          id: 'bedtime-2',
          type: 'prompt_input',
          title: 'Wake Up Time',
          enabled: true,
          config: {
            title: 'Tomorrow\'s Schedule',
            message: 'What time do you need to wake up?',
            variableName: 'wakeTime',
            defaultValue: '7:00 AM'
          }
        },
        {
          id: 'bedtime-3',
          type: 'math',
          title: 'Calculate Sleep Hours',
          enabled: true,
          config: {
            operation: 'subtract',
            number1: 'wakeTime',
            number2: 'currentTime'
          }
        },
        {
          id: 'bedtime-4',
          type: 'webhook',
          title: 'Smart Home - Night Mode',
          enabled: true,
          config: {
            url: 'https://your-smart-home-api.com/night-mode',
            method: 'POST'
          }
        },
        {
          id: 'bedtime-5',
          type: 'sms',
          title: 'Good Night Message',
          enabled: true,
          config: {
            phoneNumber: '',
            message: '😴 Going to bed now. Wake up time: {{wakeTime}}. Good night!'
          }
        },
        {
          id: 'bedtime-6',
          type: 'notification',
          title: 'Sleep Well',
          enabled: true,
          config: {
            message: '🌙 Environment set for sleep. Sweet dreams! Wake up at {{wakeTime}}'
          }
        }
      ]
    },
    {
      id: 'home-arrival',
      title: 'Home Arrival Routine',
      description: 'Automatically notify family when you arrive home and turn on lights',
      category: 'smart-home',
      tags: ['home', 'arrival', 'location', 'family', 'smart-home'],
      difficulty: 'intermediate',
      estimatedTime: '1 minute',
      icon: 'home',
      color: '#4CAF50',
      isPopular: true,
      steps: [
        {
          id: 'home-arrival-1',
          type: 'notification',
          title: 'Welcome Home',
          enabled: true,
          config: {
            message: 'Welcome home! 🏠 Running your arrival routine...'
          }
        },
        {
          id: 'home-arrival-2',
          type: 'sms',
          title: 'Notify Family',
          enabled: true,
          config: {
            phoneNumber: '',
            message: 'Just arrived home! 🏠'
          }
        },
        {
          id: 'home-arrival-3',
          type: 'variable',
          title: 'Set Home Status',
          enabled: true,
          config: {
            name: 'homeStatus',
            value: 'occupied'
          }
        },
        {
          id: 'home-arrival-4',
          type: 'notification',
          title: 'Routine Complete',
          enabled: true,
          config: {
            message: 'Home arrival routine completed! Status: {{homeStatus}} ✅'
          }
        }
      ]
    }
  ];

  static getAllTemplates(): AutomationTemplate[] {
    return this.templates;
  }

  static getTemplatesByCategory(category: string): AutomationTemplate[] {
    return this.templates.filter(template => template.category === category);
  }

  static getPopularTemplates(): AutomationTemplate[] {
    return this.templates.filter(template => template.isPopular);
  }

  static getTemplateById(id: string): AutomationTemplate | undefined {
    return this.templates.find(template => template.id === id);
  }

  static searchTemplates(query: string): AutomationTemplate[] {
    const lowercaseQuery = query.toLowerCase();
    return this.templates.filter(template =>
      template.title.toLowerCase().includes(lowercaseQuery) ||
      template.description.toLowerCase().includes(lowercaseQuery) ||
      template.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  static getCategories(): Array<{id: string, name: string, icon: string, color: string}> {
    const categories = new Set(this.templates.map(t => t.category));
    return Array.from(categories).map(category => {
      switch (category) {
        case 'productivity':
          return { id: category, name: 'Productivity', icon: 'briefcase', color: '#2196F3' };
        case 'emergency':
          return { id: category, name: 'Emergency', icon: 'alert', color: '#F44336' };
        case 'travel':
          return { id: category, name: 'Travel', icon: 'airplane', color: '#E91E63' };
        case 'health-fitness':
          return { id: category, name: 'Health & Fitness', icon: 'heart', color: '#FF5722' };
        case 'smart-home':
          return { id: category, name: 'Smart Home', icon: 'home-automation', color: '#607D8B' };
        case 'tools':
          return { id: category, name: 'Tools', icon: 'toolbox', color: '#795548' };
        default:
          return { id: category, name: category, icon: 'folder', color: '#9E9E9E' };
      }
    });
  }

  static createAutomationFromTemplate(
    template: AutomationTemplate, 
    userId: string,
    customizations?: { title?: string; phoneNumbers?: Record<string, string> }
  ): AutomationData {
    // Apply customizations to steps
    const customizedSteps = template.steps.map(step => {
      const newStep = { ...step, id: uuid.v4() as string };
      
      // Replace phone number placeholders with actual numbers
      if (customizations?.phoneNumbers && step.config.phoneNumber === '') {
        const stepKey = step.id.replace(`${template.id}-`, '');
        if (customizations.phoneNumbers[stepKey]) {
          newStep.config = {
            ...newStep.config,
            phoneNumber: customizations.phoneNumbers[stepKey]
          };
        }
      }
      
      return newStep;
    });

    return {
      id: uuid.v4() as string,
      title: customizations?.title || `${template.title} (from template)`,
      description: `${template.description}\n\nCreated from template: ${template.title}`,
      steps: customizedSteps,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_public: true, // Make template automations public so they can be accessed via NFC
      category: template.category,
      tags: [...template.tags, 'template'],
      execution_count: 0,
      average_rating: 0,
      rating_count: 0
    };
  }
}