import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {
  Text,
  TouchableRipple,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import SafeIcon from '../../components/common/SafeIcon';
import { AutomationData, AutomationTrigger } from '../../types';
import TriggerManager from '../../components/triggers/TriggerManager';
import { locationTriggerService } from '../../services/triggers/LocationTriggerService';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';

const { width } = Dimensions.get('window');

interface LocationTriggersScreenProps {
  navigation: any;
  route?: {
    params?: {
      automation?: AutomationData;
    };
  };
}

const LocationTriggersScreen: React.FC<LocationTriggersScreenProps> = ({ navigation, route }) => {
  const [automation, setAutomation] = useState<AutomationData | null>(null);
  const [triggers, setTriggers] = useState<AutomationTrigger[]>([]);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const { user } = useSelector((state: RootState) => state.auth);
  const theme = useSafeTheme();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const cardAnimations = useRef([]).current;

  useEffect(() => {
    if (route?.params?.automation) {
      setAutomation(route.params.automation);
      setTriggers(route.params.automation.triggers || []);
    }
    
    checkLocationServices();
    startEntryAnimations();
  }, [route?.params?.automation]);

  useEffect(() => {
    startPulseAnimation();
  }, [triggers]);

  const startEntryAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const startPulseAnimation = () => {
    const activeLocationTriggers = getActiveLocationTriggers();
    if (activeLocationTriggers.length > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  };

  const animateCardEntry = (index: number) => {
    if (!cardAnimations[index]) {
      cardAnimations[index] = new Animated.Value(0);
    }
    
    Animated.spring(cardAnimations[index], {
      toValue: 1,
      tension: 100,
      friction: 8,
      delay: index * 100,
      useNativeDriver: true,
    }).start();
  };

  const checkLocationServices = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const enabled = await locationTriggerService.isLocationServicesEnabled();
    setIsLocationEnabled(enabled);
  };

  const handleTriggersChange = async (updatedTriggers: AutomationTrigger[]) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTriggers(updatedTriggers);
    
    if (automation) {
      // Update automation with new triggers
      const updatedAutomation = { ...automation, triggers: updatedTriggers };
      setAutomation(updatedAutomation);
      
      // Add location triggers to the location service
      for (const trigger of updatedTriggers) {
        if ((trigger.type === 'location_enter' || trigger.type === 'location_exit') && trigger.enabled) {
          await locationTriggerService.addLocationTrigger(updatedAutomation, trigger);
        }
      }
    }
  };

  const createDemoAutomation = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const demoAutomation: AutomationData = {
      id: `demo_${Date.now()}`,
      title: 'Demo Location Automation',
      description: 'A demo automation for testing location triggers',
      steps: [
        {
          id: 'demo-step-1',
          type: 'notification',
          title: 'Location Trigger Activated',
          enabled: true,
          config: {
            message: 'Your location-based automation has been triggered! 🎯'
          }
        }
      ],
      triggers: [],
      created_by: user?.id || 'demo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_public: false,
      category: 'tools',
      tags: ['demo', 'location'],
      execution_count: 0,
      average_rating: 0,
      rating_count: 0,
    };
    
    setAutomation(demoAutomation);
    setTriggers([]);
  };

  const getActiveLocationTriggers = () => {
    return triggers.filter(t => 
      (t.type === 'location_enter' || t.type === 'location_exit') && t.enabled
    );
  };

  // Custom Components
  const ModernCard: React.FC<{ children: React.ReactNode; style?: any; gradient?: boolean }> = ({ 
    children, 
    style, 
    gradient = false 
  }) => (
    <Animated.View 
      style={[
        {
          backgroundColor: theme.colors.surface.primary,
          borderRadius: 16,
          marginHorizontal: 16,
          marginVertical: 8,
          elevation: 8,
          shadowColor: theme.colors.shadow.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          overflow: 'hidden',
        },
        style
      ]}
    >
      {gradient && (
        <LinearGradient
          colors={['rgba(99, 102, 241, 0.1)', 'rgba(139, 92, 246, 0.05)']}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={{ padding: 20 }}>
        {children}
      </View>
    </Animated.View>
  );

  const ModernButton: React.FC<{ 
    title: string; 
    onPress: () => void; 
    variant?: 'primary' | 'secondary' | 'outlined'; 
    icon?: string;
    style?: any;
  }> = ({ title, onPress, variant = 'primary', icon, style }) => {
    const handlePress = async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
    };

    const backgroundColor = variant === 'primary' 
      ? theme.colors.brand.primary 
      : variant === 'secondary' 
      ? theme.colors.surface.secondary 
      : 'transparent';

    const borderColor = variant === 'outlined' ? theme.colors.brand.primary : 'transparent';

    return (
      <TouchableRipple
        onPress={handlePress}
        style={[
          {
            borderRadius: 12,
            overflow: 'hidden',
            borderWidth: variant === 'outlined' ? 1 : 0,
            borderColor,
          },
          style
        ]}
      >
        {variant === 'primary' ? (
          <LinearGradient
            colors={['#6366F1', '#8B5CF6', '#EC4899']}
            style={{
              paddingVertical: 16,
              paddingHorizontal: 24,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 52,
            }}
          >
            {icon && <SafeIcon name={icon} size={18} color="white" style={{ marginRight: 8 }} />}
            <Text style={{ 
              color: 'white', 
              fontSize: 16, 
              fontWeight: '600',
            }}>
              {title}
            </Text>
          </LinearGradient>
        ) : (
          <View style={{
            backgroundColor,
            paddingVertical: 16,
            paddingHorizontal: 24,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 52,
          }}>
            {icon && (
              <SafeIcon 
                name={icon} 
                size={18} 
                color={variant === 'outlined' ? theme.colors.brand.primary : theme.colors.text.primary} 
                style={{ marginRight: 8 }} 
              />
            )}
            <Text style={{ 
              color: variant === 'outlined' ? theme.colors.brand.primary : theme.colors.text.primary,
              fontSize: 16, 
              fontWeight: '600',
            }}>
              {title}
            </Text>
          </View>
        )}
      </TouchableRipple>
    );
  };

  const StatusChip: React.FC<{ 
    label: string; 
    icon: string; 
    active?: boolean; 
    pulse?: boolean; 
  }> = ({ label, icon, active = false, pulse = false }) => {
    const chipColor = active ? theme.colors.success?.primary || '#4CAF50' : theme.colors.surface.secondary;
    const textColor = active ? 'white' : theme.colors.text.secondary;

    return (
      <Animated.View
        style={[
          {
            backgroundColor: chipColor,
            borderRadius: 20,
            paddingHorizontal: 12,
            paddingVertical: 6,
            flexDirection: 'row',
            alignItems: 'center',
            marginRight: 8,
            marginBottom: 8,
          },
          pulse && active && {
            transform: [{ scale: pulseAnim }],
          }
        ]}
      >
        <SafeIcon name={icon} size={14} color={textColor} style={{ marginRight: 4 }} />
        <Text style={{ 
          color: textColor, 
          fontSize: 12, 
          fontWeight: '500' 
        }}>
          {label}
        </Text>
      </Animated.View>
    );
  };

  const handleBackPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  const handleInfoPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Location Triggers',
      'Set up automations that run automatically when you arrive at or leave specific locations. Requires location permissions.'
    );
  };

  const handleSelectAutomation = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('MyAutomations');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      {/* Gradient Header */}
      <LinearGradient
        colors={['#6366F1', '#8B5CF6', '#EC4899']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <SafeIcon name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Location Triggers</Text>
          <TouchableOpacity onPress={handleInfoPress} style={styles.infoButton}>
            <SafeIcon name="information" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          {/* Location Services Warning */}
          {!isLocationEnabled && (
            <ModernCard gradient style={{ backgroundColor: '#FFF3CD' }}>
              <View style={styles.warningContent}>
                <LinearGradient
                  colors={['#FF9800', '#F57C00']}
                  style={styles.warningIcon}
                >
                  <SafeIcon name="alert" size={20} color="white" />
                </LinearGradient>
                <View style={styles.warningText}>
                  <Text style={[styles.warningTitle, { color: theme.colors.warning?.primary || '#856404' }]}>
                    Location Services Disabled
                  </Text>
                  <Text style={[styles.warningDescription, { color: theme.colors.warning?.secondary || '#856404' }]}>
                    Location triggers require location services to be enabled on your device.
                  </Text>
                </View>
              </View>
              <ModernButton
                title="Refresh Status"
                onPress={checkLocationServices}
                variant="outlined"
                icon="refresh"
                style={{ marginTop: 12 }}
              />
            </ModernCard>
          )}

          {!automation ? (
            /* Empty State */
            <View style={styles.emptyStateContainer}>
              <ModernCard gradient style={styles.emptyStateCard}>
                <View style={styles.emptyStateContent}>
                  <LinearGradient
                    colors={['#6366F1', '#8B5CF6']}
                    style={styles.emptyStateIcon}
                  >
                    <SafeIcon name="robot" size={32} color="white" />
                  </LinearGradient>
                  
                  <Text style={[styles.emptyStateTitle, { color: theme.colors.text.primary }]}>
                    No Automation Selected
                  </Text>
                  <Text style={[styles.emptyStateDescription, { color: theme.colors.text.secondary }]}>
                    To set up location triggers, you need to select an automation first. 
                    You can also create a demo automation to test the functionality.
                  </Text>

                  <View style={styles.emptyStateActions}>
                    <ModernButton
                      title="Create Demo Automation"
                      onPress={createDemoAutomation}
                      icon="flask"
                      style={{ flex: 1, marginRight: 8 }}
                    />
                    <ModernButton
                      title="Select Automation"
                      onPress={handleSelectAutomation}
                      variant="outlined"
                      icon="folder"
                      style={{ flex: 1, marginLeft: 8 }}
                    />
                  </View>
                </View>
              </ModernCard>
            </View>
          ) : (
            <>
              {/* Automation Info Card */}
              <ModernCard gradient>
                <View style={styles.automationHeader}>
                  <LinearGradient
                    colors={['#6366F1', '#8B5CF6']}
                    style={styles.automationIconContainer}
                  >
                    <SafeIcon name="robot" size={20} color="white" />
                  </LinearGradient>
                  <View style={styles.automationInfo}>
                    <Text style={[styles.automationTitle, { color: theme.colors.text.primary }]}>
                      {automation.title}
                    </Text>
                    <Text style={[styles.automationDescription, { color: theme.colors.text.secondary }]}>
                      {automation.description}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.automationStats}>
                  <StatusChip
                    label={`${automation.steps.length} steps`}
                    icon="layers"
                  />
                  <StatusChip
                    label={`${triggers.length} triggers`}
                    icon="gesture-tap"
                  />
                  {getActiveLocationTriggers().length > 0 && (
                    <StatusChip
                      label={`${getActiveLocationTriggers().length} location active`}
                      icon="map-marker"
                      active
                      pulse
                    />
                  )}
                </View>
              </ModernCard>

              {/* Trigger Manager */}
              <View style={[styles.triggerManagerContainer, { 
                backgroundColor: theme.colors.surface.primary,
                shadowColor: theme.colors.shadow.primary,
              }]}>
                <TriggerManager
                  triggers={triggers}
                  onTriggersChange={handleTriggersChange}
                  automationId={automation.id}
                />
              </View>

              {/* Active Location Monitoring */}
              {getActiveLocationTriggers().length > 0 && (
                <ModernCard style={{ backgroundColor: '#e8f5e8' }}>
                  <LinearGradient
                    colors={['rgba(76, 175, 80, 0.1)', 'rgba(76, 175, 80, 0.05)']}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.monitoringHeader}>
                    <Animated.View style={[styles.pulsingDot, { transform: [{ scale: pulseAnim }] }]} />
                    <Text style={[styles.monitoringTitle, { color: theme.colors.success?.primary || '#2E7D32' }]}>
                      Active Location Monitoring
                    </Text>
                  </View>
                  
                  <Text style={[styles.monitoringDescription, { color: theme.colors.success?.secondary || '#2E7D32' }]}>
                    Your device is monitoring {getActiveLocationTriggers().length} location{getActiveLocationTriggers().length !== 1 ? 's' : ''} in the background.
                    The automation will run automatically when triggers are activated.
                  </Text>

                  <View style={styles.monitoringIndicator}>
                    <SafeIcon name="crosshairs-gps" size={16} color="#4CAF50" />
                    <Text style={[styles.monitoringText, { color: theme.colors.success?.primary || '#4CAF50' }]}>
                      Background monitoring active
                    </Text>
                  </View>

                  {/* Map-like visualization */}
                  <View style={styles.mapVisualization}>
                    {getActiveLocationTriggers().map((trigger, index) => (
                      <Animated.View 
                        key={trigger.id} 
                        style={[
                          styles.locationPin,
                          {
                            left: `${20 + (index * 25)}%`,
                            transform: [{ scale: pulseAnim }],
                          }
                        ]}
                      >
                        <LinearGradient
                          colors={['#4CAF50', '#66BB6A']}
                          style={styles.pinGradient}
                        >
                          <SafeIcon 
                            name={trigger.type === 'location_enter' ? 'login' : 'logout'} 
                            size={12} 
                            color="white" 
                          />
                        </LinearGradient>
                      </Animated.View>
                    ))}
                  </View>
                </ModernCard>
              )}
            </>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 8,
    paddingBottom: 32,
  },
  // Warning Card Styles
  warningContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  warningIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningText: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  warningDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Empty State Styles
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateCard: {
    marginHorizontal: 24,
  },
  emptyStateContent: {
    alignItems: 'center',
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  emptyStateActions: {
    flexDirection: 'row',
    width: '100%',
  },
  // Automation Card Styles
  automationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  automationIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  automationInfo: {
    flex: 1,
    marginLeft: 16,
  },
  automationTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  automationDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  automationStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  // Trigger Manager Container
  triggerManagerContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  // Monitoring Card Styles
  monitoringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pulsingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  monitoringTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  monitoringDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  monitoringIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  monitoringText: {
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Map Visualization
  mapVisualization: {
    height: 60,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  locationPin: {
    position: 'absolute',
    top: 20,
  },
  pinGradient: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LocationTriggersScreen;