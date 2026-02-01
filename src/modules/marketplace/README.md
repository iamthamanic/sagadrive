# 🛒 Marketplace Module

Community-Marktplatz für teilbare Inhalte (Welten, Abenteuer, Charaktere, Items, Regelsets).

## Features

- ✅ **Durchsuchen** - Filtern nach Typ, Suche, Rating
- ✅ **Featured Items** - Top Community-Picks
- ✅ **Downloads** - Automatisches Download-Tracking
- ✅ **Ratings** - Community-Bewertungen (0-5 Sterne)
- ✅ **Preise** - Kostenlose & Premium-Inhalte
- ✅ **Eigene Inhalte** - Publishen eigener Kreationen

## Module Structure

```
/modules/marketplace/
  ├── types/
  │   └── marketplace.types.ts    # TypeScript DTOs
  ├── services/
  │   └── marketplace.service.ts  # Supabase API calls
  ├── hooks/
  │   └── useMarketplace.ts       # React hook
  └── index.ts                    # Public API
```

## Usage

```typescript
import { useMarketplace } from '../modules/marketplace';

function MyComponent() {
  const { items, featuredItems, isLoading, downloadItem } = useMarketplace({
    type: 'world',
    searchQuery: 'fantasy',
    sortBy: 'downloads',
  });

  // ...
}
```

## Database Schema

Die `marketplace_items` Tabelle ist bereits in Schema V3 deployed:

```sql
CREATE TABLE marketplace_items (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL,  -- 'world' | 'adventure' | 'character' | 'item' | 'ruleset'
  title TEXT NOT NULL,
  description TEXT,
  author_id UUID REFERENCES auth.users(id),
  data JSONB NOT NULL,  -- Item-specific content
  rating DECIMAL(2,1) DEFAULT 0.0,
  downloads INTEGER DEFAULT 0,
  price DECIMAL(10,2) DEFAULT 0.00,
  tags TEXT[],
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Optional: RPC Functions

Für bessere Performance kannst du die RPC-Funktionen deployen:

```bash
psql -h your-db-url -f /supabase/add_marketplace_rpc.sql
```

## No Mock Data!

Dieses Modul nutzt **100% echte Supabase-Daten**. 
- Empty State wird angezeigt, wenn keine Items vorhanden
- Alle CRUD-Operationen gehen direkt zur DB
- Realtime-Updates möglich (future feature)
