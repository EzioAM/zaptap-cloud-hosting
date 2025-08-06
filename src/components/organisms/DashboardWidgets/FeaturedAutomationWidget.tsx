import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeTheme } from '../../common/ThemeFallbackWrapper';
import { useGetFeaturedAutomationQuery } from '../../../store/api/dashboardApi';
import { useNavigation } from '@react-navigation/native';
import EnhancedLoadingSkeleton from '../../common/EnhancedLoadingSkeleton';

export const FeaturedAutomationWidget: React.FC = () => {
  const theme = useSafeTheme();
  const navigation = useNavigation();
  const { data: featured, isLoading, error } = useGetFeaturedAutomationQuery();

  const categoryColors: Record<string, string[]> = {
    'Productivity': ['#6366F1', '#818CF8'],
    'Smart Home': ['#10B981', '#34D399'],
    'Social': ['#EC4899', '#F472B6'],
    'Health': ['#F59E0B', '#FCD34D'],
    'Entertainment': ['#8B5CF6', '#A78BFA'],
    'Finance': ['#06B6D4', '#67E8F9'],
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <EnhancedLoadingSkeleton 
          variant="automation" 
          count={1} 
          showAnimation={true}
          height={180}
        />
      </View>
    );
  }

  if (error || !featured) {
    // Return placeholder content if no featured automation
    const placeholderData = {
      id: '1',
      title: 'Morning Routine',
      description: 'Start your day right with automated tasks',
      category: 'Productivity',
      user: { name: 'ZapTap Team' },
      likesCount: 234,
      downloadsCount: 567,
    };
    
    const gradient = categoryColors[placeholderData.category] || ['#6366F1', '#818CF8'];

    return (
      <View style={styles.container}>
        <LinearGradient
          colors={gradient}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <TouchableOpacity
            style={styles.content}
            onPress={() => navigation.navigate('DiscoverTab' as never)}
            activeOpacity={0.9}
          >
            <View style={styles.header}>
              <View style={styles.badge}>
                <MaterialCommunityIcons 
                  name="star" 
                  size={16} 
                  color={gradient[0]} 
                />
                <Text style={styles.badgeText}>Featured</Text>
              </View>
              <MaterialCommunityIcons 
                name="trending-up" 
                size={20} 
                color="rgba(255, 255, 255, 0.8)" 
              />
            </View>

            <Text style={styles.title} numberOfLines={2}>
              {placeholderData.title}
            </Text>
            <Text style={styles.description} numberOfLines={2}>
              {placeholderData.description}
            </Text>

            <View style={styles.footer}>
              <View style={styles.stats}>
                <View style={styles.stat}>
                  <MaterialCommunityIcons 
                    name="heart" 
                    size={16} 
                    color="rgba(255, 255, 255, 0.9)" 
                  />
                  <Text style={styles.statText}>{placeholderData.likesCount}</Text>
                </View>
                <View style={styles.stat}>
                  <MaterialCommunityIcons 
                    name="download" 
                    size={16} 
                    color="rgba(255, 255, 255, 0.9)" 
                  />
                  <Text style={styles.statText}>{placeholderData.downloadsCount}</Text>
                </View>
              </View>
              <View style={styles.tryButton}>
                <Text style={styles.tryButtonText}>Try it</Text>
              </View>
            </View>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  const gradient = categoryColors[featured.category] || ['#6366F1', '#818CF8'];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradient}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity
          style={styles.content}
          onPress={() => navigation.navigate('AutomationDetails' as never, { automationId: featured.id } as never)}
          activeOpacity={0.9}
        >
          <View style={styles.header}>
            <View style={styles.badge}>
              <MaterialCommunityIcons 
                name="star" 
                size={16} 
                color={gradient[0]} 
              />
              <Text style={styles.badgeText}>Featured</Text>
            </View>
            <MaterialCommunityIcons 
              name="trending-up" 
              size={20} 
              color="rgba(255, 255, 255, 0.8)" 
            />
          </View>

          <Text style={styles.title} numberOfLines={2}>
            {featured.title}
          </Text>
          <Text style={styles.description} numberOfLines={2}>
            {featured.description}
          </Text>

          <View style={styles.footer}>
            <View style={styles.stats}>
              <View style={styles.stat}>
                <MaterialCommunityIcons 
                  name="heart" 
                  size={16} 
                  color="rgba(255, 255, 255, 0.9)" 
                />
                <Text style={styles.statText}>{featured.likesCount}</Text>
              </View>
              <View style={styles.stat}>
                <MaterialCommunityIcons 
                  name="download" 
                  size={16} 
                  color="rgba(255, 255, 255, 0.9)" 
                />
                <Text style={styles.statText}>{featured.downloadsCount}</Text>
              </View>
            </View>
            <View style={styles.tryButton}>
              <Text style={styles.tryButtonText}>Try it</Text>
            </View>
          </View>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  loadingContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    borderRadius: 16,
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    color: '#374151',
    marginLeft: 4,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 20,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stats: {
    flexDirection: 'row',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 4,
    fontWeight: '500',
  },
  tryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default FeaturedAutomationWidget;