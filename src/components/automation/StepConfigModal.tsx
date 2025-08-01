import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import {
  Modal,
  Text,
  TextInput,
  Button,
  IconButton,
  Chip,
  Surface,
  useTheme,
} from 'react-native-paper';
import { BlurView } from 'expo-blur';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface StepConfigModalProps {
  visible: boolean;
  stepType: string;
  stepTitle: string;
  stepConfig: Record<string, any>;
  onSave: (config: Record<string, any>) => void;
  onCancel: () => void;
  renderConfigForm: () => React.ReactNode;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const StepConfigModal: React.FC<StepConfigModalProps> = ({
  visible,
  stepType,
  stepTitle,
  stepConfig,
  onSave,
  onCancel,
  renderConfigForm,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      // Animate modal in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
      ]).start();
    } else {
      // Animate modal out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const getStepIcon = () => {
    const iconMap: Record<string, string> = {
      sms: 'message-text',
      email: 'email',
      webhook: 'webhook',
      notification: 'bell',
      delay: 'clock',
      variable: 'variable',
      location: 'map-marker',
      condition: 'code-braces',
      loop: 'refresh',
      text: 'format-text',
      math: 'calculator',
      clipboard: 'content-paste',
      app: 'application',
      photo: 'camera',
    };
    return iconMap[stepType] || 'help-circle';
  };

  return (
    <Modal
      visible={visible}
      onDismiss={onCancel}
      contentContainerStyle={styles.modalContainer}
    >
      <Animated.View 
        style={[
          styles.backdrop,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={80} style={StyleSheet.absoluteFillObject} />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
        )}
      </Animated.View>
      
      <Animated.View
        style={[
          styles.modalContent,
          {
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim },
            ],
            opacity: fadeAnim,
          }
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <Surface style={[styles.surface, { paddingBottom: insets.bottom }]} elevation={4}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.dragIndicator} />
              <View style={styles.headerContent}>
                <View style={styles.headerLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
                    <Icon name={getStepIcon()} size={24} color={theme.colors.primary} />
                  </View>
                  <View style={styles.headerText}>
                    <Text style={styles.headerTitle}>Configure Step</Text>
                    <Text style={styles.headerSubtitle}>{stepTitle}</Text>
                  </View>
                </View>
                <IconButton
                  icon="close"
                  size={24}
                  onPress={onCancel}
                  style={styles.closeButton}
                />
              </View>
            </View>

            {/* Content */}
            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.formContainer}>
                {renderConfigForm()}
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
              <Button
                mode="outlined"
                onPress={onCancel}
                style={styles.actionButton}
                contentStyle={styles.actionButtonContent}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={() => onSave(stepConfig)}
                style={[styles.actionButton, styles.saveButton]}
                contentStyle={styles.actionButtonContent}
                icon="check"
              >
                Save Configuration
              </Button>
            </View>
          </Surface>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    margin: 0,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  surface: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.9,
  },
  header: {
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  closeButton: {
    margin: -8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 20,
  },
  formContainer: {
    paddingHorizontal: 20,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  actionButtonContent: {
    paddingVertical: 8,
  },
  saveButton: {
    flex: 2,
  },
});

export default StepConfigModal;