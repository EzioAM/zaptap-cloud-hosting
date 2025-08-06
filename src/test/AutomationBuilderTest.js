// Comprehensive Automation Builder Test
// This script tests all available step types and their configurations

import { AutomationEngine } from '../services/automation/AutomationEngine';
import { EventLogger } from '../utils/EventLogger';

export const testAutomationBuilder = async () => {
  EventLogger.debug('Automation', '🧪 Starting Comprehensive Automation Builder Test...\n');

  // Test 1: Basic Step Types
  const basicAutomation = {
    id: 'test-basic-001',
    title: 'Basic Step Types Test',
    description: 'Testing all basic automation step types',
    steps: [
      {
        id: 'step1',
        type: 'notification',
        title: 'Welcome Notification',
        enabled: true,
        config: {
          title: 'Test Started',
          message: 'Comprehensive automation test is now running!'
        }
      },
      {
        id: 'step2',
        type: 'variable',
        title: 'Set User Variable',
        enabled: true,
        config: {
          name: 'userName',
          value: 'TestUser'
        }
      },
      {
        id: 'step3',
        type: 'delay',
        title: 'Wait 2 seconds',
        enabled: true,
        config: {
          delay: 2000
        }
      },
      {
        id: 'step4',
        type: 'get_variable',
        title: 'Get User Variable',
        enabled: true,
        config: {
          name: 'userName',
          defaultValue: 'DefaultUser'
        }
      }
    ],
    created_by: 'test-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_public: false,
    category: 'test',
    tags: ['test', 'basic'],
    execution_count: 0,
    average_rating: 0,
    rating_count: 0
  };

  // Test 2: Advanced Communication Steps
  const communicationAutomation = {
    id: 'test-comm-002',
    title: 'Communication Steps Test',
    description: 'Testing SMS, Email, and Webhook steps',
    steps: [
      {
        id: 'step1',
        type: 'sms',
        title: 'Send Test SMS',
        enabled: true,
        config: {
          phoneNumber: '+1234567890',
          message: 'Test SMS from automation: {{userName}}'
        }
      },
      {
        id: 'step2',
        type: 'email',
        title: 'Send Test Email',
        enabled: true,
        config: {
          email: 'test@example.com',
          subject: 'Automation Test Email',
          message: 'Hello {{userName}}, this is a test email from our automation system!'
        }
      },
      {
        id: 'step3',
        type: 'webhook',
        title: 'Call Test Webhook',
        enabled: true,
        config: {
          url: 'https://httpbin.org/post',
          method: 'POST',
          body: JSON.stringify({
            user: '{{userName}}',
            timestamp: new Date().toISOString(),
            test: true
          })
        }
      }
    ],
    created_by: 'test-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_public: false,
    category: 'test',
    tags: ['test', 'communication'],
    execution_count: 0,
    average_rating: 0,
    rating_count: 0
  };

  // Test 3: Location and Device Steps
  const locationAutomation = {
    id: 'test-location-003',
    title: 'Location & Device Steps Test',
    description: 'Testing location, photo, clipboard, and app steps',
    steps: [
      {
        id: 'step1',
        type: 'location',
        title: 'Get Current Location',
        enabled: true,
        config: {
          action: 'get_current',
          showResult: true
        }
      },
      {
        id: 'step2',
        type: 'photo',
        title: 'Take Photo',
        enabled: true,
        config: {
          action: 'take',
          saveToAlbum: true
        }
      },
      {
        id: 'step3',
        type: 'clipboard',
        title: 'Copy Location to Clipboard',
        enabled: true,
        config: {
          action: 'copy',
          text: 'Current location: {{latitude}}, {{longitude}}'
        }
      },
      {
        id: 'step4',
        type: 'app',
        title: 'Open Maps App',
        enabled: true,
        config: {
          appName: 'Maps',
          url: 'maps://'
        }
      }
    ],
    created_by: 'test-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_public: false,
    category: 'test',
    tags: ['test', 'location', 'device'],
    execution_count: 0,
    average_rating: 0,
    rating_count: 0
  };

  // Test 4: Logic and Processing Steps
  const logicAutomation = {
    id: 'test-logic-004',
    title: 'Logic & Processing Steps Test',
    description: 'Testing conditions, loops, text processing, and math',
    steps: [
      {
        id: 'step1',
        type: 'variable',
        title: 'Set Counter',
        enabled: true,
        config: {
          name: 'counter',
          value: '5'
        }
      },
      {
        id: 'step2',
        type: 'condition',
        title: 'Check Counter Value',
        enabled: true,
        config: {
          variable: 'counter',
          condition: 'greater',
          value: '3',
          trueActions: [
            {
              type: 'notification',
              config: {
                message: 'Counter is greater than 3!'
              }
            }
          ],
          falseActions: [
            {
              type: 'notification',
              config: {
                message: 'Counter is not greater than 3'
              }
            }
          ]
        }
      },
      {
        id: 'step3',
        type: 'math',
        title: 'Calculate Result',
        enabled: true,
        config: {
          operation: 'multiply',
          number1: 10,
          number2: 5
        }
      },
      {
        id: 'step4',
        type: 'text',
        title: 'Format Result Text',
        enabled: true,
        config: {
          action: 'combine',
          text1: 'The calculation result is:',
          text2: '{{mathResult}}',
          separator: ' '
        }
      },
      {
        id: 'step5',
        type: 'loop',
        title: 'Repeat Notification',
        enabled: true,
        config: {
          type: 'count',
          count: 3,
          actions: [
            {
              type: 'notification',
              config: {
                message: 'Loop iteration: {{loopIndex}}'
              }
            },
            {
              type: 'delay',
              config: {
                delay: 1000
              }
            }
          ]
        }
      }
    ],
    created_by: 'test-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_public: false,
    category: 'test',
    tags: ['test', 'logic', 'processing'],
    execution_count: 0,
    average_rating: 0,
    rating_count: 0
  };

  // Test 5: Interactive Steps
  const interactiveAutomation = {
    id: 'test-interactive-005',
    title: 'Interactive Steps Test',
    description: 'Testing user input and interactive features',
    steps: [
      {
        id: 'step1',
        type: 'prompt_input',
        title: 'Get User Name',
        enabled: true,
        config: {
          title: 'Welcome!',
          message: 'Please enter your name:',
          variableName: 'dynamicUserName',
          defaultValue: 'Guest'
        }
      },
      {
        id: 'step2',
        type: 'prompt_input',
        title: 'Get Favorite Color',
        enabled: true,
        config: {
          title: 'Personalization',
          message: 'What is your favorite color?',
          variableName: 'favoriteColor',
          defaultValue: 'Blue'
        }
      },
      {
        id: 'step3',
        type: 'text',
        title: 'Create Personalized Message',
        enabled: true,
        config: {
          action: 'combine',
          text1: 'Hello {{dynamicUserName}}!',
          text2: 'I see your favorite color is {{favoriteColor}}.',
          separator: ' '
        }
      },
      {
        id: 'step4',
        type: 'notification',
        title: 'Show Personalized Message',
        enabled: true,
        config: {
          title: 'Personalized Greeting',
          message: '{{personalizedMessage}}'
        }
      }
    ],
    created_by: 'test-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_public: false,
    category: 'test',
    tags: ['test', 'interactive', 'personalized'],
    execution_count: 0,
    average_rating: 0,
    rating_count: 0
  };

  // Execute all test automations
  const engine = new AutomationEngine();
  const testResults = [];

  EventLogger.debug('Automation', '📝 Test 1: Basic Step Types');
  try {
    const result1 = await engine.execute(basicAutomation);
    testResults.push({
      name: 'Basic Steps',
      success: result1.success,
      executionTime: result1.executionTime,
      stepsCompleted: result1.stepsCompleted,
      totalSteps: result1.totalSteps,
      error: result1.error
    });
    console.log(`✅ Basic Steps: ${result1.success ? 'PASSED' : 'FAILED'}`);
    if (result1.error) EventLogger.debug('Automation', '   Error: ${result1.error}');
  } catch (error) {
    testResults.push({
      name: 'Basic Steps',
      success: false,
      error: error.message
    });
    EventLogger.debug('Automation', '❌ Basic Steps: FAILED - ${error.message}');
  }

  EventLogger.debug('Automation', '\n📞 Test 2: Communication Steps');
  try {
    const result2 = await engine.execute(communicationAutomation);
    testResults.push({
      name: 'Communication Steps',
      success: result2.success,
      executionTime: result2.executionTime,
      stepsCompleted: result2.stepsCompleted,
      totalSteps: result2.totalSteps,
      error: result2.error
    });
    console.log(`✅ Communication Steps: ${result2.success ? 'PASSED' : 'FAILED'}`);
    if (result2.error) EventLogger.debug('Automation', '   Error: ${result2.error}');
  } catch (error) {
    testResults.push({
      name: 'Communication Steps',
      success: false,
      error: error.message
    });
    EventLogger.debug('Automation', '❌ Communication Steps: FAILED - ${error.message}');
  }

  EventLogger.debug('Automation', '\n📍 Test 3: Location & Device Steps');
  try {
    const result3 = await engine.execute(locationAutomation);
    testResults.push({
      name: 'Location & Device Steps',
      success: result3.success,
      executionTime: result3.executionTime,
      stepsCompleted: result3.stepsCompleted,
      totalSteps: result3.totalSteps,
      error: result3.error
    });
    console.log(`✅ Location & Device Steps: ${result3.success ? 'PASSED' : 'FAILED'}`);
    if (result3.error) EventLogger.debug('Automation', '   Error: ${result3.error}');
  } catch (error) {
    testResults.push({
      name: 'Location & Device Steps',
      success: false,
      error: error.message
    });
    EventLogger.debug('Automation', '❌ Location & Device Steps: FAILED - ${error.message}');
  }

  EventLogger.debug('Automation', '\n🧠 Test 4: Logic & Processing Steps');
  try {
    const result4 = await engine.execute(logicAutomation);
    testResults.push({
      name: 'Logic & Processing Steps',
      success: result4.success,
      executionTime: result4.executionTime,
      stepsCompleted: result4.stepsCompleted,
      totalSteps: result4.totalSteps,
      error: result4.error
    });
    console.log(`✅ Logic & Processing Steps: ${result4.success ? 'PASSED' : 'FAILED'}`);
    if (result4.error) EventLogger.debug('Automation', '   Error: ${result4.error}');
  } catch (error) {
    testResults.push({
      name: 'Logic & Processing Steps',
      success: false,
      error: error.message
    });
    EventLogger.debug('Automation', '❌ Logic & Processing Steps: FAILED - ${error.message}');
  }

  EventLogger.debug('Automation', '\n💬 Test 5: Interactive Steps');
  try {
    const result5 = await engine.execute(interactiveAutomation);
    testResults.push({
      name: 'Interactive Steps',
      success: result5.success,
      executionTime: result5.executionTime,
      stepsCompleted: result5.stepsCompleted,
      totalSteps: result5.totalSteps,
      error: result5.error
    });
    console.log(`✅ Interactive Steps: ${result5.success ? 'PASSED' : 'FAILED'}`);
    if (result5.error) EventLogger.debug('Automation', '   Error: ${result5.error}');
  } catch (error) {
    testResults.push({
      name: 'Interactive Steps',
      success: false,
      error: error.message
    });
    EventLogger.debug('Automation', '❌ Interactive Steps: FAILED - ${error.message}');
  }

  // Summary
  EventLogger.debug('Automation', '\n🎯 TEST SUMMARY');
  EventLogger.debug('Automation', '================');
  const passedTests = testResults.filter(t => t.success).length;
  const totalTests = testResults.length;
  
  testResults.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const time = result.executionTime ? `(${result.executionTime}ms)` : '';
    const steps = result.stepsCompleted && result.totalSteps ? 
      `${result.stepsCompleted}/${result.totalSteps} steps` : '';
    
    EventLogger.debug('Automation', '${status} ${result.name} ${time} ${steps}');
    if (!result.success && result.error) {
      EventLogger.debug('Automation', '    └─ Error: ${result.error}');
    }
  });
  
  EventLogger.debug('Automation', '\n📊 Overall Result: ${passedTests}/${totalTests} tests passed');
  EventLogger.debug('Automation', '📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%');

  return {
    totalTests,
    passedTests,
    successRate: Math.round((passedTests / totalTests) * 100),
    results: testResults
  };
};

