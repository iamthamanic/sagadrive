-- ============================================
-- MARKETPLACE TABLE - Quick Deploy
-- ============================================
-- Run this in your Supabase SQL Editor to create the marketplace_items table

-- Create marketplace_items table
CREATE TABLE IF NOT EXISTS marketplace_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('world', 'adventure', 'character', 'item', 'ruleset')),
  title TEXT NOT NULL,
  description TEXT,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  rating DECIMAL(3,2) NOT NULL DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
  downloads INTEGER NOT NULL DEFAULT 0,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
  image_url TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_marketplace_type ON marketplace_items(type);
CREATE INDEX IF NOT EXISTS idx_marketplace_author ON marketplace_items(author_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_downloads ON marketplace_items(downloads DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_rating ON marketplace_items(rating DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_featured ON marketplace_items(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_marketplace_tags ON marketplace_items USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_marketplace_created ON marketplace_items(created_at DESC);

-- Enable Row Level Security
ALTER TABLE marketplace_items ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read marketplace items
CREATE POLICY "Marketplace items are viewable by everyone"
  ON marketplace_items
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can create items
CREATE POLICY "Authenticated users can create marketplace items"
  ON marketplace_items
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- Policy: Authors can update their own items
CREATE POLICY "Authors can update their own marketplace items"
  ON marketplace_items
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Policy: Authors can delete their own items
CREATE POLICY "Authors can delete their own marketplace items"
  ON marketplace_items
  FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_marketplace_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER marketplace_updated_at
  BEFORE UPDATE ON marketplace_items
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_updated_at();

-- RPC Function: Increment downloads atomically
CREATE OR REPLACE FUNCTION increment_marketplace_downloads(item_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE marketplace_items
  SET downloads = downloads + 1
  WHERE id = item_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_marketplace_downloads(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_marketplace_downloads(UUID) TO anon;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Marketplace table created successfully!';
  RAISE NOTICE '📝 You can now create marketplace items via the MarketplaceTest component';
END $$;
