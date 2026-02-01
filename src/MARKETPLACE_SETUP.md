# 🛒 Marketplace Setup Guide

## Quick Start

### 1️⃣ Deploy Marketplace Table

Gehe zu deinem Supabase Dashboard → **SQL Editor** und führe diese Datei aus:

```sql
-- Kopiere den Inhalt von:
/supabase/deploy_marketplace.sql
```

**Was wird erstellt:**
- ✅ `marketplace_items` Tabelle
- ✅ Indexes für Performance (type, author, downloads, rating, tags)
- ✅ Row Level Security Policies
- ✅ RPC-Funktion `increment_marketplace_downloads()`
- ✅ Auto-Update Trigger für `updated_at`

---

### 2️⃣ Test-Daten erstellen

1. **In der App:** Navigiere zu **🧪 Marketplace Test** (Desktop Sidebar)
2. **Klicke:** "5 Beispiel-Items erstellen"
3. **Fertig!** Die Items sind jetzt im Marketplace sichtbar

---

## Table Schema

```typescript
interface MarketplaceItem {
  id: string;                    // UUID
  type: MarketplaceItemType;     // 'world' | 'adventure' | 'character' | 'item' | 'ruleset'
  title: string;                 // Item Name
  description: string | null;    // Optional Description
  author_id: string;             // User UUID (FK to auth.users)
  data: Record<string, any>;     // Flexible JSONB for item-specific data
  rating: number;                // 0.00 - 5.00
  downloads: number;             // Download count
  price: number;                 // 0.00 = free
  image_url: string | null;      // Optional image
  tags: string[];                // Searchable tags
  is_featured: boolean;          // Featured in homepage
  created_at: string;            // ISO timestamp
  updated_at: string;            // ISO timestamp
}
```

---

## Features

### ✅ Implemented
- **CRUD Operations** - Create, Read, Update, Delete marketplace items
- **Search & Filter** - By type, search query, rating, price
- **Featured Items** - Highlight top community picks
- **Download Tracking** - Atomic increment via RPC function
- **Row Level Security** - Users can only edit their own items
- **Responsive UI** - Mobile & Desktop optimized

### 🚧 Coming Soon
- **Rating System** - Users can rate items
- **Purchase Flow** - Paid items with Stripe integration
- **Item Details Page** - Full item preview with screenshots
- **Comments & Reviews** - Community feedback
- **Download History** - Track what users downloaded
- **Author Profiles** - Public creator pages

---

## API Usage

### Get All Items
```typescript
import { useMarketplace } from '../modules/marketplace';

function MyComponent() {
  const { items, isLoading, error } = useMarketplace({
    type: 'world',
    searchQuery: 'dragon',
    sortBy: 'downloads',
    sortOrder: 'desc',
  });
  
  return <div>{/* ... */}</div>;
}
```

### Create Item
```typescript
import { createMarketplaceItem } from '../modules/marketplace';

await createMarketplaceItem({
  type: 'adventure',
  title: 'Die Tiefen von Khazad',
  description: 'Ein episches Dungeon-Abenteuer',
  price: 4.99,
  data: {
    level: '5-8',
    duration: '4-6 hours',
    encounters: 12,
  },
  tags: ['dungeon', 'fantasy', 'combat'],
});
```

### Download Item
```typescript
import { useMarketplace } from '../modules/marketplace';

function ItemCard({ item }) {
  const { downloadItem } = useMarketplace();
  
  const handleDownload = async () => {
    await downloadItem(item.id);
    toast.success('Item downloaded!');
  };
  
  return <button onClick={handleDownload}>Download</button>;
}
```

---

## RLS Policies

| Action | Policy | Who |
|--------|--------|-----|
| SELECT | Public | Everyone (including anonymous) |
| INSERT | Authenticated users only | Must be logged in |
| UPDATE | Authors only | `auth.uid() = author_id` |
| DELETE | Authors only | `auth.uid() = author_id` |

---

## Testing

### Manual Test (UI)
1. Go to **🧪 Marketplace Test**
2. Create sample items
3. Go to **Marktplatz**
4. Test search, filters, downloads

### Automated Test (SQL)
```sql
-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'marketplace_items'
);

-- Check RLS is enabled
SELECT relrowsecurity 
FROM pg_class 
WHERE relname = 'marketplace_items';

-- Count items
SELECT COUNT(*) FROM marketplace_items;

-- Test RPC function
SELECT increment_marketplace_downloads('YOUR-ITEM-UUID');
```

---

## Troubleshooting

### ❌ "relation marketplace_items does not exist"
**Fix:** Run `/supabase/deploy_marketplace.sql` in Supabase SQL Editor

### ❌ "permission denied for table marketplace_items"
**Fix:** Check RLS policies are created correctly

### ❌ "Items not showing in UI"
**Fix:** 
1. Check browser console for errors
2. Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set
3. Check network tab for failed API calls

### ❌ "Cannot create items"
**Fix:** Make sure you're logged in (authenticated user required)

---

## Production Checklist

Before deploying to production:

- [ ] Remove `/components/MarketplaceTest.tsx` from build
- [ ] Remove "🧪 Marketplace Test" from navigation
- [ ] Implement payment flow for paid items
- [ ] Add image upload functionality
- [ ] Set up CDN for marketplace images
- [ ] Add content moderation system
- [ ] Implement reporting system for inappropriate content
- [ ] Add analytics tracking
- [ ] Set up email notifications for new items

---

## Related Files

- `/modules/marketplace/` - Business logic
- `/components/Marketplace.tsx` - UI Component
- `/components/MarketplaceTest.tsx` - Test UI (remove in prod)
- `/supabase/deploy_marketplace.sql` - DB Schema
- `/supabase/add_marketplace_rpc.sql` - RPC Functions

---

**Happy Building!** 🚀
