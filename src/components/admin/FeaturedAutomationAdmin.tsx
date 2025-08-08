import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeTheme } from '../common/ThemeFallbackWrapper';
import { useRotateFeaturedAutomationMutation, useGetFeaturedAutomationQuery } from '../../store/api/dashboardApi';
import * as Haptics from 'expo-haptics';

interface FeaturedAutomationAdminProps {
  onClose?: () => void;
}

export const FeaturedAutomationAdmin: React.FC<FeaturedAutomationAdminProps> = ({ onClose }) => {
  const theme = useSafeTheme();
  const { data: featured, isLoading, refetch } = useGetFeaturedAutomationQuery();
  const [rotateFeatured, { isLoading: isRotating }] = useRotateFeaturedAutomationMutation();
  const [showDetails, setShowDetails] = useState(false);

  const handleRotate = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await rotateFeatured().unwrap();
      Alert.alert('Success', 'Featured automation has been rotated!');
    } catch (error) {
      Alert.alert('Error', 'Failed to rotate featured automation');
    }
  };

  const handleRefresh = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await refetch();
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh data');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>
          Featured Automation Admin
        </Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
        )}
      </View>

      {/* Current Featured Automation */}
      <View style={[styles.section, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Current Featured
        </Text>
        
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
              Loading...
            </Text>
          </View>
        ) : featured ? (
          <View style={styles.automationInfo}>
            <View style={styles.automationHeader}>
              <Text style={[styles.automationTitle, { color: theme.colors.onSurface }]}>
                {featured.title}
              </Text>
              <View style={[styles.trendingBadge, { 
                backgroundColor: featured.isTrending ? '#10B981' : '#6B7280' 
              }]}>
                <MaterialCommunityIcons 
                  name={featured.isTrending ? "trending-up" : "minus"} 
                  size={12} 
                  color="white" 
                />
                <Text style={styles.trendingText}>
                  {featured.isTrending ? 'Trending' : 'Stable'}
                </Text>
              </View>
            </View>
            
            <Text style={[styles.automationDescription, { color: theme.colors.onSurfaceVariant }]}>
              {featured.description}
            </Text>
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="heart" size={16} color="#EC4899" />
                <Text style={[styles.statText, { color: theme.colors.onSurfaceVariant }]}>
                  {featured.likesCount}
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="download" size={16} color="#3B82F6" />
                <Text style={[styles.statText, { color: theme.colors.onSurfaceVariant }]}>
                  {featured.downloadsCount}
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="star" size={16} color="#F59E0B" />
                <Text style={[styles.statText, { color: theme.colors.onSurfaceVariant }]}>
                  {featured.rating?.toFixed(1) || 'N/A'}
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="chart-line" size={16} color="#10B981" />
                <Text style={[styles.statText, { color: theme.colors.onSurfaceVariant }]}>
                  {Math.round(featured.engagementScore)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.detailsToggle}
              onPress={() => setShowDetails(!showDetails)}
            >
              <Text style={[styles.detailsToggleText, { color: theme.colors.primary }]}>
                {showDetails ? 'Hide Details' : 'Show Details'}
              </Text>
              <MaterialCommunityIcons 
                name={showDetails ? "chevron-up" : "chevron-down"} 
                size={16} 
                color={theme.colors.primary} 
              />
            </TouchableOpacity>

            {showDetails && (
              <View style={[styles.detailsContainer, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.detailText, { color: theme.colors.onSurfaceVariant }]}>
                  <Text style={{ fontWeight: '600' }}>ID:</Text> {featured.id}
                </Text>
                <Text style={[styles.detailText, { color: theme.colors.onSurfaceVariant }]}>
                  <Text style={{ fontWeight: '600' }}>Author:</Text> {featured.author}
                </Text>
                <Text style={[styles.detailText, { color: theme.colors.onSurfaceVariant }]}>
                  <Text style={{ fontWeight: '600' }}>Category:</Text> {featured.category}
                </Text>
                <Text style={[styles.detailText, { color: theme.colors.onSurfaceVariant }]}>
                  <Text style={{ fontWeight: '600' }}>Last Featured:</Text> {featured.lastFeatured || 'Today'}
                </Text>
                <Text style={[styles.detailText, { color: theme.colors.onSurfaceVariant }]}>
                  <Text style={{ fontWeight: '600' }}>Engagement Score:</Text> {featured.engagementScore.toFixed(1)}
                </Text>
                {featured.tags && featured.tags.length > 0 && (
                  <Text style={[styles.detailText, { color: theme.colors.onSurfaceVariant }]}>
                    <Text style={{ fontWeight: '600' }}>Tags:</Text> {featured.tags.join(', ')}
                  </Text>
                )}
              </View>
            )}
          </View>
        ) : (
          <Text style={[styles.noDataText, { color: theme.colors.onSurfaceVariant }]}>
            No featured automation available
          </Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.refreshButton, { backgroundColor: theme.colors.surfaceVariant }]}
          onPress={handleRefresh}
          disabled={isLoading}
        >
          <MaterialCommunityIcons 
            name="refresh" 
            size={20} 
            color={theme.colors.onSurfaceVariant} 
          />
          <Text style={[styles.actionButtonText, { color: theme.colors.onSurfaceVariant }]}>
            Refresh
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.rotateButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleRotate}
          disabled={isRotating}
        >
          {isRotating ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <MaterialCommunityIcons name="rotate-right" size={20} color="white" />
          )}
          <Text style={[styles.actionButtonText, { color: 'white' }]}>
            {isRotating ? 'Rotating...' : 'Force Rotate'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Info Section */}
      <View style={[styles.infoSection, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Text style={[styles.infoTitle, { color: theme.colors.onSurface }]}>
          How It Works
        </Text>
        <Text style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]}>
          • Automations rotate daily based on engagement score{'\n'}
          • Score calculated from likes, downloads, rating, and recent activity{'\n'}
          • Trending automations get priority boost{'\n'}
          • Avoids featuring the same automation repeatedly{'\n'}
          • Falls back to high-quality samples when no data available
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  automationInfo: {
    gap: 12,
  },
  automationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  automationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 12,
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  trendingText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  automationDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  detailsToggleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailsContainer: {
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  detailText: {
    fontSize: 12,
    lineHeight: 16,
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
    padding: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  refreshButton: {
    flex: 0.4,
  },
  rotateButton: {
    flex: 0.6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoSection: {
    padding: 16,
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
  },
});

export default FeaturedAutomationAdmin;