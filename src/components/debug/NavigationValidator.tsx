/**
 * NavigationValidator Component
 * Phase 4: Visual navigation path testing and validation
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  SafeAreaView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeTheme } from '../common/ThemeFallbackWrapper';
import { EventLogger } from '../../utils/EventLogger';
import { 
  NAVIGATION_ROUTES, 
  NavigationRoute, 
  NavigationTestRunner,
  NavigationTestResult 
} from '../../navigation/__tests__/NavigationTest';

interface NavigationValidatorProps {
  visible: boolean;
  onClose: () => void;
}

export const NavigationValidator: React.FC<NavigationValidatorProps> = ({ visible, onClose }) => {
  const theme = useSafeTheme();
  const navigation = useNavigation();
  const [testResults, setTestResults] = useState<NavigationTestResult[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [expandedRoutes, setExpandedRoutes] = useState<Set<string>>(new Set());

  const categories = [
    { id: 'all', label: 'All Routes', icon: 'all-inclusive', color: '#6366F1' },
    { id: 'tab', label: 'Tab Routes', icon: 'view-dashboard', color: '#8B5CF6' },
    { id: 'stack', label: 'Stack Routes', icon: 'layers', color: '#EC4899' },
    { id: 'auth', label: 'Auth Routes', icon: 'lock', color: '#F59E0B' },
    { id: 'automation', label: 'Automation', icon: 'robot', color: '#10B981' },
    { id: 'settings', label: 'Settings', icon: 'cog', color: '#6B7280' },
    { id: 'utility', label: 'Utility', icon: 'tools', color: '#3B82F6' },
  ];

  const filteredRoutes = selectedCategory === 'all' 
    ? NAVIGATION_ROUTES 
    : NAVIGATION_ROUTES.filter(r => r.category === selectedCategory);

  const navigateToRoute = (route: NavigationRoute) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      EventLogger.info('NavigationValidator', `Navigating to: ${route.name}`);
      
      // Close the validator modal first
      onClose();
      
      // Navigate to the route
      setTimeout(() => {
        (navigation as any).navigate(route.path, route.params);
      }, 300);
    } catch (error) {
      EventLogger.error('NavigationValidator', `Failed to navigate to ${route.name}:`, error as Error);
      Alert.alert('Navigation Error', `Failed to navigate to ${route.name}`);
    }
  };

  const runTests = async () => {
    setIsRunningTests(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const testRunner = new NavigationTestRunner(navigation);
    const results = selectedCategory === 'all'
      ? await testRunner.runAllTests()
      : await testRunner.testCategory(selectedCategory as any);
    
    setTestResults(results);
    setIsRunningTests(false);
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const toggleRouteExpansion = (routeName: string) => {
    const newExpanded = new Set(expandedRoutes);
    if (newExpanded.has(routeName)) {
      newExpanded.delete(routeName);
    } else {
      newExpanded.add(routeName);
    }
    setExpandedRoutes(newExpanded);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const getStatusIcon = (status?: 'success' | 'error' | 'warning' | 'skipped') => {
    switch (status) {
      case 'success':
        return { name: 'check-circle', color: '#10B981' };
      case 'error':
        return { name: 'close-circle', color: '#EF4444' };
      case 'warning':
        return { name: 'alert-circle', color: '#F59E0B' };
      case 'skipped':
        return { name: 'skip-next-circle', color: '#6B7280' };
      default:
        return { name: 'circle-outline', color: theme.colors.text.tertiary };
    }
  };

  const getTestResult = (routeName: string): NavigationTestResult | undefined => {
    return testResults.find(r => r.route.name === routeName);
  };

  const renderRoute = (route: NavigationRoute) => {
    const isExpanded = expandedRoutes.has(route.name);
    const testResult = getTestResult(route.name);
    const statusIcon = getStatusIcon(testResult?.status);

    return (
      <View key={route.name} style={[styles.routeCard, { backgroundColor: theme.colors.surface.primary }]}>
        <TouchableOpacity
          style={styles.routeHeader}
          onPress={() => toggleRouteExpansion(route.name)}
          activeOpacity={0.7}
        >
          <View style={styles.routeInfo}>
            <MaterialCommunityIcons
              name={statusIcon.name as any}
              size={20}
              color={statusIcon.color}
              style={styles.statusIcon}
            />
            <View style={styles.routeText}>
              <Text style={[styles.routeName, { color: theme.colors.text.primary }]}>
                {route.name}
              </Text>
              <Text style={[styles.routePath, { color: theme.colors.text.secondary }]}>
                {route.path}
              </Text>
            </View>
          </View>
          <MaterialCommunityIcons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={theme.colors.text.secondary}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.routeDetails}>
            {route.testNotes && (
              <Text style={[styles.testNotes, { color: theme.colors.text.secondary }]}>
                {route.testNotes}
              </Text>
            )}
            
            {testResult && testResult.message && (
              <View style={[styles.testMessage, { 
                backgroundColor: testResult.status === 'error' ? '#FEE2E2' : 
                               testResult.status === 'warning' ? '#FEF3C7' : '#D1FAE5' 
              }]}>
                <Text style={styles.testMessageText}>{testResult.message}</Text>
              </View>
            )}

            <View style={styles.routeActions}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.colors.brand.primary }]}
                onPress={() => navigateToRoute(route)}
              >
                <MaterialCommunityIcons name="navigation" size={16} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Navigate</Text>
              </TouchableOpacity>

              {route.requiresAuth && (
                <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
                  <MaterialCommunityIcons name="lock" size={14} color="#F59E0B" />
                  <Text style={[styles.badgeText, { color: '#F59E0B' }]}>Auth Required</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        {/* Header */}
        <LinearGradient
          colors={['#6366F1', '#8B5CF6', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Navigation Validator</Text>
          <TouchableOpacity 
            style={styles.runButton} 
            onPress={runTests}
            disabled={isRunningTests}
          >
            <MaterialCommunityIcons 
              name={isRunningTests ? "loading" : "play-circle"} 
              size={24} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
        </LinearGradient>

        {/* Category Filters */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryContainer}
          contentContainerStyle={styles.categoryContent}
        >
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                selectedCategory === cat.id && { backgroundColor: cat.color },
                { borderColor: cat.color }
              ]}
              onPress={() => {
                setSelectedCategory(cat.id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <MaterialCommunityIcons
                name={cat.icon as any}
                size={16}
                color={selectedCategory === cat.id ? '#FFFFFF' : cat.color}
              />
              <Text style={[
                styles.categoryLabel,
                { color: selectedCategory === cat.id ? '#FFFFFF' : cat.color }
              ]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Stats Bar */}
        <View style={[styles.statsBar, { backgroundColor: theme.colors.surface.secondary }]}>
          <Text style={[styles.statsText, { color: theme.colors.text.primary }]}>
            {filteredRoutes.length} Routes
          </Text>
          {testResults.length > 0 && (
            <>
              <Text style={[styles.statsText, { color: '#10B981' }]}>
                ✓ {testResults.filter(r => r.status === 'success').length}
              </Text>
              <Text style={[styles.statsText, { color: '#EF4444' }]}>
                ✗ {testResults.filter(r => r.status === 'error').length}
              </Text>
              <Text style={[styles.statsText, { color: '#F59E0B' }]}>
                ⚠ {testResults.filter(r => r.status === 'warning').length}
              </Text>
            </>
          )}
        </View>

        {/* Routes List */}
        <ScrollView style={styles.routesList} showsVerticalScrollIndicator={false}>
          {filteredRoutes.map(renderRoute)}
          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  runButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryContainer: {
    maxHeight: 60,
    paddingVertical: 10,
  },
  categoryContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    gap: 4,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 16,
  },
  statsText: {
    fontSize: 14,
    fontWeight: '600',
  },
  routesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  routeCard: {
    borderRadius: 12,
    marginVertical: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIcon: {
    marginRight: 12,
  },
  routeText: {
    flex: 1,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '600',
  },
  routePath: {
    fontSize: 12,
    marginTop: 2,
  },
  routeDetails: {
    padding: 12,
    paddingTop: 0,
  },
  testNotes: {
    fontSize: 14,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  testMessage: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  testMessageText: {
    fontSize: 12,
  },
  routeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
});