// Marketplace Item Types

export type MarketplaceItemType = 'world' | 'adventure' | 'character' | 'item' | 'ruleset';

export interface MarketplaceItem {
  id: string;
  type: MarketplaceItemType;
  title: string;
  description: string | null;
  author_id: string;
  author_name?: string; // Joined from users table
  data: Record<string, any>; // Item-specific data (flexible JSONB)
  rating: number;
  downloads: number;
  price: number; // 0.00 = free
  image_url: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateMarketplaceItemDTO {
  type: MarketplaceItemType;
  title: string;
  description?: string;
  data: Record<string, any>;
  price?: number;
  image_url?: string;
  tags?: string[];
}

export interface UpdateMarketplaceItemDTO {
  title?: string;
  description?: string;
  data?: Record<string, any>;
  price?: number;
  image_url?: string;
  tags?: string[];
}

export interface MarketplaceFilters {
  type?: MarketplaceItemType | 'all';
  searchQuery?: string;
  minRating?: number;
  maxPrice?: number;
  tags?: string[];
  sortBy?: 'downloads' | 'rating' | 'created_at' | 'price';
  sortOrder?: 'asc' | 'desc';
}
