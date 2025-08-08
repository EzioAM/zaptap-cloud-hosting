import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Updates from 'expo-updates';

export const UpdateDebugInfo: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<any>({});
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Get current update info
    setUpdateInfo({
      updateId: Updates.updateId,
      channel: Updates.channel,
      runtimeVersion: Updates.runtimeVersion,
      isEmbeddedLaunch: Updates.isEmbeddedLaunch,
      isEmergencyLaunch: Updates.isEmergencyLaunch,
    });
  }, []);

  const checkForUpdate = async () => {
    setIsChecking(true);
    try {
      const update = await Updates.checkForUpdateAsync();
      
      Alert.alert(
        'Update Check Result',
        `Available: ${update.isAvailable}\n` +
        `Manifest: ${JSON.stringify(update.manifest?.id || 'none', null, 2)}\n` +
        `Reason: ${update.reason || 'none'}`,
        [
          update.isAvailable ? {
            text: 'Download & Apply',
            onPress: async () => {
              await Updates.fetchUpdateAsync();
              await Updates.reloadAsync();
            }
          } : { text: 'OK' }
        ]
      );
    } catch (error: any) {
      Alert.alert('Update Check Error', error.message);
    } finally {
      setIsChecking(false);
    }
  };

  if (__DEV__) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Running in Dev Mode - Updates Disabled</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔍 EAS Update Debug Info</Text>
      <Text style={styles.info}>Update ID: {updateInfo.updateId || 'None'}</Text>
      <Text style={styles.info}>Channel: {updateInfo.channel || 'None'}</Text>
      <Text style={styles.info}>Runtime: {updateInfo.runtimeVersion || 'None'}</Text>
      <Text style={styles.info}>Embedded: {String(updateInfo.isEmbeddedLaunch)}</Text>
      
      <TouchableOpacity 
        style={[styles.button, isChecking && styles.buttonDisabled]}
        onPress={checkForUpdate}
        disabled={isChecking}
      >
        <Text style={styles.buttonText}>
          {isChecking ? 'Checking...' : 'Force Check for Updates'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#E65100',
  },
  info: {
    fontSize: 14,
    marginBottom: 4,
    color: '#424242',
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#FF6F00',
    padding: 12,
    borderRadius: 6,
    marginTop: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
