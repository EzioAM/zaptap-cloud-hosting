/**
 * Search API for automation discovery and search functionality
 * 
 * This module provides RTK Query endpoints for searching automations,
 * retrieving trending content, categories, and featured automations.
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseApiConfig, createCacheTags } from './baseApi';

// Search-related types
export interface SearchFilters {
  category?: string;
  minRating?: number;
  hasNFC?: boolean;
  hasQR?: boolean;
  isPublic?: boolean;
  createdBy?: string;
  sortBy?: 'relevance' | 'rating' | 'recent' | 'popular' | 'executions';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  category: string;
  rating: number;
  reviewCount: number;
  executionCount: number;
  createdBy: {
    id: string;
    username: string;
    avatar?: string;
  };
  isPublic: boolean;
  hasNFC: boolean;
  hasQR: boolean;
  publicId?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  thumbnail?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface TrendingAutomation {
  id: string;
  title: string;
  description: string;
  category: string;
  rating: number;
  reviewCount: number;
  executionCount: number;
  growthRate: number; // Percentage growth in executions
  createdBy: {
    id: string;
    username: string;
    avatar?: string;
  };
  publicId: string;
  thumbnail?: string;
  tags: string[];
}

export interface CategoryInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
  gradient: string[];
  description: string;
  automationCount: number;
  trending: boolean;
}

export interface FeaturedAutomation {
  id: string;
  title: string;
  description: string;
  category: string;
  rating: number;
  reviewCount: number;
  executionCount: number;
  createdBy?: {
    id: string;
    username: string;
    avatar?: string;
  };
  author?: string; // Fallback for author string
  publicId: string;
  thumbnail?: string;
  featured: boolean;
  featuredReason?: string;
  tags: string[];
}

export interface PopularSearch {
  query: string;
  count: number;
  trending: boolean;
}

export interface RecentSearch {
  query: string;
  timestamp: string;
}

// Create the search API
export const searchApi = createApi({
  reducerPath: 'searchApi',
  ...baseApiConfig,
  tagTypes: ['Search', 'Trending', 'Category', 'Featured', 'PopularSearches'],
  endpoints: (builder) => ({
    // Search automations with filters and pagination
    searchAutomations: builder.query<SearchResponse, {
      query: string;
      filters?: SearchFilters;
      page?: number;
      limit?: number;
    }>({
      query: ({ query, filters = {}, page = 1, limit = 20 }) => {
        const params = new URLSearchParams();
        
        // Add search parameters
        if (query.trim()) {
          params.set('q', query.trim());
        }
        
        // Add filters
        if (filters.category) params.set('category', filters.category);
        if (filters.minRating !== undefined) params.set('min_rating', filters.minRating.toString());
        if (filters.hasNFC !== undefined) params.set('has_nfc', filters.hasNFC.toString());
        if (filters.hasQR !== undefined) params.set('has_qr', filters.hasQR.toString());
        if (filters.isPublic !== undefined) params.set('is_public', filters.isPublic.toString());
        if (filters.createdBy) params.set('created_by', filters.createdBy);
        if (filters.sortBy) params.set('sort_by', filters.sortBy);
        if (filters.sortOrder) params.set('sort_order', filters.sortOrder);
        
        // Add pagination
        params.set('page', page.toString());
        params.set('limit', limit.toString());
        
        return {
          url: `search/automations?${params.toString()}`,
          method: 'GET',
        };
      },
      providesTags: (result, error, arg) => [
        { type: 'Search', id: `${arg.query}-${JSON.stringify(arg.filters)}` },
        { type: 'Search', id: 'LIST' },
      ],
      keepUnusedDataFor: 300, // 5 minutes cache for search results
    }),

    // Get trending automations
    getTrending: builder.query<TrendingAutomation[], {
      timeframe?: '24h' | '7d' | '30d';
      category?: string;
      limit?: number;
    }>({
      query: ({ timeframe = '7d', category, limit = 10 }) => {
        const params = new URLSearchParams();
        params.set('timeframe', timeframe);
        params.set('limit', limit.toString());
        if (category) params.set('category', category);
        
        return {
          url: `trending/automations?${params.toString()}`,
          method: 'GET',
        };
      },
      providesTags: ['Trending'],
      keepUnusedDataFor: 600, // 10 minutes cache for trending
    }),

    // Get all categories with metadata
    getCategories: builder.query<CategoryInfo[], void>({
      query: () => ({
        url: 'categories',
        method: 'GET',
      }),
      providesTags: ['Category'],
      keepUnusedDataFor: 1800, // 30 minutes cache for categories
    }),

    // Get featured automations
    getFeatured: builder.query<FeaturedAutomation[], {
      category?: string;
      limit?: number;
    }>({
      query: ({ category, limit = 5 }) => {
        const params = new URLSearchParams();
        params.set('limit', limit.toString());
        if (category) params.set('category', category);
        
        return {
          url: `featured/automations?${params.toString()}`,
          method: 'GET',
        };
      },
      providesTags: ['Featured'],
      keepUnusedDataFor: 900, // 15 minutes cache for featured
    }),

    // Get new/recent automations
    getNewArrivals: builder.query<SearchResult[], {
      category?: string;
      limit?: number;
      daysBack?: number;
    }>({
      query: ({ category, limit = 10, daysBack = 7 }) => {
        const params = new URLSearchParams();
        params.set('limit', limit.toString());
        params.set('days_back', daysBack.toString());
        if (category) params.set('category', category);
        
        return {
          url: `automations/new?${params.toString()}`,
          method: 'GET',
        };
      },
      providesTags: (result) => [
        { type: 'Search', id: 'NEW' },
        ...(result?.map(automation => ({ type: 'Search' as const, id: automation.id })) || []),
      ],
      keepUnusedDataFor: 300, // 5 minutes cache for new arrivals
    }),

    // Get popular search queries
    getPopularSearches: builder.query<PopularSearch[], {
      limit?: number;
      timeframe?: '24h' | '7d' | '30d';
    }>({
      query: ({ limit = 10, timeframe = '7d' }) => {
        const params = new URLSearchParams();
        params.set('limit', limit.toString());
        params.set('timeframe', timeframe);
        
        return {
          url: `search/popular?${params.toString()}`,
          method: 'GET',
        };
      },
      providesTags: ['PopularSearches'],
      keepUnusedDataFor: 1800, // 30 minutes cache
    }),

    // Get search suggestions/autocomplete
    getSearchSuggestions: builder.query<string[], string>({
      query: (query) => ({
        url: `search/suggestions?q=${encodeURIComponent(query)}`,
        method: 'GET',
      }),
      providesTags: (result, error, query) => [{ type: 'Search', id: `suggestions-${query}` }],
      keepUnusedDataFor: 300, // 5 minutes cache
    }),

    // Get automation details by public ID (for previews)
    getAutomationByPublicId: builder.query<SearchResult & {
      steps: Array<{
        id: string;
        type: string;
        name: string;
        config: any;
        order: number;
      }>;
      deployments: Array<{
        id: string;
        type: 'nfc' | 'qr';
        name: string;
        url: string;
      }>;
    }, string>({
      query: (publicId) => ({
        url: `automations/public/${publicId}`,
        method: 'GET',
      }),
      providesTags: (result, error, publicId) => [
        { type: 'Search', id: publicId },
      ],
      keepUnusedDataFor: 600, // 10 minutes cache
    }),

    // Search within a specific category
    searchInCategory: builder.query<SearchResult[], {
      category: string;
      query?: string;
      limit?: number;
      sortBy?: SearchFilters['sortBy'];
    }>({
      query: ({ category, query, limit = 20, sortBy = 'relevance' }) => {
        const params = new URLSearchParams();
        params.set('category', category);
        params.set('limit', limit.toString());
        params.set('sort_by', sortBy);
        if (query?.trim()) params.set('q', query.trim());
        
        return {
          url: `search/category?${params.toString()}`,
          method: 'GET',
        };
      },
      providesTags: (result, error, arg) => [
        { type: 'Search', id: `category-${arg.category}` },
        { type: 'Category', id: arg.category },
      ],
      keepUnusedDataFor: 300, // 5 minutes cache
    }),

    // Get similar automations (based on current automation)
    getSimilarAutomations: builder.query<SearchResult[], {
      automationId: string;
      limit?: number;
    }>({
      query: ({ automationId, limit = 5 }) => ({
        url: `automations/${automationId}/similar?limit=${limit}`,
        method: 'GET',
      }),
      providesTags: (result, error, arg) => [
        { type: 'Search', id: `similar-${arg.automationId}` },
      ],
      keepUnusedDataFor: 600, // 10 minutes cache
    }),
  }),
});

// Export hooks for components
export const {
  useSearchAutomationsQuery,
  useLazySearchAutomationsQuery,
  useGetTrendingQuery,
  useGetCategoriesQuery,
  useGetFeaturedQuery,
  useGetNewArrivalsQuery,
  useGetPopularSearchesQuery,
  useGetSearchSuggestionsQuery,
  useLazyGetSearchSuggestionsQuery,
  useGetAutomationByPublicIdQuery,
  useSearchInCategoryQuery,
  useGetSimilarAutomationsQuery,
} = searchApi;

// Export utils for creating search URLs
export const createShareUrl = (publicId: string): string => {
  return `https://www.zaptap.cloud/share/${publicId}`;
};

export const createDeepLink = (publicId: string): string => {
  return `shortcuts-like://automation/${publicId}`;
};

// Default categories with gradients and icons
export const defaultCategories: Omit<CategoryInfo, 'automationCount' | 'trending'>[] = [
  {
    id: 'productivity',
    name: 'Productivity',
    icon: 'briefcase',
    color: '#8B5CF6',
    gradient: ['#8B5CF6', '#7C3AED'],
    description: 'Streamline your workflow and boost efficiency',
  },
  {
    id: 'smart-home',
    name: 'Smart Home',
    icon: 'home',
    color: '#06B6D4',
    gradient: ['#06B6D4', '#0891B2'],
    description: 'Automate your living space',
  },
  {
    id: 'communication',
    name: 'Communication',
    icon: 'message-circle',
    color: '#10B981',
    gradient: ['#10B981', '#059669'],
    description: 'Enhance your messaging and notifications',
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle',
    icon: 'heart',
    color: '#F59E0B',
    gradient: ['#F59E0B', '#D97706'],
    description: 'Personal and lifestyle automations',
  },
  {
    id: 'emergency',
    name: 'Emergency',
    icon: 'alert-triangle',
    color: '#EF4444',
    gradient: ['#EF4444', '#DC2626'],
    description: 'Critical safety and emergency automations',
  },
  {
    id: 'developer',
    name: 'Developer',
    icon: 'code',
    color: '#6366F1',
    gradient: ['#6366F1', '#4F46E5'],
    description: 'Developer tools and workflows',
  },
];

export default searchApi;