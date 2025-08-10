import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';

const { width: screenWidth } = Dimensions.get('window');

interface GalleryScreenProps {
  navigation: any;
  route: any;
}

const GalleryScreenFixed: React.FC<GalleryScreenProps> = ({ navigation, route }) => {
  const theme = useSafeTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [automations, setAutomations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Load initial data
    loadAutomations();
  }, []);

  const loadAutomations = async () => {
    setIsLoading(true);
    try {
      // Simulate loading
      setTimeout(() => {
        setAutomations([]);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error loading automations:', error);
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAutomations().finally(() => setRefreshing(false));
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="robot-confused" size={80} color={theme.colors.text?.secondary || '#999'} />
      <Text style={[styles.emptyTitle, { color: theme.colors.text?.primary || '#000' }]}>
        No automations found
      </Text>
      <Text style={[styles.emptyText, { color: theme.colors.text?.secondary || '#666' }]}>
        Browse popular automations or create your own
      </Text>
      <TouchableOpacity
        style={[styles.createButton, { backgroundColor: theme.colors.brand?.primary || '#6200ee' }]}
        onPress={() => navigation.navigate('AutomationBuilder')}
      >
        <Text style={styles.createButtonText}>Create New</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background?.primary || '#F5F5F5' }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.brand?.primary || '#6200ee'} />
          <Text style={[styles.loadingText, { color: theme.colors.text?.secondary || '#666' }]}>
            Loading automations...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background?.primary || '#F5F5F5' }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface?.primary || '#FFFFFF' }]}>
        <Text style={[styles.title, { color: theme.colors.text?.primary || '#000' }]}>
          Automation Gallery
        </Text>
        
        {/* Search Bar */}
        <View style={[styles.searchBar, { 
          backgroundColor: theme.colors.surface?.secondary || '#F0F0F0',
          borderColor: theme.colors.border?.light || '#E0E0E0'
        }]}>
          <Icon name="magnify" size={20} color={theme.colors.text?.secondary || '#666'} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text?.primary || '#000' }]}
            placeholder="Search automations..."
            placeholderTextColor={theme.colors.text?.secondary || '#666'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Content */}
      {automations.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={automations}
          renderItem={({ item }) => (
            <View style={styles.automationItem}>
              <Text>{item}</Text>
            </View>
          )}
          keyExtractor={(item, index) => index.toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.brand?.primary || '#6200ee'}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  automationItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
});

export default GalleryScreenFixed;