// Export test configurations for manual testing in the app
export const testConfigurations = {
  basicAutomation: {
    title: 'Basic Step Types Test',
    steps: [
      { type: 'notification', config: { title: 'Test Started', message: 'Testing notification step!' } },
      { type: 'variable', config: { name: 'testVar', value: 'Hello World' } },
      { type: 'delay', config: { delay: 2000 } },
      { type: 'get_variable', config: { name: 'testVar', defaultValue: 'Default' } }
    ]
  },
  
  advancedAutomation: {
    title: 'Advanced Features Test',
    steps: [
      { type: 'prompt_input', config: { title: 'Input Test', message: 'Enter your name:', variableName: 'userName' } },
      { type: 'condition', config: { variable: 'userName', condition: 'contains', value: 'test' } },
      { type: 'math', config: { operation: 'add', number1: 10, number2: 5 } },
      { type: 'text', config: { action: 'combine', text1: 'Hello', text2: '{{userName}}', separator: ' ' } },
      { type: 'loop', config: { type: 'count', count: 3 } }
    ]
  },
  
  deviceAutomation: {
    title: 'Device Integration Test',
    steps: [
      { type: 'location', config: { action: 'get_current', showResult: true } },
      { type: 'photo', config: { action: 'take', saveToAlbum: true } },
      { type: 'clipboard', config: { action: 'copy', text: 'Test clipboard content' } },
      { type: 'app', config: { appName: 'Settings', url: 'settings://' } }
    ]
  }
};