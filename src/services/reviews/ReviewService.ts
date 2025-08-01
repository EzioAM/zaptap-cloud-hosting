import { supabase } from '../supabase/client';
import { AutomationReview, RatingStats } from '../../types';
import { Logger } from '../../utils/Logger';

export class ReviewService {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('ReviewService');
  }

  // Submit a new review
  async submitReview(
    automationId: string,
    userId: string,
    rating: number,
    reviewText?: string
  ): Promise<{ success: boolean; error?: string; review?: AutomationReview }> {
    try {
      // Validate rating
      if (rating < 1 || rating > 5) {
        return { success: false, error: 'Rating must be between 1 and 5 stars' };
      }

      // Check if user already reviewed this automation
      const { data: existingReview } = await supabase
        .from('automation_reviews')
        .select('id')
        .eq('automation_id', automationId)
        .eq('user_id', userId)
        .single();

      if (existingReview) {
        return await this.updateReview(existingReview.id, rating, reviewText);
      }

      // Insert new review
      const { data, error } = await supabase
        .from('automation_reviews')
        .insert({
          automation_id: automationId,
          user_id: userId,
          rating,
          comment: reviewText || null,
          helpful_count: 0,
        })
        .select('*')
        .single();

      if (error) {
        this.logger.error('Failed to submit review', { error: error.message });
        return { success: false, error: error.message };
      }

      // Update automation rating stats
      await this.updateAutomationRatingStats(automationId);

      this.logger.info('Review submitted successfully', { 
        automationId, 
        userId, 
        rating, 
        reviewId: data.id 
      });

      return { success: true, review: data };
    } catch (error: any) {
      this.logger.error('Review submission failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  // Update an existing review
  async updateReview(
    reviewId: string,
    rating: number,
    reviewText?: string
  ): Promise<{ success: boolean; error?: string; review?: AutomationReview }> {
    try {
      const { data, error } = await supabase
        .from('automation_reviews')
        .update({
          rating,
          comment: reviewText || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId)
        .select('*')
        .single();

      if (error) {
        this.logger.error('Failed to update review', { error: error.message });
        return { success: false, error: error.message };
      }

      // Update automation rating stats
      await this.updateAutomationRatingStats(data.automation_id);

      this.logger.info('Review updated successfully', { reviewId, rating });
      return { success: true, review: data };
    } catch (error: any) {
      this.logger.error('Review update failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  // Delete a review
  async deleteReview(reviewId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get automation_id before deleting
      const { data: review } = await supabase
        .from('automation_reviews')
        .select('automation_id')
        .eq('id', reviewId)
        .eq('user_id', userId)
        .single();

      if (!review) {
        return { success: false, error: 'Review not found or not authorized' };
      }

      const { error } = await supabase
        .from('automation_reviews')
        .delete()
        .eq('id', reviewId)
        .eq('user_id', userId);

      if (error) {
        this.logger.error('Failed to delete review', { error: error.message });
        return { success: false, error: error.message };
      }

      // Update automation rating stats
      await this.updateAutomationRatingStats(review.automation_id);

      this.logger.info('Review deleted successfully', { reviewId });
      return { success: true };
    } catch (error: any) {
      this.logger.error('Review deletion failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  // Get reviews for an automation
  async getAutomationReviews(
    automationId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<{ reviews: AutomationReview[]; total: number }> {
    try {
      // Get reviews with user email for display
      const { data: reviews, error } = await supabase
        .from('automation_reviews')
        .select(`
          *,
          users!inner(email)
        `)
        .eq('automation_id', automationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        this.logger.error('Failed to fetch reviews', { error: error.message });
        return { reviews: [], total: 0 };
      }

      // Get total count
      const { count } = await supabase
        .from('automation_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('automation_id', automationId);

      // Transform data to include user email
      const transformedReviews: AutomationReview[] = reviews.map(review => ({
        ...review,
        user_email: review.users?.email || 'Anonymous',
      }));

      return { reviews: transformedReviews, total: count || 0 };
    } catch (error: any) {
      this.logger.error('Failed to fetch reviews', { error: error.message });
      return { reviews: [], total: 0 };
    }
  }

  // Get user's review for an automation
  async getUserReview(automationId: string, userId: string): Promise<AutomationReview | null> {
    try {
      const { data, error } = await supabase
        .from('automation_reviews')
        .select('*')
        .eq('automation_id', automationId)
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      return data;
    } catch (error: any) {
      this.logger.error('Failed to fetch user review', { error: error.message });
      return null;
    }
  }

  // Get rating statistics for an automation
  async getRatingStats(automationId: string): Promise<RatingStats> {
    try {
      const { data: reviews, error } = await supabase
        .from('automation_reviews')
        .select('rating')
        .eq('automation_id', automationId);

      if (error || !reviews) {
        return {
          average_rating: 0,
          total_reviews: 0,
          rating_breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };
      }

      const totalReviews = reviews.length;
      const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let totalRating = 0;

      reviews.forEach(review => {
        totalRating += review.rating;
        ratingBreakdown[review.rating as keyof typeof ratingBreakdown]++;
      });

      const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;

      return {
        average_rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        total_reviews: totalReviews,
        rating_breakdown: ratingBreakdown
      };
    } catch (error: any) {
      this.logger.error('Failed to calculate rating stats', { error: error.message });
      return {
        average_rating: 0,
        total_reviews: 0,
        rating_breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }
  }

  // Update automation rating stats in the automations table
  private async updateAutomationRatingStats(automationId: string): Promise<void> {
    try {
      const stats = await this.getRatingStats(automationId);
      
      const { error } = await supabase
        .from('automations')
        .update({
          average_rating: stats.average_rating,
          rating_count: stats.total_reviews,
        })
        .eq('id', automationId);

      if (error) {
        this.logger.error('Failed to update automation rating stats', { 
          error: error.message,
          automationId 
        });
      }
    } catch (error: any) {
      this.logger.error('Failed to update automation rating stats', { 
        error: error.message,
        automationId 
      });
    }
  }

  // Mark a review as helpful
  async markReviewHelpful(reviewId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Update helpful count directly instead of using RPC
      const { error } = await supabase
        .from('automation_reviews')
        .update({ 
          helpful_count: supabase.sql`helpful_count + 1` 
        })
        .eq('id', reviewId);

      if (error) {
        this.logger.error('Failed to mark review as helpful', { error: error.message });
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      this.logger.error('Failed to mark review as helpful', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  // Get top-rated automations
  async getTopRatedAutomations(limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .eq('is_public', true)
        .gte('rating_count', 3) // At least 3 reviews
        .order('average_rating', { ascending: false })
        .order('rating_count', { ascending: false })
        .limit(limit);

      if (error) {
        this.logger.error('Failed to fetch top-rated automations', { error: error.message });
        return [];
      }

      return data || [];
    } catch (error: any) {
      this.logger.error('Failed to fetch top-rated automations', { error: error.message });
      return [];
    }
  }

  // Get recent reviews across all automations
  async getRecentReviews(limit: number = 20): Promise<AutomationReview[]> {
    try {
      const { data: reviews, error } = await supabase
        .from('automation_reviews')
        .select(`
          *,
          users!inner(email),
          automations!inner(title)
        `)
        .not('comment', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        this.logger.error('Failed to fetch recent reviews', { error: error.message });
        return [];
      }

      return reviews.map(review => ({
        ...review,
        user_email: review.users?.email || 'Anonymous',
        automation_title: review.automations?.title || 'Unknown Automation'
      })) || [];
    } catch (error: any) {
      this.logger.error('Failed to fetch recent reviews', { error: error.message });
      return [];
    }
  }
}

export const reviewService = new ReviewService();