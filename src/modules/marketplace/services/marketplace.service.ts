import { supabase } from '../../../lib/supabase';
import type {
  MarketplaceItem,
  CreateMarketplaceItemDTO,
  UpdateMarketplaceItemDTO,
  MarketplaceFilters,
} from '../types/marketplace.types';

/**
 * Get all marketplace items with optional filtering
 */
export async function getMarketplaceItems(
  filters?: MarketplaceFilters
): Promise<MarketplaceItem[]> {
  try {
    let query = supabase
      .from('marketplace_items')
      .select('*');

    // Apply filters
    if (filters?.type && filters.type !== 'all') {
      query = query.eq('type', filters.type);
    }

    if (filters?.searchQuery) {
      query = query.or(
        `title.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`
      );
    }

    if (filters?.minRating !== undefined) {
      query = query.gte('rating', filters.minRating);
    }

    if (filters?.maxPrice !== undefined) {
      query = query.lte('price', filters.maxPrice);
    }

    // Sorting
    const sortBy = filters?.sortBy || 'downloads';
    const sortOrder = filters?.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching marketplace items:', error);
      throw new Error(`Failed to fetch marketplace items: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getMarketplaceItems:', error);
    throw error;
  }
}

/**
 * Get a single marketplace item by ID
 */
export async function getMarketplaceItemById(id: string): Promise<MarketplaceItem | null> {
  try {
    const { data, error } = await supabase
      .from('marketplace_items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching marketplace item:', error);
      throw new Error(`Failed to fetch marketplace item: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in getMarketplaceItemById:', error);
    throw error;
  }
}

/**
 * Get featured marketplace items (top 4-6 items by downloads and rating)
 */
export async function getFeaturedItems(): Promise<MarketplaceItem[]> {
  try {
    // Get top items based on a combination of downloads and rating
    const { data, error } = await supabase
      .from('marketplace_items')
      .select('*')
      .gte('rating', 3.5) // Only well-rated items
      .order('downloads', { ascending: false })
      .limit(6);

    if (error) {
      console.error('Error fetching featured items:', error);
      throw new Error(`Failed to fetch featured items: ${error.message}`);
    }

    // If we don't have enough high-rated items, get top downloads instead
    if (!data || data.length < 6) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('marketplace_items')
        .select('*')
        .order('downloads', { ascending: false })
        .limit(6);

      if (fallbackError) {
        console.error('Error fetching fallback items:', fallbackError);
        return data || [];
      }

      return fallbackData || [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getFeaturedItems:', error);
    throw error;
  }
}

/**
 * Create a new marketplace item (publish your content)
 */
export async function createMarketplaceItem(
  dto: CreateMarketplaceItemDTO
): Promise<MarketplaceItem> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to create marketplace items');
    }

    const { data, error } = await supabase
      .from('marketplace_items')
      .insert({
        type: dto.type,
        title: dto.title,
        description: dto.description || null,
        author_id: user.id,
        data: dto.data,
        price: dto.price || 0,
        image_url: dto.image_url || null,
        tags: dto.tags || [],
        rating: 0,
        downloads: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating marketplace item:', error);
      throw new Error(`Failed to create marketplace item: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in createMarketplaceItem:', error);
    throw error;
  }
}

/**
 * Update a marketplace item (only if you're the author)
 */
export async function updateMarketplaceItem(
  id: string,
  dto: UpdateMarketplaceItemDTO
): Promise<MarketplaceItem> {
  try {
    const { data, error } = await supabase
      .from('marketplace_items')
      .update({
        ...dto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating marketplace item:', error);
      throw new Error(`Failed to update marketplace item: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in updateMarketplaceItem:', error);
    throw error;
  }
}

/**
 * Delete a marketplace item (only if you're the author)
 */
export async function deleteMarketplaceItem(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('marketplace_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting marketplace item:', error);
      throw new Error(`Failed to delete marketplace item: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error('Error in deleteMarketplaceItem:', error);
    return false;
  }
}

/**
 * Increment downloads counter when a user downloads an item
 */
export async function incrementDownloads(id: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('increment_marketplace_downloads', {
      item_id: id,
    });

    if (error) {
      // Fallback if RPC doesn't exist yet
      const { data: item } = await supabase
        .from('marketplace_items')
        .select('downloads')
        .eq('id', id)
        .single();

      if (item) {
        await supabase
          .from('marketplace_items')
          .update({ downloads: item.downloads + 1 })
          .eq('id', id);
      }
    }
  } catch (error) {
    console.error('Error incrementing downloads:', error);
  }
}

/**
 * Get items by a specific author
 */
export async function getItemsByAuthor(authorId: string): Promise<MarketplaceItem[]> {
  try {
    const { data, error } = await supabase
      .from('marketplace_items')
      .select('*')
      .eq('author_id', authorId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching author items:', error);
      throw new Error(`Failed to fetch author items: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getItemsByAuthor:', error);
    throw error;
  }
}
