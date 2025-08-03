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
          color={theme.colors.primary}
        />
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Developer Tools
        </Text>
      </View>
      
      {developerTools.map((tool) => (
        <TouchableOpacity
          key={tool.id}
          style={[styles.toolItem, { backgroundColor: theme.colors.surface }]}
          onPress={tool.onPress}
          activeOpacity={0.7}
        >
          <View style={styles.toolItemLeft}>
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
              <MaterialCommunityIcons
                name={tool.icon as any}
                size={24}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.toolInfo}>
              <Text style={[styles.toolTitle, { color: theme.colors.text }]}>
                {tool.title}
              </Text>
              <Text style={[styles.toolDescription, { color: theme.colors.textSecondary }]}>
                {tool.description}
              </Text>
            </View>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      ))}
      
      <View style={[styles.badge, { backgroundColor: theme.colors.primary + '10' }]}>
        <Text style={[styles.badgeText, { color: theme.colors.primary }]}>
          Developer Mode Active
        </Text>
      </View>
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    sectionTitle: {
      fontSize: theme.typography.h3.fontSize,
      fontWeight: theme.typography.h3.fontWeight,
      marginLeft: theme.spacing.sm,
    },
    toolItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing.sm,
      shadowColor: theme.colors.cardShadow,
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
      borderRadius: theme.borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
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
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.round,
      marginTop: theme.spacing.md,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '600',
    },
  });