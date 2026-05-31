# SagaDrive - SagaDrive

Enterprise-level platform for interactive tabletop RPG sessions with AI support.

## 🏗️ Architecture

This project follows **Domain-Driven Module Architecture** with clean separation of concerns:

```
/
├── modules/                    # Domain modules
│   ├── characters/            # Character management
│   │   ├── types/            # DTOs & View Models
│   │   ├── services/         # API layer (Supabase)
│   │   ├── hooks/            # React hooks for state
│   │   └── index.ts          # Module exports
│   ├── sessions/             # Session management
│   └── adventures/           # (TODO)
├── components/                # UI components
│   ├── layout/              # Layout components
│   └── ui/                  # Shadcn UI components
├── lib/                      # Utilities & clients
│   └── supabase.ts          # Supabase client
└── App.tsx                   # Main app entry

```

## 📦 Tech Stack

- **React** with TypeScript
- **Tailwind CSS v4** for styling
- **Supabase** for backend (Auth, Database, Storage)
- **Shadcn UI** components
- **Module Architecture** (enterprise clean code)

## 🗄️ Database Setup

1. Go to your Supabase project
2. Open SQL Editor
3. Run the schema from `/supabase/schema.sql`

This will create:
- `characters` table with RLS
- `sessions` table with RLS
- `session_players` table (many-to-many)
- `adventures` table
- `marketplace_items` table

## 🚀 Features

### ✅ Implemented
- **Module Architecture**: Clean separation by domain
- **Character Management**: Full CRUD with Supabase
- **Session Creation**: GM can create sessions with unique codes
- **Session Joining**: Players can join via code
- **Mobile-First UI**: Bottom navigation, responsive design
- **Real-time Data**: Hooks-based state management

### 🚧 In Progress
- Character Editor with full CRUD
- Adventure Editor
- Gamemaster Panel (live session)
- Player View (live session)

### 📋 TODO
- Marketplace module
- Profile settings
- Real-time session updates (Supabase Realtime)
- AI integration for storytelling
- VR support

## 📝 Code Guidelines

### Module Structure
Each module follows this pattern:

```typescript
/modules/domain/
├── types/domain.types.ts       # DTOs, VMs, interfaces
├── services/domain.service.ts  # API calls, business logic
├── hooks/useDomain.ts          # React hooks for state
└── index.ts                    # Barrel exports
```

### Service Layer
- All Supabase calls in services
- DTOs for database entities
- View Models for UI consumption
- Error handling with try/catch
- No business logic in components

### Hooks
- Custom hooks for data fetching
- Loading & error states
- CRUD operations
- Automatic refetching

### Components
- Max 300 lines per file (hard limit 500)
- Tailwind-only styling (no inline styles)
- TypeScript strict mode
- Props interfaces defined

## 🔐 Authentication

Supabase Auth is configured. Users must be authenticated to:
- Create/manage characters
- Create/join sessions
- Access library

## 📱 Mobile First

- Bottom navigation on mobile
- Desktop sidebar on larger screens
- Touch-optimized interactions
- Responsive breakpoints (sm:, md:, lg:)

## 🎨 Styling & Corporate Identity

- **Font**: Darker Grotesque (modern sans-serif)
- **Colors**: Cyan (#0891B2) for buttons/tabs, Gold (#E8A641) for hover/highlights
- **Tailwind v4** with CSS variables
- Dark mode support
- Design tokens in `/styles/globals.css`
- No inline styles allowed
- Shadcn UI components
- **See**: `THEME_GUIDE.md` for full CI documentation

## 🧪 Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## 📄 License

Proprietary - SagaDrive Platform
