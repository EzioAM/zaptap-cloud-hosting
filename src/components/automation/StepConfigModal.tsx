import React, { useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Modal, TouchableOpacity } from 'react-native';
import { Text, Button, IconButton, useTheme, MD3Theme } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ICON_MAP = {
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
} as const;

type StepType = keyof typeof ICON_MAP;

interface StepConfigModalProps {
  visible: boolean;
  stepType: string;
  stepTitle: string;
  stepConfig: Record<string, any>;
  onSave: (config: Record<string, any>) => void;
  onCancel: () => void;
  renderConfigForm: () => React.ReactNode;
}


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

  // Dev-only visibility trace
  useEffect(() => {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('StepConfigModal:', { visible, stepType, stepTitle });
    }
  }, [visible, stepType, stepTitle]);

  const stepIcon = useMemo(
    () => ICON_MAP[stepType as StepType] ?? 'help-circle',
    [stepType]
  );

  const handleSave = useCallback(() => {
    onSave(stepConfig);
  }, [onSave, stepConfig]);

  if (!visible) return null;

  const styles = makeStyles(theme, insets);

  // Defensive error handling for renderConfigForm
  let formNode: React.ReactNode = null;
  try {
    formNode = typeof renderConfigForm === 'function' ? renderConfigForm() : null;
    if (__DEV__) {
      console.log('Form node generated:', { formNode, stepType, stepTitle });
    }
  } catch (e) {
    formNode = <Text style={{ color: theme.colors.error }}>Error loading form: {e.message}</Text>;
    if (__DEV__) {
      console.error('renderConfigForm error:', e);
    }
  }

  return (
    <Modal
      visible={visible}
      onRequestClose={onCancel}
      animationType="fade"
      transparent={true}
      statusBarTranslucent
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1}
        onPress={onCancel}
      >
        <TouchableOpacity 
          activeOpacity={1}
          style={styles.modalContainer}
          onPress={() => {}}
        >
          <View 
            style={styles.modalContent} 
            testID="StepConfigModalContent" 
            accessibilityViewIsModal 
            accessibilityRole="dialog"
          >
            {/* Header */}
            <View style={styles.header} accessibilityRole="header">
              <View style={styles.headerLeft}>
                <View style={styles.iconContainer} accessible accessibilityLabel={`${stepType} icon`}>
                  <Icon name={stepIcon} size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.headerText}>
                  <Text variant="titleMedium" style={styles.headerTitle}>
                    Configure Step
                  </Text>
                  <Text variant="bodyMedium" style={styles.headerSubtitle} numberOfLines={1}>
                    {stepTitle}
                  </Text>
                </View>
              </View>
              <IconButton
                icon="close"
                size={24}
                onPress={onCancel}
                accessibilityLabel="Close configuration"
                iconColor={theme.colors.onSurface}
              />
            </View>

            {/* Content */}
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              keyboardShouldPersistTaps="handled"
            >
              {formNode ? (
                <View style={{ width: '100%' }}>
                  {formNode}
                </View>
              ) : (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={styles.noFormText}>
                    No configuration form available for "{stepType}".
                  </Text>
                  {__DEV__ && (
                    <Text style={{ marginTop: 10, fontSize: 12, color: theme.colors.onSurfaceVariant }}>
                      Debug: stepType={stepType}, formNode={formNode ? 'exists' : 'null'}
                    </Text>
                  )}
                </View>
              )}
            </ScrollView>

            {/* Actions */}
            <View style={styles.actions}>
              <Button
                mode="outlined"
                onPress={onCancel}
                style={styles.actionButton}
                contentStyle={styles.actionButtonContent}
                accessibilityLabel="Cancel configuration"
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                style={[styles.actionButton, styles.saveButton]}
                contentStyle={styles.actionButtonContent}
                icon="check"
                accessibilityLabel="Save configuration"
              >
                Save
              </Button>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const makeStyles = (theme: MD3Theme, insets: { top: number; bottom: number }) =>
  StyleSheet.create({
    flex: { flex: 1 },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      width: '90%',
      maxWidth: 400,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      maxHeight: '80%',
      minHeight: 400, // Ensure minimum height
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      overflow: 'hidden',
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surface,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      minHeight: 40,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
      backgroundColor: theme.colors.primaryContainer,
    },
    headerText: { flex: 1 },
    headerTitle: { color: theme.colors.onSurface, fontWeight: '600' },
    headerSubtitle: { color: theme.colors.onSurfaceVariant, marginTop: 2 },
    content: { 
      flex: 1,
      maxHeight: 400, // Limit content height for better modal appearance
    },
    contentContainer: {
      padding: 20,
      paddingTop: 10,
    },
    actions: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outlineVariant,
      gap: 12,
      backgroundColor: theme.colors.surface,
    },
    actionButton: { flex: 1 },
    actionButtonContent: { paddingVertical: 8 },
    saveButton: { flex: 1.2 },
    noFormText: {
      color: theme.colors.onSurface,
      textAlign: 'center',
      marginTop: 20,
    },
  });

export default StepConfigModal;