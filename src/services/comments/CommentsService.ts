import { supabase } from '../supabase/client';
import { EventLogger } from '../../utils/EventLogger';

export interface AutomationComment {
  id: string;
  automation_id: string;
  parent_comment_id: string | null;
  user_id: string;
  content: string;
  is_edited: boolean;
  is_pinned: boolean;
  likes_count: number;
  created_at: string;
  updated_at: string;
  user?: {
    display_name: string;
    email: string;
    avatar_url?: string;
  };
  replies?: AutomationComment[];
  is_liked_by_user?: boolean;
}

export interface CommentStats {
  total_comments: number;
  total_replies: number;
  unique_commenters: number;
  average_likes_per_comment: number;
  most_liked_comment: AutomationComment | null;
  recent_activity: string | null;
}

export class CommentsService {
  /**
   * Get all comments for an automation
   */
  static async getComments(automationId: string): Promise<AutomationComment[]> {
    try {
      const { data: comments, error } = await supabase
        .from('automation_comments')
        .select('*')
        .eq('automation_id', automationId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Structure comments with replies
      const commentsMap = new Map<string, AutomationComment>();
      const rootComments: AutomationComment[] = [];

      // First pass: create all comment objects
      comments?.forEach(comment => {
        const commentObj: AutomationComment = {
          ...comment,
          user: null, // User data will need to be fetched separately if needed
          replies: [],
        };
        commentsMap.set(comment.id, commentObj);
      });

      // Second pass: organize into threads
      commentsMap.forEach(comment => {
        if (comment.parent_comment_id) {
          // This is a reply
          const parent = commentsMap.get(comment.parent_comment_id);
          if (parent) {
            parent.replies = parent.replies || [];
            parent.replies.push(comment);
          }
        } else {
          // This is a root comment
          rootComments.push(comment);
        }
      });

      // Sort replies by creation date (oldest first for conversation flow)
      rootComments.forEach(comment => {
        if (comment.replies) {
          comment.replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        }
      });

      // Check if current user liked each comment
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await this.markUserLikes(rootComments, user.id);
      }

      return rootComments;
    } catch (error) {
      EventLogger.error('Comments', 'Failed to get comments:', error as Error);
      return [];
    }
  }

  /**
   * Add user like information to comments
   */
  private static async markUserLikes(comments: AutomationComment[], userId: string): Promise<void> {
    try {
      const allCommentIds: string[] = [];
      
      const collectCommentIds = (comments: AutomationComment[]) => {
        comments.forEach(comment => {
          allCommentIds.push(comment.id);
          if (comment.replies) {
            collectCommentIds(comment.replies);
          }
        });
      };
      
      collectCommentIds(comments);

      if (allCommentIds.length === 0) return;

      const { data: likes } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', userId)
        .in('comment_id', allCommentIds);

      const likedCommentIds = new Set(likes?.map(like => like.comment_id) || []);

      const markLikes = (comments: AutomationComment[]) => {
        comments.forEach(comment => {
          comment.is_liked_by_user = likedCommentIds.has(comment.id);
          if (comment.replies) {
            markLikes(comment.replies);
          }
        });
      };

      markLikes(comments);
    } catch (error) {
      EventLogger.error('Comments', 'Failed to mark user likes:', error as Error);
    }
  }

