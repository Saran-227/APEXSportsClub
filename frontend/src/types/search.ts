/**
 * Unified Global Search Types
 */

export type SearchCategory =
  | 'all'
  | 'members'
  | 'employees'
  | 'bookings'
  | 'inventory'
  | 'shop'
  | 'cafeteria'
  | 'finance';

export interface SearchResultItem {
  id: string;
  entity_type: SearchCategory | string;
  title: string;
  subtitle: string;
  badge?: string;
  badge_type?: 'success' | 'warning' | 'info' | 'danger' | 'neutral';
  metadata: Record<string, any>;
  navigation_url: string;
  relevance_score: number;
}

export interface GlobalSearchResponse {
  query: string;
  category: SearchCategory;
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
  execution_time_ms: number;
  categories_breakdown: Record<string, number>;
  results: SearchResultItem[];
}
