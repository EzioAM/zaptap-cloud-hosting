import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Portal,
  Modal,
  Text,
  Button,
  Card,
  IconButton,
  ActivityIndicator,
  Divider,
  TextInput,
  Avatar,
  Menu,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { CommentsService, AutomationComment } from '../../services/comments/CommentsService';
import { AutomationData } from '../../types';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

interface CommentsModalProps {
  visible: boolean;
  onDismiss: () => void;
  automation: AutomationData;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({
  visible,
  onDismiss,
  automation,
}) => {
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [comments, setComments] = useState<AutomationComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);

  const isOwner = user?.id === automation.created_by;

  useEffect(() => {
    if (visible) {
      loadComments();
    }
  }, [visible]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const data = await CommentsService.getComments(automation.id);
      setComments(data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadComments();
    setRefreshing(false);
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return;

    setSubmitting(true);
    try {
      const comment = await CommentsService.addComment(automation.id, newComment.trim());
      if (comment) {
        setComments([comment, ...comments]);
        setNewComment('');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!replyText.trim() || !user) return;

    setSubmitting(true);
    try {
      const reply = await CommentsService.addComment(automation.id, replyText.trim(), parentId);
      if (reply) {
        // Add reply to parent comment
        const updatedComments = comments.map(comment => {
          if (comment.id === parentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), reply],
            };
          }
          return comment;
        });
        setComments(updatedComments);
        setReplyText('');
        setReplyingTo(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      const isLiked = await CommentsService.toggleCommentLike(commentId);
      
      // Update comment like status locally
      const updateCommentLike = (comments: AutomationComment[]): AutomationComment[] => {
        return comments.map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              is_liked_by_user: isLiked,
              likes_count: isLiked ? comment.likes_count + 1 : comment.likes_count - 1,
            };
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: updateCommentLike(comment.replies),
            };
          }
          return comment;
        });
      };

      setComments(updateCommentLike(comments));
    } catch (error) {
      Alert.alert('Error', 'Failed to like comment');
    }
  };

  const handleDeleteComment = (commentId: string) => {
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
              const success = await CommentsService.deleteComment(commentId);
              if (success) {
                await loadComments(); // Reload to update the UI
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete comment');
            }
          },
        },
      ]
    );
  };

  const handlePinComment = async (commentId: string) => {
    try {
      const isPinned = await CommentsService.toggleCommentPin(commentId, automation.id);
      await loadComments(); // Reload to update pin status
    } catch (error) {
      Alert.alert('Error', 'Failed to pin comment');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderComment = (comment: AutomationComment, isReply = false) => (
    <View key={comment.id} style={[styles.commentContainer, isReply && styles.replyContainer]}>
      {comment.is_pinned && (
        <View style={styles.pinnedBadge}>
          <Icon name="pin" size={12} color="#ff9800" />
          <Text style={styles.pinnedText}>Pinned</Text>
        </View>
      )}
      
      <View style={styles.commentHeader}>
        <Avatar.Text 
          size={32} 
          label={comment.user?.display_name?.charAt(0) || 'U'} 
          style={styles.avatar}
        />
        <View style={styles.commentInfo}>
          <Text style={styles.userName}>{comment.user?.display_name || 'Anonymous'}</Text>
          <Text style={styles.commentDate}>{formatDate(comment.created_at)}</Text>
        </View>
        
        <Menu
          visible={menuVisible === comment.id}
          onDismiss={() => setMenuVisible(null)}
          anchor={
            <IconButton
              icon="dots-vertical"
              size={16}
              onPress={() => setMenuVisible(comment.id)}
            />
          }
        >
          {user?.id === comment.user_id && (
            <Menu.Item
              onPress={() => {
                setMenuVisible(null);
                handleDeleteComment(comment.id);
              }}
              title="Delete"
              leadingIcon="delete"
            />
          )}
          {isOwner && !isReply && (
            <Menu.Item
              onPress={() => {
                setMenuVisible(null);
                handlePinComment(comment.id);
              }}
              title={comment.is_pinned ? "Unpin" : "Pin"}
              leadingIcon="pin"
            />
          )}
        </Menu>
      </View>

      <Text style={styles.commentText}>{comment.content}</Text>
      {comment.is_edited && (
        <Text style={styles.editedText}>• Edited</Text>
      )}

      <View style={styles.commentActions}>
        <IconButton
          icon={comment.is_liked_by_user ? "heart" : "heart-outline"}
          size={16}
          iconColor={comment.is_liked_by_user ? "#f44336" : "#666"}
          onPress={() => handleLikeComment(comment.id)}
        />
        <Text style={styles.likesCount}>{comment.likes_count}</Text>
        
        {!isReply && (
          <Button
            mode="text"
            compact
            onPress={() => setReplyingTo(comment.id === replyingTo ? null : comment.id)}
          >
            Reply
          </Button>
        )}
      </View>

      {replyingTo === comment.id && (
        <View style={styles.replyInput}>
          <TextInput
            mode="outlined"
            placeholder="Write a reply..."
            value={replyText}
            onChangeText={setReplyText}
            multiline
            style={styles.textInput}
          />
          <View style={styles.replyActions}>
            <Button onPress={() => setReplyingTo(null)}>Cancel</Button>
            <Button
              mode="contained"
              onPress={() => handleSubmitReply(comment.id)}
              disabled={!replyText.trim() || submitting}
              loading={submitting}
            >
              Reply
            </Button>
          </View>
        </View>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <View style={styles.repliesContainer}>
          {comment.replies.map(reply => renderComment(reply, true))}
        </View>
      )}
    </View>
  );

  const totalComments = comments.reduce((total, comment) => {
    return total + 1 + (comment.replies?.length || 0);
  }, 0);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <KeyboardAvoidingView 
          style={styles.modalContent}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Comments & Feedback</Text>
            <IconButton icon="close" size={24} onPress={onDismiss} />
          </View>
          
          <Text style={styles.modalSubtitle}>
            {totalComments} comment{totalComments !== 1 ? 's' : ''} on "{automation.title}"
          </Text>

          {user && (
            <Card style={styles.newCommentCard}>
              <Card.Content>
                <TextInput
                  mode="outlined"
                  placeholder="Share your thoughts..."
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                  numberOfLines={3}
                  style={styles.newCommentInput}
                />
                <View style={styles.newCommentActions}>
                  <Button
                    mode="contained"
                    onPress={handleSubmitComment}
                    disabled={!newComment.trim() || submitting}
                    loading={submitting}
                  >
                    Post Comment
                  </Button>
                </View>
              </Card.Content>
            </Card>
          )}

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
              <Text style={styles.loadingText}>Loading comments...</Text>
            </View>
          ) : (
            <ScrollView 
              style={styles.commentsContainer}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
              }
            >
              {comments.length > 0 ? (
                comments.map(comment => renderComment(comment))
              ) : (
                <View style={styles.emptyState}>
                  <Icon name="comment-text-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>No comments yet</Text>
                  <Text style={styles.emptySubtext}>
                    Be the first to share your thoughts about this automation
                  </Text>
                </View>
              )}
            </ScrollView>
          )}

          <Divider style={styles.divider} />
          
          <View style={styles.modalActions}>
            <Button onPress={onDismiss}>Close</Button>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    maxHeight: '85%',
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  newCommentCard: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  newCommentInput: {
    marginBottom: 12,
  },
  newCommentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  commentsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  commentContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  replyContainer: {
    marginLeft: 20,
    marginTop: 8,
    backgroundColor: '#fff',
    borderLeftWidth: 2,
    borderLeftColor: '#e0e0e0',
    paddingLeft: 12,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pinnedText: {
    fontSize: 12,
    color: '#ff9800',
    marginLeft: 4,
    fontWeight: '500',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    backgroundColor: '#2196f3',
  },
  commentInfo: {
    marginLeft: 8,
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  commentDate: {
    fontSize: 12,
    color: '#666',
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 4,
  },
  editedText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likesCount: {
    fontSize: 12,
    color: '#666',
    marginRight: 16,
  },
  replyInput: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  textInput: {
    marginBottom: 8,
  },
  replyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  repliesContainer: {
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  divider: {
    marginVertical: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});