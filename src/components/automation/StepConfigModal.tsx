import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Portal, Modal, Text, Button, IconButton, useTheme, MD3Theme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
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
  } catch (e) {
    formNode = <Text>Error loading form</Text>;
    if (__DEV__) {
      console.error('renderConfigForm error:', e);
    }
  }

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onCancel}
        contentContainerStyle={styles.modalContainer}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
          keyboardVerticalOffset={insets.top + 64}
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
              {formNode ?? (
                <Text style={styles.noFormText}>
                  No configuration form available for "{stepType}".
                </Text>
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
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
};

const makeStyles = (theme: MD3Theme, insets: { top: number; bottom: number }) =>
  StyleSheet.create({
    flex: { flex: 1 },
    modalContainer: {
      margin: 0,
      flex: 1,
      // Use theme surfaces instead of hard-coded white
      backgroundColor: theme.colors.surface,
      paddingTop: insets.top,
      paddingBottom: Math.max(insets.bottom, 12),
    },
    modalContent: {
      flex: 1,
      backgroundColor: theme.colors.surface,
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
    content: { flex: 1 },
    contentContainer: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      gap: 12,
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