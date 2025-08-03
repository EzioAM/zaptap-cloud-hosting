import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  Image,
  Dimensions,
} from 'react-native';
import { Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_NAME, APP_TAGLINE } from '../../constants/version';

const { width, height } = Dimensions.get('window');

export function WelcomeScreen() {
  const navigation = useNavigation();

  const handleGetStarted = async () => {
    // Mark onboarding as seen
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    navigation.navigate('TutorialScreen' as never);
  };

  const handleSkip = async () => {
    // Mark onboarding as seen and go to main app
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' as never }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.iconBackground}>
            <MaterialCommunityIcons name="lightning-bolt" size={80} color="#fff" />
          </View>
          <Text style={styles.appName}>{APP_NAME}</Text>
          <Text style={styles.tagline}>{APP_TAGLINE}</Text>
        </View>

        <View style={styles.featuresContainer}>
          <View style={styles.feature}>
            <MaterialCommunityIcons name="robot" size={32} color="#6200ee" />
            <Text style={styles.featureTitle}>Build Automations</Text>
            <Text style={styles.featureDescription}>
              Create powerful workflows with our intuitive builder
            </Text>
          </View>

          <View style={styles.feature}>
            <MaterialCommunityIcons name="share-variant" size={32} color="#6200ee" />
            <Text style={styles.featureTitle}>Share Instantly</Text>
            <Text style={styles.featureDescription}>
              Share via QR codes, NFC tags, or simple links
            </Text>
          </View>

          <View style={styles.feature}>
            <MaterialCommunityIcons name="view-gallery" size={32} color="#6200ee" />
            <Text style={styles.featureTitle}>Discover Templates</Text>
            <Text style={styles.featureDescription}>
              Browse community automations and templates
            </Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleGetStarted}
            style={styles.getStartedButton}
            labelStyle={styles.getStartedButtonText}
          >
            Get Started
          </Button>
          <Button
            mode="text"
            onPress={handleSkip}
            style={styles.skipButton}
            labelStyle={styles.skipButtonText}
          >
            Skip
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  iconBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 18,
    color: '#666',
  },
  featuresContainer: {
    marginTop: 40,
  },
  feature: {
    alignItems: 'center',
    marginBottom: 32,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  buttonContainer: {
    marginTop: 40,
  },
  getStartedButton: {
    paddingVertical: 8,
    backgroundColor: '#6200ee',
  },
  getStartedButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    marginTop: 12,
  },
  skipButtonText: {
    fontSize: 14,
    color: '#666',
  },
});