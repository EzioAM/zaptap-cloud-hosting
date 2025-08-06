import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Vibration,
  Animated,
} from 'react-native';
import {
  Appbar,
  Text,
  Button,
  Surface,
  ActivityIndicator,
} from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import NFCService from '../../services/nfc/NFCService';
import { AutomationData } from '../../types';
import { smartLinkService } from '../../services/linking/SmartLinkService';
import { EventLogger } from '../../utils/EventLogger';

interface NFCWriterProps {
  automation: AutomationData;
  onSuccess: () => void;
  onClose: () => void;
}

const NFCWriter: React.FC<NFCWriterProps> = ({ automation, onSuccess, onClose }) => {
  const [writing, setWriting] = useState(false);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let mounted = true;
    
    const initializeNFC = async () => {
      if (mounted) {
        await checkNFCSupport();
      }
    };
    
    initializeNFC();
    
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (writing) {
      startPulseAnimation();
    } else {
      stopPulseAnimation();
    }
  }, [writing]);

  const checkNFCSupport = async () => {
    try {
      const supported = await NFCService.initialize();
      setIsSupported(supported);
    } catch (error) {
      EventLogger.error('NFC', 'Error checking NFC support:', error as Error);
      setIsSupported(false);
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  const handleWriteToNFC = async () => {
    try {
      setWriting(true);
      
      Alert.alert(
        'Ready to Write NFC 📱',
        `Place an NFC tag near your device to write "${automation.title}" to it.\\n\\nMake sure the tag is writable and keep your device steady.`,
        [
          {
            text: 'Cancel',
            onPress: () => setWriting(false),
          },
          {
            text: 'Start Writing',
            onPress: performNFCWrite,
          },
        ]
      );
      
    } catch (error) {
      setWriting(false);
      EventLogger.error('NFC', 'NFC write preparation failed:', error as Error);
    }
  };

  const performNFCWrite = async () => {
    try {
      const success = await NFCService.writeAutomationToNFC(automation);
      
      if (success) {
        // Vibrate on successful write
        Vibration.vibrate([200, 100, 200]);
        onSuccess();
      }
      
    } catch (error) {
      EventLogger.error('NFC', 'NFC write failed:', error as Error);
      Alert.alert('Write Failed', 'Failed to write automation to NFC tag');
    } finally {
      setWriting(false);
    }
  };

  if (isSupported === null) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={onClose} />
          <Appbar.Content title="Write to NFC" />
        </Appbar.Header>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" />
          <Text style={styles.statusText}>Checking NFC support...</Text>
        </View>
      </View>
    );
  }

  if (!isSupported) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={onClose} />
          <Appbar.Content title="Write to NFC" />
        </Appbar.Header>
        <View style={styles.centerContent}>
          <Icon name="nfc-variant-off" size={64} color="#999" />
          <Text style={styles.errorTitle}>NFC Not Supported</Text>
          <Text style={styles.errorText}>
            Your device does not support NFC functionality.
          </Text>
          <Button mode="contained" onPress={onClose} style={styles.button}>
            Close
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={onClose} />
        <Appbar.Content title="Write to NFC Tag" />
      </Appbar.Header>

      <View style={styles.content}>
        {/* Automation Info */}
        <Surface style={styles.automationCard} elevation={2}>
          <View style={styles.automationHeader}>
            <Icon name="robot" size={32} color="#6200ee" />
            <View style={styles.automationInfo}>
              <Text style={styles.automationTitle}>{automation.title}</Text>
              <Text style={styles.automationMeta}>
                {automation.steps?.length || 0} steps • {automation.category}
              </Text>
            </View>
          </View>
          
          {automation.description && (
            <Text style={styles.automationDescription}>
              {automation.description}
            </Text>
          )}
        </Surface>

        {/* NFC Write Area */}
        <View style={styles.writeArea}>
          <Animated.View 
            style={[
              styles.nfcIcon, 
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            <Icon 
              name="nfc-variant" 
              size={120} 
              color={writing ? "#ff6b00" : "#6200ee"} 
            />
          </Animated.View>
          
          <Text style={styles.instruction}>
            {writing 
              ? "Hold your device near an NFC tag to write"
              : "Tap 'Write to NFC' to begin writing this automation to a tag"
            }
          </Text>
          
          {writing && (
            <Surface style={styles.statusCard} elevation={2}>
              <ActivityIndicator size="small" color="#ff6b00" />
              <Text style={styles.writingText}>Ready to write to NFC tag...</Text>
            </Surface>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {!writing ? (
            <Button
              mode="contained"
              onPress={handleWriteToNFC}
              icon="nfc-variant"
              style={[styles.button, styles.primaryButton]}
              disabled={writing}
            >
              Write to NFC Tag
            </Button>
          ) : (
            <Button
              mode="outlined"
              onPress={() => setWriting(false)}
              icon="close"
              style={styles.button}
            >
              Cancel Writing
            </Button>
          )}
        </View>

        {/* Info Card */}
        <Surface style={styles.infoCard} elevation={1}>
          <Icon name="information" size={24} color="#6200ee" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Writing to NFC Tags</Text>
            <Text style={styles.infoText}>
              • Use blank or rewritable NFC tags{'\n'}
              • Keep your device close to the tag{'\n'}
              • Don't move the device during writing{'\n'}
              • The tag will contain a link to run this automation{'\n'}
              • Anyone can tap the tag to execute the automation
            </Text>
          </View>
        </Surface>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  automationCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#fff',
    marginBottom: 24,
  },
  automationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  automationInfo: {
    flex: 1,
    marginLeft: 16,
  },
  automationTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  automationMeta: {
    fontSize: 14,
    color: '#666',
  },
  automationDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginTop: 8,
  },
  writeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nfcIcon: {
    marginBottom: 32,
  },
  instruction: {
    fontSize: 18,
    textAlign: 'center',
    color: '#333',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    marginBottom: 32,
  },
  writingText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#ff6b00',
    fontWeight: '500',
  },
  actions: {
    marginBottom: 24,
    alignItems: 'center',
  },
  button: {
    minWidth: 180,
  },
  primaryButton: {
    backgroundColor: '#6200ee',
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  statusText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
});

export default NFCWriter;