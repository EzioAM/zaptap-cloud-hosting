import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  Text,
  Pressable,
  Alert,
} from 'react-native';
import { Avatar, Card, Divider, List } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState, AppDispatch } from '../store';
import { signOut } from '../store/slices/authSlice';
import { APP_VERSION } from '../constants/version';
import { EventLogger } from '../utils/EventLogger';

export default function ProfileScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = React.useState(false);

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await dispatch(signOut()).unwrap();
            } catch (error) {
              EventLogger.error('Profile', 'Sign out error:', error as Error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (!isAuthenticated || !user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.message}>Please sign in to view your profile</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Profile Header */}
          <Card style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <Avatar.Icon 
                size={80} 
                icon="account" 
                style={styles.avatar}
              />
              <Text style={styles.userName}>{user.email}</Text>
              <Text style={styles.userRole}>Free Plan</Text>
            </View>
          </Card>

          {/* Quick Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Automations</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Executions</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Shares</Text>
            </View>
          </View>

          {/* Menu Items */}
          <Card style={styles.menuCard}>
            <List.Item
              title="Settings"
              description="App preferences and configuration"
              left={props => <List.Icon {...props} icon="cog" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('Settings' as never)}
            />
            <Divider />
            <List.Item
              title="My NFC Tags"
              description="Manage your NFC automations"
              left={props => <List.Icon {...props} icon="nfc" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => Alert.alert('Coming Soon', 'NFC tag management will be available soon!')}
            />
            <Divider />
            <List.Item
              title="Analytics"
              description="View your automation statistics"
              left={props => <List.Icon {...props} icon="chart-line" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => Alert.alert('Coming Soon', 'Analytics dashboard will be available soon!')}
            />
            <Divider />
            <List.Item
              title="Help & Support"
              description="Get help and contact support"
              left={props => <List.Icon {...props} icon="help-circle" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => Alert.alert('Help', 'Visit zaptap.cloud/help for support')}
            />
          </Card>

          {/* About Section */}
          <Card style={styles.menuCard}>
            <List.Item
              title="About Zaptap"
              description={`Version ${APP_VERSION}`}
              left={props => <List.Icon {...props} icon="information" />}
              onPress={() => Alert.alert('Zaptap', `Version ${APP_VERSION}\n\nAutomate Your World`)}
            />
            <Divider />
            <List.Item
              title="Privacy Policy"
              left={props => <List.Icon {...props} icon="shield-lock" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => Alert.alert('Privacy', 'Visit zaptap.cloud/privacy')}
            />
            <Divider />
            <List.Item
              title="Terms of Service"
              left={props => <List.Icon {...props} icon="file-document" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => Alert.alert('Terms', 'Visit zaptap.cloud/terms')}
            />
          </Card>

          {/* Sign Out Button */}
          <Pressable
            style={[styles.signOutButton, loading && styles.signOutButtonDisabled]}
            onPress={handleSignOut}
            disabled={loading}
          >
            <MaterialCommunityIcons name="logout" size={20} color="#ff5252" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  message: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 32,
  },
  profileCard: {
    marginBottom: 16,
    padding: 20,
  },
  profileHeader: {
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#6200ee',
    marginBottom: 12,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6200ee',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 16,
  },
  menuCard: {
    marginBottom: 16,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  signOutButtonDisabled: {
    opacity: 0.6,
  },
  signOutText: {
    color: '#ff5252',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});