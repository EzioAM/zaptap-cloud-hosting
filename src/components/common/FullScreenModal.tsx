import React from 'react';
import { Modal, View, StyleSheet, Dimensions } from 'react-native';

interface FullScreenModalProps {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
}

const { width, height } = Dimensions.get('window');

export const FullScreenModal: React.FC<FullScreenModalProps> = ({
  visible,
  onDismiss,
  children,
}) => {
  return (
    <Modal
      visible={visible}
      onRequestClose={onDismiss}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      transparent={false}
    >
      <View style={styles.container}>
        {children}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: width,
    height: height,
    backgroundColor: 'transparent',
  },
});