  /**
   * Add a new comment
   */
  static async addComment(
    automationId: string,
    content: string,
    parentCommentId?: string
  ): Promise<AutomationComment | null> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        throw new Error(`Authentication error: ${authError.message}`);
      }
      
      if (!user) {
        throw new Error('User not authenticated. Please log in to comment.');
      }

      // Check if the automation is public
      const { data: automation, error: automationError } = await supabase
        .from('automations')
        .select('is_public')
        .eq('id', automationId)
        .single();
      
      if (automationError) {
        EventLogger.error('Comments', 'Automation check error:', automationError as Error);
        throw new Error('Could not verify automation. It might not exist.');
      }
      
      if (!automation?.is_public) {
        throw new Error('Comments are only allowed on public automations.');
      }

      const commentData = {
        automation_id: automationId,
        parent_comment_id: parentCommentId || null,
        user_id: user.id,
        content: content.trim(),
      };

      EventLogger.debug('Comments', 'Attempting to insert comment:', commentData);

      const { data, error } = await supabase
        .from('automation_comments')
        .insert(commentData)
        .select(`
          *,
          profiles:user_id(display_name, email, avatar_url)
        `)
        .single();

      if (error) {
        EventLogger.error('Comments', 'Insert error details:', error as Error);
        
        if (error.code === '42P01') {
          throw new Error('Comments table does not exist. Please run the database setup script.');
        } else if (error.code === '42501') {
          throw new Error('Permission denied. Check Row Level Security policies.');
        } else if (error.message?.includes('profiles')) {
          throw new Error('User profile not found. Please complete your profile setup.');
        }
        
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) {
        throw new Error('Comment was not created. Please try again.');
      }

      return {
        ...data,
        user: data.profiles || { display_name: 'Anonymous', email: user.email },
        replies: [],
        is_liked_by_user: false,
      };
    } catch (error: any) {
      EventLogger.error('Comments', 'Failed to add comment:', error as Error);
      throw error; // Re-throw to let the UI handle it
    }
  }

  /**
   * Update a comment
   */
  static async updateComment(commentId: string, content: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('automation_comments')
        .update({
          content: content.trim(),
          is_edited: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', commentId)
        .eq('user_id', user.id); // Only allow users to edit their own comments

      if (error) throw error;
      return true;
    } catch (error) {
      EventLogger.error('Comments', 'Failed to update comment:', error as Error);
      return false;
    }
  }

  /**
   * Delete a comment
   */
  static async deleteComment(commentId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('automation_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id); // Only allow users to delete their own comments

      if (error) throw error;
      return true;
    } catch (error) {
      EventLogger.error('Comments', 'Failed to delete comment:', error as Error);
      return false;
    }
  }

  /**
   * Like/unlike a comment
   */
  static async toggleCommentLike(commentId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if user already liked this comment
      const { data: existingLike } = await supabase
        .from('comment_likes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .single();

      if (existingLike) {
        // Unlike
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);

        if (error) throw error;
        return false; // Unliked
      } else {
        // Like
        const { error } = await supabase
          .from('comment_likes')
          .insert({
            comment_id: commentId,
            user_id: user.id,
          });

        if (error) throw error;
        return true; // Liked
      }
    } catch (error) {
      EventLogger.error('Comments', 'Failed to toggle comment like:', error as Error);
      return false;
    }
  }

  /**
   * Pin/unpin a comment (for automation owners)
   */
  static async toggleCommentPin(commentId: string, automationId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if user owns the automation
      const { data: automation } = await supabase
        .from('automations')
        .select('created_by')
        .eq('id', automationId)
        .single();

      if (!automation || automation.created_by !== user.id) {
        throw new Error('Only automation owners can pin comments');
      }

      // Get current pin status
      const { data: comment } = await supabase
        .from('automation_comments')
        .select('is_pinned')
        .eq('id', commentId)
        .single();

      if (!comment) throw new Error('Comment not found');

      // Toggle pin status
      const { error } = await supabase
        .from('automation_comments')
        .update({ is_pinned: !comment.is_pinned })
        .eq('id', commentId);

      if (error) throw error;
      return !comment.is_pinned;
    } catch (error) {
      EventLogger.error('Comments', 'Failed to toggle comment pin:', error as Error);
      return false;
    }
  }

  /**
   * Get comment statistics for an automation
   */
  static async getCommentStats(automationId: string): Promise<CommentStats> {
    try {
      const { data: comments, error } = await supabase
        .from('automation_comments')
        .select('id, user_id, parent_comment_id, likes_count, created_at')
        .eq('automation_id', automationId);

      if (error) throw error;

      const totalComments = comments?.length || 0;
      const totalReplies = comments?.filter(c => c.parent_comment_id !== null).length || 0;
      const uniqueCommenters = new Set(comments?.map(c => c.user_id)).size;
      const totalLikes = comments?.reduce((sum, c) => sum + c.likes_count, 0) || 0;
      const averageLikes = totalComments > 0 ? Math.round((totalLikes / totalComments) * 100) / 100 : 0;

      // Find most liked comment
      let mostLikedComment: AutomationComment | null = null;
      if (comments && comments.length > 0) {
        const mostLiked = comments.reduce((max, comment) => 
          comment.likes_count > max.likes_count ? comment : max
        );

        if (mostLiked.likes_count > 0) {
          // Fetch full comment details
          const { data: fullComment } = await supabase
            .from('automation_comments')
            .select(`
              *,
              profiles:user_id(display_name, email, avatar_url)
            `)
            .eq('id', mostLiked.id)
            .single();

          if (fullComment) {
            mostLikedComment = {
              ...fullComment,
              user: fullComment.profiles,
              replies: [],
            };
          }
        }
      }

      const recentActivity = comments && comments.length > 0 
        ? comments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
        : null;

      return {
        total_comments: totalComments - totalReplies, // Root comments only
        total_replies: totalReplies,
        unique_commenters: uniqueCommenters,
        average_likes_per_comment: averageLikes,
        most_liked_comment: mostLikedComment,
        recent_activity: recentActivity,
      };
    } catch (error) {
      EventLogger.error('Comments', 'Failed to get comment stats:', error as Error);
      return {
        total_comments: 0,
        total_replies: 0,
        unique_commenters: 0,
        average_likes_per_comment: 0,
        most_liked_comment: null,
        recent_activity: null,
      };
    }
  }

  /**
   * Report a comment for moderation
   */
  static async reportComment(commentId: string, reason: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Log the report (you might want a separate reports table)
      EventLogger.debug('Comments', 'Comment reported:', { commentId, reason, reportedBy: user.id });
      
      // For now, just log it. In a real app, you'd insert into a reports table
      return true;
    } catch (error) {
      EventLogger.error('Comments', 'Failed to report comment:', error as Error);
      return false;
    }
  }
}