import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { useConnection } from '../../contexts/ConnectionContext';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { supabase } from '../../services/supabase/client';

interface Comment {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  content: string;
  parent_id?: string;
  automation_id?: string;
  automation_title?: string;
  created_at: string;
  updated_at: string;
  likes_count: number;
  user_has_liked?: boolean;
  replies?: Comment[];
  depth?: number;
}

const ModernCommentsScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { connectionState, checkConnection } = useConnection();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const styles = createStyles(theme);

  React.useEffect(() => {
    loadComments();
  }, []);

  const loadComments = async () => {
    if (!connectionState.isConnected) {
      setIsLoading(false);
      return;
    }

    try {
      // Load all top-level comments
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          users:user_id (
            name,
            avatar_url
          ),
          automations:automation_id (
            title
          )
        `)
        .is('parent_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map the data and load replies
      const commentsWithReplies = await Promise.all(
        (data || []).map(async (comment) => {
          const replies = await loadReplies(comment.id);
          return {
            id: comment.id,
            user_id: comment.user_id,
            user_name: comment.users?.name || 'Anonymous',
            user_avatar: comment.users?.avatar_url,
            content: comment.content,
            parent_id: comment.parent_id,
            automation_id: comment.automation_id,
            automation_title: comment.automations?.title || 'General Discussion',
            created_at: comment.created_at,
            updated_at: comment.updated_at,
            likes_count: comment.likes_count || 0,
            user_has_liked: false,
            replies,
            depth: 0,
          };
        })
      );

      setComments(commentsWithReplies);
    } catch (error) {
      console.error('Error loading comments:', error);
      Alert.alert('Error', 'Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  };

  const loadReplies = async (parentId: string, depth = 1): Promise<Comment[]> => {
    if (depth > 3) return []; // Limit nesting depth

    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          users:user_id (
            name,
            avatar_url
          )
        `)
        .eq('parent_id', parentId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const replies = await Promise.all(
        (data || []).map(async (reply) => {
          const nestedReplies = await loadReplies(reply.id, depth + 1);
          return {
            ...reply,
            user_name: reply.users?.name || 'Anonymous',
            user_avatar: reply.users?.avatar_url,
            likes_count: reply.likes_count || 0,
            user_has_liked: false,
            replies: nestedReplies,
            depth,
          };
        })
      );

      return replies;
    } catch (error) {
      console.error('Error loading replies:', error);
      return [];
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkConnection();
    
    if (connectionState.isConnected) {
      await loadComments();
    }
    
    setRefreshing(false);
  };

  const handleSubmitComment = async () => {
    if (!isAuthenticated) {
      Alert.alert('Sign In Required', 'Please sign in to comment');
      return;
    }

    if (!newComment.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    try {
      const commentData = {
        user_id: user!.id,
        content: newComment.trim(),
        parent_id: replyingTo?.id || null,
        automation_id: null, // General comments
      };

      const { data, error } = await supabase
        .from('comments')
        .insert(commentData)
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      const newCommentObj: Comment = {
        ...data,
        user_name: user!.name,
        user_avatar: user!.avatar_url,
        likes_count: 0,
        user_has_liked: false,
        replies: [],
        depth: replyingTo ? (replyingTo.depth || 0) + 1 : 0,
      };

      if (replyingTo) {
        // Add reply to parent comment
        setComments(prev => updateCommentReplies(prev, replyingTo.id, newCommentObj));
      } else {
        // Add new top-level comment
        setComments(prev => [newCommentObj, ...prev]);
      }

      setNewComment('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error posting comment:', error);
      Alert.alert('Error', 'Failed to post comment');
    }
  };

  const updateCommentReplies = (
    comments: Comment[], 
    parentId: string, 
    newReply: Comment
  ): Comment[] => {
    return comments.map(comment => {
      if (comment.id === parentId) {
        return {
          ...comment,
          replies: [...(comment.replies || []), newReply],
        };
      } else if (comment.replies) {
        return {
          ...comment,
          replies: updateCommentReplies(comment.replies, parentId, newReply),
        };
      }
      return comment;
    });
  };

  const handleLikeComment = async (commentId: string) => {
    if (!isAuthenticated) {
      Alert.alert('Sign In Required', 'Please sign in to like comments');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Toggle like
      const comment = findComment(comments, commentId);
      if (comment?.user_has_liked) {
        await supabase
          .from('comment_likes')
          .delete()
          .match({ comment_id: commentId, user_id: user!.id });
      } else {
        await supabase
          .from('comment_likes')
          .insert({ comment_id: commentId, user_id: user!.id });
      }

      // Update local state
      setComments(prev => updateCommentLike(prev, commentId));
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const findComment = (comments: Comment[], id: string): Comment | null => {
    for (const comment of comments) {
      if (comment.id === id) return comment;
      if (comment.replies) {
        const found = findComment(comment.replies, id);
        if (found) return found;
      }
    }
    return null;
  };

  const updateCommentLike = (comments: Comment[], commentId: string): Comment[] => {
    return comments.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          likes_count: comment.user_has_liked ? comment.likes_count - 1 : comment.likes_count + 1,
          user_has_liked: !comment.user_has_liked,
        };
      } else if (comment.replies) {
        return {
          ...comment,
          replies: updateCommentLike(comment.replies, commentId),
        };
      }
      return comment;
    });
  };

  const renderComment = (comment: Comment) => (
    <View 
      key={comment.id} 
      style={[
        styles.commentContainer,
        { marginLeft: (comment.depth || 0) * theme.spacing.lg }
      ]}
    >
      <View style={[styles.commentCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.commentHeader}>
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.avatarText}>
                {comment.user_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={[styles.userName, { color: theme.colors.text }]}>
                {comment.user_name}
              </Text>
              <Text style={[styles.commentDate, { color: theme.colors.textSecondary }]}>
                {new Date(comment.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
          
          {comment.automation_title && (
            <Text style={[styles.automationTag, { color: theme.colors.primary }]}>
              <MaterialCommunityIcons name="robot" size={12} /> {comment.automation_title}
            </Text>
          )}
        </View>

        <Text style={[styles.commentContent, { color: theme.colors.text }]}>
          {comment.content}
        </Text>

        <View style={styles.commentActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleLikeComment(comment.id)}
          >
            <MaterialCommunityIcons
              name={comment.user_has_liked ? "heart" : "heart-outline"}
              size={18}
              color={comment.user_has_liked ? theme.colors.error : theme.colors.textSecondary}
            />
            <Text style={[styles.actionText, { color: theme.colors.textSecondary }]}>
              {comment.likes_count}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setReplyingTo(comment)}
          >
            <MaterialCommunityIcons
              name="reply"
              size={18}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.actionText, { color: theme.colors.textSecondary }]}>
              Reply
            </Text>
          </TouchableOpacity>

          {comment.user_id === user?.id && (
            <>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => setEditingComment(comment)}
              >
                <MaterialCommunityIcons
                  name="pencil"
                  size={18}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleDeleteComment(comment.id)}
              >
                <MaterialCommunityIcons
                  name="delete"
                  size={18}
                  color={theme.colors.error}
                />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {comment.replies && comment.replies.map(reply => renderComment(reply))}
    </View>
  );

  const handleDeleteComment = async (commentId: string) => {
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
              await supabase
                .from('comments')
                .delete()
                .eq('id', commentId);

              // Remove from local state
              setComments(prev => removeComment(prev, commentId));
            } catch (error) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'Failed to delete comment');
            }
          }
        },
      ],
    );
  };

  const removeComment = (comments: Comment[], commentId: string): Comment[] => {
    return comments
      .filter(comment => comment.id !== commentId)
      .map(comment => ({
        ...comment,
        replies: comment.replies ? removeComment(comment.replies, commentId) : [],
      }));
  };

  // Filter comments by search query
  const filteredComments = comments.filter(comment => {
    const matchesSearch = searchQuery === '' || 
      comment.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comment.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comment.automation_title?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons
            name="loading"
            size={48}
            color={theme.colors.primary}
          />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading comments...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const showConnectionBanner = !connectionState.isConnected || connectionState.error;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Connection Status Banner */}
        {showConnectionBanner && (
          <TouchableOpacity 
            style={[styles.connectionBanner, { backgroundColor: theme.colors.error }]}
            onPress={checkConnection}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="wifi-off" size={20} color="#FFFFFF" />
            <Text style={styles.connectionBannerText}>
              {connectionState.error || 'No connection'}
            </Text>
            <MaterialCommunityIcons name="refresh" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons 
              name="arrow-left" 
              size={24} 
              color={theme.colors.text} 
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Comments ({comments.length})
          </Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}>
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color={theme.colors.textSecondary}
            />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="Search comments..."
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialCommunityIcons
                  name="close-circle"
                  size={18}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Comments List */}
        <FlatList
          data={filteredComments}
          renderItem={({ item }) => renderComment(item)}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          contentContainerStyle={styles.commentsList}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="comment-off"
                size={64}
                color={theme.colors.textSecondary}
              />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                No Comments Yet
              </Text>
              <Text style={[styles.emptyDescription, { color: theme.colors.textSecondary }]}>
                {!connectionState.isConnected 
                  ? 'Please check your internet connection' 
                  : 'Be the first to start a discussion!'}
              </Text>
            </View>
          }
        />

        {/* Comment Input */}
        {isAuthenticated && (
          <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface }]}>
            {replyingTo && (
              <View style={[styles.replyingToBar, { backgroundColor: theme.colors.primary + '20' }]}>
                <Text style={[styles.replyingToText, { color: theme.colors.primary }]}>
                  Replying to {replyingTo.user_name}
                </Text>
                <TouchableOpacity onPress={() => setReplyingTo(null)}>
                  <MaterialCommunityIcons
                    name="close"
                    size={20}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.commentInput, { color: theme.colors.text }]}
                placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
                placeholderTextColor={theme.colors.textSecondary}
                value={newComment}
                onChangeText={setNewComment}
                multiline
                maxLength={500}
              />
              <TouchableOpacity 
                style={[
                  styles.sendButton,
                  { 
                    backgroundColor: newComment.trim() 
                      ? theme.colors.primary 
                      : theme.colors.surfaceVariant 
                  }
                ]}
                onPress={handleSubmitComment}
                disabled={!newComment.trim()}
              >
                <MaterialCommunityIcons
                  name="send"
                  size={20}
                  color={newComment.trim() ? '#FFFFFF' : theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    connectionBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    connectionBannerText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    backButton: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: theme.typography.h2.fontSize,
      fontWeight: theme.typography.h2.fontWeight,
    },
    searchContainer: {
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      height: 48,
      borderRadius: theme.borderRadius.lg,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      marginLeft: theme.spacing.sm,
    },
    commentsList: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
    },
    commentContainer: {
      marginBottom: theme.spacing.sm,
    },
    commentCard: {
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      shadowColor: theme.colors.cardShadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 1,
    },
    commentHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.sm,
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: theme.borderRadius.round,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.sm,
    },
    avatarText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    userName: {
      fontSize: 14,
      fontWeight: '600',
    },
    commentDate: {
      fontSize: 12,
      marginTop: 2,
    },
    automationTag: {
      fontSize: 12,
      fontWeight: '500',
    },
    commentContent: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: theme.spacing.sm,
    },
    commentActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: theme.spacing.lg,
    },
    actionText: {
      fontSize: 13,
      marginLeft: theme.spacing.xs,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
      marginTop: theme.spacing.md,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: theme.spacing.xxl,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.sm,
    },
    emptyDescription: {
      fontSize: 14,
      textAlign: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    inputContainer: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
    },
    replyingToBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
      marginBottom: theme.spacing.sm,
    },
    replyingToText: {
      fontSize: 13,
      fontWeight: '500',
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    commentInput: {
      flex: 1,
      fontSize: 16,
      maxHeight: 100,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.lg,
      marginRight: theme.spacing.sm,
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.round,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

export default ModernCommentsScreen;