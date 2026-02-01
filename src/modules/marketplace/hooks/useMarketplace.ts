import { useState, useEffect } from 'react';
import type { MarketplaceItem, MarketplaceFilters } from '../types/marketplace.types';
import * as marketplaceService from '../services/marketplace.service';

export function useMarketplace(filters?: MarketplaceFilters) {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [featuredItems, setFeaturedItems] = useState<MarketplaceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMarketplaceItems();
    loadFeaturedItems();
  }, [JSON.stringify(filters)]);

  const loadMarketplaceItems = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await marketplaceService.getMarketplaceItems(filters);
      setItems(data);
    } catch (err) {
      console.error('Error loading marketplace items:', err);
      setError(err instanceof Error ? err.message : 'Failed to load marketplace items');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFeaturedItems = async () => {
    try {
      const data = await marketplaceService.getFeaturedItems();
      setFeaturedItems(data);
    } catch (err) {
      console.error('Error loading featured items:', err);
    }
  };

  const downloadItem = async (itemId: string) => {
    try {
      await marketplaceService.incrementDownloads(itemId);
      // Reload to get updated download count
      await loadMarketplaceItems();
    } catch (err) {
      console.error('Error downloading item:', err);
      throw err;
    }
  };

  const refresh = () => {
    loadMarketplaceItems();
    loadFeaturedItems();
  };

  return {
    items,
    featuredItems,
    isLoading,
    error,
    downloadItem,
    refresh,
  };
}
