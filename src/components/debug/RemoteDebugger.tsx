import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, DeviceEventEmitter, Platform, NativeModules } from 'react-native';
import { Button, Surface, Portal, Modal } from 'react-native-paper';

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
}

export const RemoteDebugger: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showDebugger, setShowDebugger] = useState(false);

  // Shake detection using multiple approaches
  useEffect(() => {
    let shakeListener: any;
    let multiTapCount = 0;
    let multiTapTimer: NodeJS.Timeout;

    const setupShakeDetection = () => {
      try {
        // Method 1: Try DeviceEventEmitter for shake
        shakeListener = DeviceEventEmitter.addListener('shake', () => {
          console.log('🤳 Shake detected via DeviceEventEmitter - opening debug console');
          setShowDebugger(true);
        });
        
        // Method 2: Set up global touch counter for 4-finger tap
        const handleMultiTouch = () => {
          multiTapCount++;
          console.log(`👆 Multi-tap count: ${multiTapCount}`);
          
          clearTimeout(multiTapTimer);
          multiTapTimer = setTimeout(() => {
            multiTapCount = 0;
          }, 1000);
          
          // 4 taps in quick succession opens debug
          if (multiTapCount >= 4) {
            console.log('👆👆👆👆 4-tap detected - opening debug console');
            setShowDebugger(true);
            multiTapCount = 0;
          }
        };

        // Add global touch listener for multi-tap detection
        if (typeof global !== 'undefined') {
          (global as any).__debugTapHandler = handleMultiTouch;
        }
        
        console.log('🔧 Multi-method shake detection setup completed');
        console.log('💡 Try: 1) Shake device, 2) 4 quick taps anywhere, 3) Long press 🐛 button');
      } catch (error) {
        console.warn('Could not set up shake detection:', error);
      }
    };

    if (__DEV__) {
      setupShakeDetection();
    }

    return () => {
      if (shakeListener) {
        shakeListener.remove();
      }
      clearTimeout(multiTapTimer);
      if (typeof global !== 'undefined') {
        delete (global as any).__debugTapHandler;
      }
    };
  }, []);

  useEffect(() => {
    // Override console methods to capture logs
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args) => {
      originalLog(...args);
      addLog('info', args.join(' '), args[1]);
    };

    console.warn = (...args) => {
      originalWarn(...args);
      addLog('warn', args.join(' '), args[1]);
    };

    console.error = (...args) => {
      originalError(...args);
      addLog('error', args.join(' '), args[1]);
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  const addLog = (level: LogEntry['level'], message: string, data?: any) => {
    const entry: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date(),
      level,
      message,
      data
    };
    setLogs(prev => [entry, ...prev].slice(0, 100)); // Keep last 100 logs
  };

  const clearLogs = () => setLogs([]);

  const testShake = () => {
    console.log('🧪 Testing shake detection...');
    addLog('info', 'Shake test triggered manually');
    setShowDebugger(true);
  };

  const getLogColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return '#f44336';
      case 'warn': return '#ff9800';
      case 'info': return '#2196f3';
      case 'debug': return '#9e9e9e';
    }
  };

  if (!__DEV__) return null;

  return (
    <>
      {/* Floating Debug Button - Always visible and working */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => {
          console.log('🐛 Debug button pressed - opening console');
          setShowDebugger(true);
        }}
        onLongPress={() => {
          console.log('🐛 Debug button long pressed - testing');
          testShake();
        }}
      >
        <Text style={styles.buttonText}>🐛</Text>
      </TouchableOpacity>

      {/* Debug Console Modal */}
      <Portal>
        <Modal
          visible={showDebugger}
          onDismiss={() => setShowDebugger(false)}
          contentContainerStyle={styles.modal}
        >
          <Surface style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>Debug Console</Text>
              <View style={styles.actions}>
                <Button onPress={testShake} mode="outlined" compact>
                  Test Shake
                </Button>
                <Button onPress={clearLogs} compact>Clear</Button>
                <Button onPress={() => setShowDebugger(false)} compact>Close</Button>
              </View>
            </View>

            <ScrollView style={styles.logContainer}>
              {logs.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No logs yet</Text>
                  <Text style={styles.emptySubtext}>
                    Open debug console by:{'\n'}
                    • Shake your device{'\n'}
                    • Tap anywhere 4 times quickly{'\n'}
                    • Tap the floating 🐛 button{'\n'}
                    • Long press 🐛 to test detection
                  </Text>
                </View>
              )}
              {logs.map(log => (
                <View key={log.id} style={styles.logEntry}>
                  <Text style={[styles.logLevel, { color: getLogColor(log.level) }]}>
                    [{log.level.toUpperCase()}]
                  </Text>
                  <Text style={styles.logTime}>
                    {log.timestamp.toLocaleTimeString()}
                  </Text>
                  <Text style={styles.logMessage}>{log.message}</Text>
                  {log.data && (
                    <Text style={styles.logData}>
                      {JSON.stringify(log.data, null, 2)}
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>
          </Surface>
        </Modal>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  invisibleTouchHandler: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  invisibleContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  buttonText: {
    fontSize: 24,
  },
  modal: {
    margin: 20,
    maxHeight: '80%',
  },
  container: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  logContainer: {
    maxHeight: 400,
    padding: 16,
  },
  logEntry: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logLevel: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  logTime: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  logMessage: {
    fontSize: 14,
    color: '#333',
  },
  logData: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    marginTop: 4,
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 4,
  },
});