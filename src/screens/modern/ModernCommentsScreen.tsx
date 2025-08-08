import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { supabase } from '../../services/supabase/client';
import * as Haptics from 'expo-haptics';

interface Comment {
  id: string;
  automation_id: string;
  automation_title?: string;
  user_id: string;
  user_name?: string;
  user_avatar?: string;
  content: string;
  created_at: string;
  updated_at?: string;
  likes?: number;
  replies?: Comment[];
  is_pinned?: boolean;
  is_verified?: boolean;
}

// Helper function to generate color from string
const getAvatarColor = (name: string = '') => {
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#96CEB4', // Green
    '#FECA57', // Yellow
    '#9B59B6', // Purple
    '#3498DB', // Sky Blue
    '#E74C3C', // Crimson
    '#1ABC9C', // Turquoise
    '#F39C12', // Orange
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

const ModernCommentsScreen: React.FC = () => {
  const theme = useSafeTheme();
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'pinned' | 'verified'>('all');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [replyText, setReplyText] = useState('');
  
  // Load comments from Supabase
  const loadComments = useCallback(async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('comments')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filterBy === 'pinned') {
        query = query.eq('is_pinned', true);
      } else if (filterBy === 'verified') {
        query = query.eq('is_verified', true);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // For demo purposes, create sample data if none exists
      const sampleComments: Comment[] = data?.length ? data : [
        {
          id: '1',
          automation_id: 'auto-1',
          automation_title: 'Smart Morning Routine',
          user_id: 'user-1',
          user_name: 'Alice Johnson',
          content: 'This automation changed my morning routine completely! Thank you!',
          created_at: new Date().toISOString(),
          likes: 24,
          is_pinned: true,
          is_verified: true,
          replies: [
            {
              id: '1-1',
              automation_id: 'auto-1',
              user_id: 'user-2',
              user_name: 'Developer',
              content: 'Glad you love it! Let me know if you need any customizations.',
              created_at: new Date(Date.now() - 3600000).toISOString(),
              likes: 5,
              is_verified: true,
            },
          ],
        },
        {
          id: '2',
          automation_id: 'auto-2',
          automation_title: 'Focus Mode Ultra',
          user_id: 'user-3',
          user_name: 'Bob Smith',
          content: 'Could you add support for Spotify integration?',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          likes: 12,
        },
        {
          id: '3',
          automation_id: 'auto-3',
          automation_title: 'Smart Home Control',
          user_id: 'user-4',
          user_name: 'Carol White',
          content: 'Works perfectly with my Philips Hue lights!',
          created_at: new Date(Date.now() - 172800000).toISOString(),
          likes: 8,
          is_verified: true,
        },
      ];
      
      setComments(sampleComments);
    } catch (error) {
      console.error('Error loading comments:', error);
      Alert.alert('Error', 'Failed to load comments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterBy]);
  
  useEffect(() => {
    loadComments();
  }, [loadComments]);
  
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadComments();
  }, [loadComments]);
  
  const handleLikeComment = useCallback(async (commentId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const comment = comments.find(c => c.id === commentId);
      if (comment) {
        const newLikes = (comment.likes || 0) + 1;
        
        const { error } = await supabase
          .from('comments')
          .update({ likes: newLikes })
          .eq('id', commentId);
        
        if (!error) {
          setComments(prev => prev.map(c => 
            c.id === commentId 
              ? { ...c, likes: newLikes }
              : c
          ));
        }
      }
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  }, [comments]);
  
  const handlePinComment = useCallback(async (commentId: string) => {
    try {
      const comment = comments.find(c => c.id === commentId);
      if (comment) {
        const newPinned = !comment.is_pinned;
        
        const { error } = await supabase
          .from('comments')
          .update({ is_pinned: newPinned })
          .eq('id', commentId);
        
        if (!error) {
          setComments(prev => prev.map(c => 
            c.id === commentId 
              ? { ...c, is_pinned: newPinned }
              : c
          ));
          Alert.alert('Success', newPinned ? 'Comment pinned' : 'Comment unpinned');
        }
      }
    } catch (error) {
      console.error('Error pinning comment:', error);
      Alert.alert('Error', 'Failed to pin comment');
    }
  }, [comments]);
  
  const handleDeleteComment = useCallback((commentId: string) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('comments')
                .delete()
                .eq('id', commentId);
              
              if (!error) {
                setComments(prev => prev.filter(c => c.id !== commentId));
                Alert.alert('Success', 'Comment deleted');
              }
            } catch (error) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'Failed to delete comment');
            }
          },
        },
      ]
    );
  }, []);
  
  const handleSendReply = useCallback(async () => {
    if (!replyText.trim() || !replyTo) return;
    
    try {
      const newReply: Comment = {
        id: `reply-${Date.now()}`,
        automation_id: replyTo.automation_id,
        user_id: user?.id || 'current-user',
        user_name: user?.user_metadata?.full_name || 'You',
        content: replyText,
        created_at: new Date().toISOString(),
        likes: 0,
      };
      
      // In a real app, save to Supabase
      // For demo, just update local state
      setComments(prev => prev.map(c => 
        c.id === replyTo.id 
          ? { ...c, replies: [...(c.replies || []), newReply] }
          : c
      ));
      
      setReplyText('');
      setReplyTo(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Error sending reply:', error);
      Alert.alert('Error', 'Failed to send reply');
    }
  }, [replyText, replyTo, user]);
  
  const filteredComments = comments.filter(comment => {
    const matchesSearch = !searchQuery || 
      comment.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comment.automation_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comment.user_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });
  
  const renderComment = ({ item }: { item: Comment }) => (
    <View style={[styles.commentCard, { backgroundColor: theme.colors.surface }]}>
      {item.is_pinned && (
        <View style={styles.pinnedBadge}>
          <MaterialCommunityIcons name="pin" size={14} color="#4CAF50" />
          <Text style={styles.pinnedText}>Pinned</Text>
        </View>
      )}
      
      <View style={styles.commentHeader}>
        <View style={styles.commentUser}>
          <LinearGradient
            colors={[getAvatarColor(item.user_name), getAvatarColor(item.user_name + '1')]}
            style={styles.avatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.avatarText}>
              {item.user_name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </LinearGradient>
          <View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: theme.colors.onSurface }]}>
                {item.user_name || 'Anonymous'}
              </Text>
              {item.is_verified && (
                <MaterialCommunityIcons 
                  name="check-decagram" 
                  size={16} 
                  color="#4CAF50" 
                />
              )}
            </View>
            <Text style={[styles.automationTitle, { color: theme.colors.onSurfaceVariant }]}>
              {item.automation_title || 'Unknown Automation'}
            </Text>
          </View>
        </View>
        
        <View style={styles.commentActions}>
          <TouchableOpacity onPress={() => handlePinComment(item.id)}>
            <MaterialCommunityIcons 
              name={item.is_pinned ? 'pin-off' : 'pin'} 
              size={20} 
              color={theme.colors.onSurfaceVariant} 
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteComment(item.id)}>
            <MaterialCommunityIcons 
              name="delete" 
              size={20} 
              color="#F44336" 
            />
          </TouchableOpacity>
        </View>
      </View>
      
      <Text style={[styles.commentContent, { color: theme.colors.onSurface }]}>
        {item.content}
      </Text>
      
      <View style={styles.commentFooter}>
        <TouchableOpacity 
          style={styles.likeButton}
          onPress={() => handleLikeComment(item.id)}
        >
          <MaterialCommunityIcons 
            name="thumb-up" 
            size={16} 
            color={theme.colors.onSurfaceVariant} 
          />
          <Text style={[styles.likeText, { color: theme.colors.onSurfaceVariant }]}>
            {item.likes || 0}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.replyButton}
          onPress={() => setReplyTo(item)}
        >
          <MaterialCommunityIcons 
            name="reply" 
            size={16} 
            color={theme.colors.primary} 
          />
          <Text style={[styles.replyButtonText, { color: theme.colors.primary }]}>
            Reply
          </Text>
        </TouchableOpacity>
        
        <Text style={[styles.commentDate, { color: theme.colors.onSurfaceVariant }]}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      
      {item.replies && item.replies.length > 0 && (
        <View style={styles.repliesContainer}>
          {item.replies.map(reply => (
            <View key={reply.id} style={[styles.replyCard, { backgroundColor: theme.colors.surfaceVariant }]}>
              <View style={styles.replyHeader}>
                <Text style={[styles.replyUserName, { color: theme.colors.onSurface }]}>
                  {reply.user_name}
                </Text>
                {reply.is_verified && (
                  <MaterialCommunityIcons 
                    name="check-decagram" 
                    size={14} 
                    color="#4CAF50" 
                  />
                )}
              </View>
              <Text style={[styles.replyContent, { color: theme.colors.onSurface }]}>
                {reply.content}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons 
            name="arrow-left" 
            size={24} 
            color={theme.colors.onSurface} 
          />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
          Comments
        </Text>
        
        <TouchableOpacity onPress={() => setFilterBy(
          filterBy === 'all' ? 'pinned' : filterBy === 'pinned' ? 'verified' : 'all'
        )}>
          <MaterialCommunityIcons 
            name="filter" 
            size={24} 
            color={theme.colors.onSurface} 
          />
        </TouchableOpacity>
      </View>
      
      <View style={[styles.searchBar, { backgroundColor: theme.colors.surfaceVariant }]}>
        <MaterialCommunityIcons 
          name="magnify" 
          size={20} 
          color={theme.colors.onSurfaceVariant} 
        />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.onSurface }]}
          placeholder="Search comments..."
          placeholderTextColor={theme.colors.onSurfaceVariant}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      <View style={[styles.filterBar, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.filterText, { color: theme.colors.onSurface }]}>
          Filter: {filterBy === 'all' ? 'All Comments' : filterBy === 'pinned' ? 'Pinned' : 'Verified'}
        </Text>
        <Text style={[styles.countText, { color: theme.colors.onSurfaceVariant }]}>
          {filteredComments.length} comments
        </Text>
      </View>
      
      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredComments}
            renderItem={renderComment}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons 
                  name="comment-remove" 
                  size={64} 
                  color={theme.colors.onSurfaceVariant} 
                />
                <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                  No comments found
                </Text>
              </View>
            }
          />
        )}
        
        {replyTo && (
          <View style={[styles.replyInput, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.replyHeader}>
              <Text style={[styles.replyingTo, { color: theme.colors.onSurfaceVariant }]}>
                Replying to {replyTo.user_name}
              </Text>
              <TouchableOpacity onPress={() => setReplyTo(null)}>
                <MaterialCommunityIcons 
                  name="close" 
                  size={20} 
                  color={theme.colors.onSurfaceVariant} 
                />
              </TouchableOpacity>
            </View>
            <View style={styles.replyInputContainer}>
              <TextInput
                style={[styles.replyTextInput, { color: theme.colors.onSurface }]}
                placeholder="Write a reply..."
                placeholderTextColor={theme.colors.onSurfaceVariant}
                value={replyText}
                onChangeText={setReplyText}
                multiline
              />
              <TouchableOpacity 
                style={[styles.sendButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleSendReply}
              >
                <MaterialCommunityIcons name="send" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    padding: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  countText: {
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  commentCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    marginBottom: 8,
    gap: 4,
  },
  pinnedText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  commentUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  automationTitle: {
    fontSize: 12,
    marginTop: 2,
  },
  commentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  commentContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  commentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeText: {
    fontSize: 12,
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  replyButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  commentDate: {
    fontSize: 12,
    marginLeft: 'auto',
  },
  repliesContainer: {
    marginTop: 12,
    marginLeft: 40,
    gap: 8,
  },
  replyCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  replyUserName: {
    fontSize: 14,
    fontWeight: '500',
  },
  replyContent: {
    fontSize: 13,
    lineHeight: 18,
  },
  replyInput: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  replyingTo: {
    fontSize: 12,
    marginBottom: 8,
  },
  replyInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  replyTextInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
});

export default ModernCommentsScreen;