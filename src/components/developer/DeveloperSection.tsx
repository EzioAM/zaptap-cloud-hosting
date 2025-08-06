import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface DeveloperSectionProps {
  navigation: any;
  theme: any;
}

export const DeveloperSection: React.FC<DeveloperSectionProps> = ({ navigation, theme }) => {
  const styles = createStyles(theme);

  const developerTools = [
    {
      id: 'developer-menu',
      title: 'Developer Menu',
      description: 'Access all developer tools',
      icon: 'code-braces',
      onPress: () => navigation.navigate('DeveloperMenu'),
    },
    {
      id: 'reviews',
      title: 'Reviews & Ratings',
      description: 'Manage automation reviews',
      icon: 'star-box-multiple',
      onPress: () => navigation.navigate('ModernReviews'),
    },
    {
      id: 'comments',
      title: 'Comments',
      description: 'View and moderate comments',
      icon: 'comment-multiple',
      onPress: () => navigation.navigate('ModernComments'),
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="shield-crown"
          size={24}
          color={theme?.colors?.primary || '#6200ee'}
        />
        <Text style={[styles.sectionTitle, { color: theme?.colors?.text || '#000' }]}>
          Developer Tools
        </Text>
      </View>
      
      {developerTools.map((tool) => (
        <TouchableOpacity
          key={tool.id}
          style={[styles.toolItem, { backgroundColor: theme?.colors?.surface || '#fff' }]}
          onPress={tool.onPress}
          activeOpacity={0.7}
        >
          <View style={styles.toolItemLeft}>
            <View style={[styles.iconContainer, { backgroundColor: (theme?.colors?.primary || '#6200ee') + '20' }]}>
              <MaterialCommunityIcons
                name={tool.icon as any}
                size={24}
                color="#FFFFFF"
              />
            </View>
            <View style={styles.toolInfo}>
              <Text style={[styles.toolTitle, { color: theme?.colors?.text || '#000' }]}>
                {tool.title}
              </Text>
              <Text style={[styles.toolDescription, { color: theme?.colors?.textSecondary || '#666' }]}>
                {tool.description}
              </Text>
            </View>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={theme?.colors?.textSecondary || '#666'}
          />
        </TouchableOpacity>
      ))}
      
      <View style={[styles.badge, { backgroundColor: (theme?.colors?.primary || '#6200ee') + '10' }]}>
        <Text style={[styles.badgeText, { color: theme?.colors?.primary || '#6200ee' }]}>
          Developer Mode Active
        </Text>
      </View>
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: theme?.spacing?.lg || 24,
      marginBottom: theme?.spacing?.xl || 32,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme?.spacing?.md || 16,
    },
    sectionTitle: {
      fontSize: theme?.typography?.h3?.fontSize || 24,
      fontWeight: theme?.typography?.h3?.fontWeight || 'bold',
      marginLeft: theme?.spacing?.sm || 8,
    },
    toolItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme?.spacing?.md || 16,
      borderRadius: theme?.borderRadius?.lg || 12,
      marginBottom: theme?.spacing?.sm || 8,
      shadowColor: theme?.colors?.cardShadow || '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 1,
    },
    toolItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: theme?.borderRadius?.md || 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme?.spacing?.md || 16,
    },
    toolInfo: {
      flex: 1,
    },
    toolTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    toolDescription: {
      fontSize: 13,
    },
    badge: {
      alignSelf: 'center',
      paddingHorizontal: theme?.spacing?.md || 16,
      paddingVertical: theme?.spacing?.xs || 4,
      borderRadius: theme?.borderRadius?.round || 20,
      marginTop: theme?.spacing?.md || 16,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '600',
    },
  });