import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  RefreshControl,
  View,
  Text,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useUnifiedTheme as useTheme } from '../../contexts/UnifiedThemeProvider';
import { theme } from '../../theme';
import {
  QuickStatsWidget,
  QuickActionsWidget,
  RecentActivityWidget,
  FeaturedAutomationWidget,
} from '../../components/organisms/DashboardWidgets';
import { Button } from '../../components/atoms';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

export const HomeScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { theme: currentTheme } = useTheme();
  const colors = theme.getColors(currentTheme);
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate refresh - in real app, this would refetch data
    await new Promise(resolve => setTimeout(resolve, 1500));
    setRefreshing(false);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <>
      <StatusBar 
        barStyle={currentTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background.primary}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.brand.primary}
              colors={[colors.brand?.primary || colors.primary || '#6200ee']}
            />
          }
        >
          {/* Hero Section */}
          <LinearGradient
            colors={[
              colors.brand?.primary || colors.primary || '#6200ee',
              colors.brand?.primaryDark || colors.primaryContainer || '#7c4dff'
            ]}
            style={styles.heroSection}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Animated.View 
              entering={FadeInDown.springify()}
              style={styles.heroContent}
            >
              <Text style={styles.greeting}>
                {getGreeting()}, {user?.name || 'Automator'}!
              </Text>
              <Text style={styles.heroSubtitle}>
                Let's make today more productive
              </Text>
              
              {!isAuthenticated && (
                <Button
                  variant="secondary"
                  size="medium"
                  label="Sign in to get started"
                  icon="login"
                  onPress={() => (navigation as any).navigate('SignIn')}
                  style={styles.heroButton}
                />
              )}
            </Animated.View>
            
            {/* Decorative elements */}
            <View style={styles.heroDecoration}>
              <MaterialCommunityIcons
                name="robot-excited"
                size={120}
                color="rgba(255, 255, 255, 0.1)"
                style={styles.heroIcon}
              />
            </View>
          </LinearGradient>

          {/* Widgets Section */}
          <View style={styles.widgetsContainer}>
            {isAuthenticated ? (
              <>
                {/* Quick Stats */}
                <QuickStatsWidget />

                {/* Quick Actions */}
                <QuickActionsWidget />

                {/* Featured Automation */}
                <FeaturedAutomationWidget />

                {/* Recent Activity */}
                <RecentActivityWidget />
              </>
            ) : (
              <View style={styles.guestContainer}>
                <MaterialCommunityIcons
                  name="lock"
                  size={64}
                  color={colors.text.tertiary}
                />
                <Text style={[styles.guestTitle, { color: colors.text.primary }]}>
                  Welcome to ZapTap
                </Text>
                <Text style={[styles.guestSubtitle, { color: colors.text.secondary }]}>
                  Sign in to access your automations and start being more productive
                </Text>
                <Button
                  variant="primary"
                  size="large"
                  label="Get Started"
                  icon="rocket-launch"
                  onPress={() => (navigation as any).navigate('SignIn')}
                  fullWidth
                  style={styles.guestButton}
                />
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroSection: {
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  heroContent: {
    zIndex: 1,
  },
  greeting: {
    ...theme.typography.displaySmall,
    color: '#FFFFFF',
    marginBottom: theme.spacing.xs,
  },
  heroSubtitle: {
    ...theme.typography.bodyLarge,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: theme.spacing.lg,
  },
  heroButton: {
    alignSelf: 'flex-start',
  },
  heroDecoration: {
    position: 'absolute',
    right: -30,
    bottom: -30,
  },
  heroIcon: {
    transform: [{ rotate: '-15deg' }],
  },
  widgetsContainer: {
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  guestContainer: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xxl,
  },
  guestTitle: {
    ...theme.typography.headlineLarge,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  guestSubtitle: {
    ...theme.typography.bodyLarge,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  guestButton: {
    marginTop: theme.spacing.md,
  },
});