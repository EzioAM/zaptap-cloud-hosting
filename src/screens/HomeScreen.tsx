import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { RoleService } from '../services/auth/RoleService';
import { APP_NAME, APP_TAGLINE } from '../constants/version';
import { VersionInfo } from '../components/common/VersionInfo';
import { AppIcon } from '../components/common/AppIcon';
import { SupabaseTestComponent } from '../components/debug/SupabaseTestComponent';
import { AutomationTestComponent } from '../components/debug/AutomationTestComponent';
import { EventLogger } from '../utils/EventLogger';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

export const HomeScreen = React.memo<HomeScreenProps>(({ navigation }) => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [refreshing, setRefreshing] = React.useState(false);
  const [hasDeveloperAccess, setHasDeveloperAccess] = React.useState(false);
  
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);
  
  // Check developer access when user changes
  React.useEffect(() => {
    if (isAuthenticated && user) {
      checkDeveloperAccess();
    } else {
      setHasDeveloperAccess(false);
    }
  }, [isAuthenticated, user]);
  
  const checkDeveloperAccess = async () => {
    try {
      const access = await RoleService.hasDeveloperAccess();
      setHasDeveloperAccess(access);
    } catch (error) {
      EventLogger.error('Home', 'Error checking developer access:', error as Error);
      setHasDeveloperAccess(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#6200ee']} // Android
            tintColor="#6200ee"  // iOS
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <AppIcon name="lightning" size={32} color="#6200ee" />
            <Text style={styles.title}>{APP_NAME}</Text>
          </View>
          <VersionInfo showButton={true} buttonStyle={styles.version} />
          <Text style={styles.subtitle}>{APP_TAGLINE}</Text>
        </View>
        
        <View style={styles.featureGrid}>
          <Pressable 
            style={styles.featureCard}
            onPress={() => navigation.navigate('AutomationBuilder')}
          >
            <AppIcon name="automation" size={48} color="#6200ee" style={styles.featureIcon} />
            <Text style={styles.featureTitle}>Build Automation</Text>
            <Text style={styles.featureDescription}>Create powerful workflows</Text>
          </Pressable>
          
          {isAuthenticated && (
            <Pressable 
              style={styles.featureCard}
              onPress={() => navigation.navigate('MyAutomations')}
            >
              <AppIcon name="myAutomations" size={48} color="#2196F3" style={styles.featureIcon} />
              <Text style={styles.featureTitle}>My Automations</Text>
              <Text style={styles.featureDescription}>Manage your workflows</Text>
            </Pressable>
          )}
          
          <Pressable 
            style={styles.featureCard}
            onPress={() => navigation.navigate('DiscoverTab')}
          >
            <AppIcon name="gallery" size={48} color="#FF9800" style={styles.featureIcon} />
            <Text style={styles.featureTitle}>Gallery</Text>
            <Text style={styles.featureDescription}>Discover shared automations</Text>
          </Pressable>
          
          <Pressable 
            style={styles.featureCard}
            onPress={() => navigation.navigate('Templates')}
          >
            <AppIcon name="templates" size={48} color="#4CAF50" style={styles.featureIcon} />
            <Text style={styles.featureTitle}>Templates</Text>
            <Text style={styles.featureDescription}>Start with pre-built flows</Text>
          </Pressable>
          
          {isAuthenticated && (
            <Pressable 
              style={styles.featureCard}
              onPress={() => navigation.navigate('LocationTriggers')}
            >
              <AppIcon name="locationTriggers" size={48} color="#F44336" style={styles.featureIcon} />
              <Text style={styles.featureTitle}>Location Triggers</Text>
              <Text style={styles.featureDescription}>Location-based automation</Text>
            </Pressable>
          )}
        </View>
        
        <View style={styles.authSection}>
          {!isAuthenticated ? (
            <View>
              <Text style={styles.authText}>Sign in to unlock all features</Text>
              <View style={styles.authButtons}>
                <Pressable 
                  style={styles.authButton}
                  onPress={() => navigation.navigate('SignIn')}
                >
                  <Text style={styles.authButtonText}>Sign In</Text>
                </Pressable>
                <Pressable 
                  style={[styles.authButton, styles.signUpButton]}
                  onPress={() => navigation.navigate('SignUp')}
                >
                  <Text style={styles.signUpButtonText}>Sign Up</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View>
              <Text style={styles.welcomeText}>Welcome back!</Text>
              {hasDeveloperAccess && (
                <Pressable 
                  style={styles.developerButton}
                  onPress={() => navigation.navigate('DeveloperMenu')}
                >
                  <View style={styles.developerButtonContent}>
                    <AppIcon name="developer" size={20} color="#4b5563" />
                    <Text style={styles.developerButtonText}>Developer Menu</Text>
                  </View>
                </Pressable>
              )}
            </View>
          )}
        </View>
        
        <View style={styles.status}>
          <Text style={styles.statusTitle}>System Status</Text>
          <View style={styles.statusItems}>
            <View style={styles.statusItem}>
              <AppIcon name="success" size={16} color="#4CAF50" />
              <Text style={styles.statusText}>Automation Engine</Text>
            </View>
            <View style={styles.statusItem}>
              <AppIcon name="success" size={16} color="#4CAF50" />
              <Text style={styles.statusText}>Cloud Storage</Text>
            </View>
            <View style={styles.statusItem}>
              <AppIcon name="success" size={16} color="#4CAF50" />
              <Text style={styles.statusText}>NFC & Location</Text>
            </View>
            {isAuthenticated && (
              <View style={styles.statusItem}>
                <AppIcon name="success" size={16} color="#4CAF50" />
                <Text style={styles.statusText}>User Authenticated</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Debug: Test Components (temporary) */}
        {__DEV__ && (
          <>
            <View style={styles.debugSection}>
              <View style={styles.debugTitleContainer}>
                <AppIcon name="developer" size={16} color="#374151" />
                <Text style={styles.debugTitle}>Database Connection Test</Text>
              </View>
              <SupabaseTestComponent />
            </View>
            
            <View style={[styles.debugSection, { backgroundColor: '#f0f8ff' }]}>
              <View style={styles.debugTitleContainer}>
                <AppIcon name="lightning" size={16} color="#1e40af" />
                <Text style={[styles.debugTitle, { color: '#1e40af' }]}>Automation Engine Test</Text>
              </View>
              <AutomationTestComponent />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  version: {
    marginVertical: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  featureCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    width: '48%',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureIcon: {
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  authSection: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  authText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  authButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  authButton: {
    backgroundColor: '#6200ee',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  authButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  signUpButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#6200ee',
  },
  signUpButtonText: {
    color: '#6200ee',
    fontSize: 16,
    fontWeight: '600',
  },
  welcomeText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  developerButton: {
    backgroundColor: '#f3f4f6',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  developerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
  },
  developerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  status: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  statusItems: {
    gap: 5,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  debugSection: {
    backgroundColor: '#f9fafb',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  debugTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
});