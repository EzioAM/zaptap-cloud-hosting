import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Card, IconButton, Chip, Menu } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { AutomationData } from '../../types';
import { ShareAutomationModal } from '../sharing/ShareAutomationModal';

interface AutomationCardProps {
  automation: AutomationData;
  onPress?: () => void;
  onRun?: () => void;
  onShare?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onLocationTrigger?: () => void;
  onPublish?: () => void;
  showActions?: boolean;
  compact?: boolean;
}

export const AutomationCard: React.FC<AutomationCardProps> = ({
  automation,
  onPress,
  onRun,
  onShare,
  onEdit,
  onDelete,
  onLocationTrigger,
  onPublish,
  showActions = true,
  compact = false,
}) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleShare = () => {
    if (onShare) {
      onShare();
    } else {
      setShowShareModal(true);
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'productivity': 'briefcase',
      'smart-home': 'home-automation',
      'health': 'heart',
      'communication': 'message',
      'emergency': 'alert-circle',
      'entertainment': 'movie',
      'finance': 'cash',
      'travel': 'airplane',
      'education': 'school',
      'other': 'dots-horizontal',
    };
    return icons[category] || 'dots-horizontal';
  };

  const getExecutionColor = (count: number) => {
    if (count === 0) return '#999';
    if (count < 10) return '#4CAF50';
    if (count < 50) return '#2196F3';
    return '#FF9800';
  };

  return (
    <>
      <Card 
        style={[styles.card, compact && styles.compactCard]}
        onPress={onPress}
      >
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Icon 
                name={getCategoryIcon(automation.category || 'other')} 
                size={20} 
                color="#6200ee" 
                style={styles.categoryIcon}
              />
              <Text style={styles.title} numberOfLines={1}>
                {automation.title}
              </Text>
            </View>
            
            {showActions && (
              <View style={styles.actions}>
                {onRun && (
                  <IconButton
                    icon="play"
                    size={20}
                    onPress={(e) => {
                      e.stopPropagation();
                      onRun();
                    }}
                    style={styles.actionButton}
                  />
                )}
                
                <IconButton
                  icon="share-variant"
                  size={20}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleShare();
                  }}
                  style={styles.actionButton}
                />
                
                {!compact && (
                  <Menu
                    visible={showMenu}
                    onDismiss={() => setShowMenu(false)}
                    anchor={
                      <IconButton
                        icon="dots-vertical"
                        size={20}
                        onPress={(e) => {
                          e.stopPropagation();
                          setShowMenu(true);
                        }}
                        style={styles.actionButton}
                      />
                    }
                  >
                    {onEdit && (
                      <Menu.Item 
                        onPress={() => {
                          setShowMenu(false);
                          onEdit();
                        }} 
                        title="Edit" 
                        leadingIcon="pencil"
                      />
                    )}
                    {onLocationTrigger && (
                      <Menu.Item 
                        onPress={() => {
                          setShowMenu(false);
                          onLocationTrigger();
                        }} 
                        title="Location Triggers" 
                        leadingIcon="map-marker"
                      />
                    )}
                    {!automation.is_public && onPublish && (
                      <Menu.Item 
                        onPress={() => {
                          setShowMenu(false);
                          onPublish();
                        }} 
                        title="Publish to Gallery" 
                        leadingIcon="earth"
                      />
                    )}
                    {onDelete && (
                      <Menu.Item 
                        onPress={() => {
                          setShowMenu(false);
                          onDelete();
                        }} 
                        title="Delete" 
                        leadingIcon="delete"
                      />
                    )}
                  </Menu>
                )}
              </View>
            )}
          </View>

          {automation.description && !compact && (
            <Text style={styles.description} numberOfLines={2}>
              {automation.description}
            </Text>
          )}

          <View style={styles.footer}>
            <View style={styles.chips}>
              {automation.steps && (
                <Chip 
                  icon="playlist-check" 
                  style={styles.chip}
                  textStyle={styles.chipText}
                >
                  {automation.steps.length} steps
                </Chip>
              )}
              
              {automation.execution_count !== undefined && (
                <Chip 
                  icon="play-circle" 
                  style={[styles.chip, { borderColor: getExecutionColor(automation.execution_count) }]}
                  textStyle={[styles.chipText, { color: getExecutionColor(automation.execution_count) }]}
                >
                  {automation.execution_count} runs
                </Chip>
              )}

              {automation.is_public && (
                <Chip 
                  icon="earth" 
                  style={[styles.chip, styles.publicChip]}
                  textStyle={styles.chipText}
                >
                  Public
                </Chip>
              )}
            </View>

            {automation.tags && automation.tags.length > 0 && !compact && (
              <View style={styles.tags}>
                {automation.tags.slice(0, 3).map((tag, index) => (
                  <Text key={index} style={styles.tag}>
                    #{tag}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </Card.Content>
      </Card>

      <ShareAutomationModal
        visible={showShareModal}
        automation={automation}
        onClose={() => setShowShareModal(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    elevation: 2,
  },
  compactCard: {
    marginHorizontal: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    marginRight: -8,
  },
  actionButton: {
    margin: 0,
  },
  footer: {
    marginTop: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  chip: {
    marginRight: 8,
    marginBottom: 4,
    height: 24,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: 'transparent',
  },
  chipText: {
    fontSize: 11,
    marginVertical: 0,
    marginHorizontal: 0,
  },
  publicChip: {
    borderColor: '#4CAF50',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    fontSize: 12,
    color: '#999',
    marginRight: 8,
  },
});