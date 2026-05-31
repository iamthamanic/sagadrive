# SagaDrive Self-Host

**Self-hosted TTRPG platform with Supabase, Edge Functions, and AI Game Master.**

## 🎯 Features

- ✅ **Supabase Self-Host** - Auth, Database, Storage, Realtime
- ✅ **Edge Functions** - Deno runtime, managed via Studio
- ✅ **AI Game Master** - Ollama-powered LLM integration
- ✅ **Lorekeeper** - Neo4j knowledge graph for NPCs/worlds
- ✅ **DM Tools** - Dice, combat, rulesets
- ✅ **Session Management** - Real-time sync

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Docker Stack                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Frontend   │  │    Studio    │  │   Edge RT    │          │
│  │   :3000      │  │    :3000     │  │    :9998     │          │
│  │   (Vite)     │  │  (Dashboard) │  │  (Functions) │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Supabase Core                         │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │  │
│  │  │  Auth   │ │  DB     │ │ Storage │ │Realtime│         │  │
│  │  │ (GoTrue)│ │(Postgres)│ │  (S3)  │ │(WS)    │         │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Ollama    │  │   Neo4j     │  │   Redis     │            │
│  │   :11434    │  │   :7474     │  │   :6379     │            │
│  │   (LLM)     │  │  (Graph)    │  │  (Cache)    │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- 8GB+ RAM recommended
- 20GB+ disk space

### Setup

```bash
# Clone repository
git clone https://github.com/iamthamanic/sagadrive-selfhost.git
cd sagadrive-selfhost

# Run setup script
chmod +x setup.sh
./setup.sh

# Or manually:
cp .env.example .env
# Edit .env with your secrets
docker-compose up -d
```

### Download LLM Model

```bash
# Small model (fast, less capable)
docker exec -it sagadrive-ollama ollama pull llama3.2

# Large model (slower, more capable)
docker exec -it sagadrive-ollama ollama pull llama3.1:8b
```

## 📱 Access Points

| Service | URL | Description |
|---------|-----|-------------|
| **Studio** | http://localhost:3000 | Supabase Dashboard |
| **API Gateway** | http://localhost:8000 | Kong API Gateway |
| **Functions** | http://localhost:9998 | Edge Functions Runtime |
| **PostgreSQL** | localhost:5432 | Database |
| **Neo4j Browser** | http://localhost:7474 | Knowledge Graph |
| **Redis** | localhost:6379 | Session Cache |
| **Ollama** | http://localhost:11434 | LLM API |

## 🔧 Edge Functions

### Available Functions

| Function | Endpoint | Description |
|----------|----------|-------------|
| **ai-gm** | `/functions/v1/ai-gm` | AI Game Master narrative generation |
| **lorekeeper** | `/functions/v1/lorekeeper` | Knowledge graph operations |
| **dm-tools** | `/functions/v1/dm-tools` | Dice, combat, rulesets |
| **sessions** | `/functions/v1/sessions` | Session management |

### Using Functions

```bash
# Roll dice
curl -X POST http://localhost:9998/functions/v1/dm-tools/dice \
  -H "Content-Type: application/json" \
  -d '{"notation": "d20", "modifier": 5}'

# AI Game Master
curl -X POST http://localhost:9998/functions/v1/ai-gm \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session",
    "action": "I explore the dark cave",
    "context": {
      "characters": [{"name": "Aragorn", "race": "Human", "class": "Ranger", "level": 5}],
      "location": "Dark Cave"
    }
  }'

# Create World Graph
curl -X POST http://localhost:9998/functions/v1/lorekeeper/graph \
  -H "Content-Type: application/json" \
  -d '{"projectId": "my-campaign", "name": "Forgotten Realms"}'
```

## 🗂️ Directory Structure

```
sagadrive-selfhost/
├── docker-compose.yml          # Main compose file
├── .env                        # Environment variables
├── setup.sh                    # Setup script
├── README.md                   # This file
└── supabase/
    ├── config/
    │   ├── kong.yml           # Kong API Gateway config
    │   ├── import_map.json    # Deno import map
    │   └── nginx-proxy.template
    ├── functions/
    │   ├── ai-gm/
    │   │   └── index.ts        # AI Game Master function
    │   ├── lorekeeper/
    │   │   └── index.ts        # Knowledge Graph function
    │   ├── dm-tools/
    │   │   └── index.ts        # DM Tools function
    │   └── sessions/
    │       └── index.ts        # Session Management function
    └── migrations/
        └── 001_initial.sql      # Database schema
```

## 🗃️ Database Schema

### Core Tables

- `projects` - Campaigns/Worlds
- `characters` - Player characters
- `sessions` - Game sessions
- `session_players` - Active players
- `npc_memories` - NPC knowledge (Lorekeeper)
- `combat_states` - Combat tracking (DM Tools)
- `world_graphs` - Neo4j references
- `chat_messages` - Real-time chat

### Row Level Security

All tables have RLS policies for:
- Players can only see their own data
- GMs can manage their projects
- Session-based access control

## 🎮 Frontend Integration

### Connect from SagaDrive

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://localhost:8000'
const supabaseAnonKey = 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Use functions
const { data, error } = await supabase.functions.invoke('ai-gm', {
  body: {
    sessionId: 'my-session',
    action: 'I attack the goblin',
    context: { ... }
  }
})
```

## 🔐 Security

### Default Credentials

Change these in `.env`:

- `JWT_SECRET` - Auth token secret
- `POSTGRES_PASSWORD` - Database password
- `SUPABASE_ANON_KEY` - Public API key
- `SUPABASE_SERVICE_ROLE_KEY` - Admin API key
- `NEO4J_PASSWORD` - Knowledge graph password

### Production Checklist

- [ ] Change all default passwords
- [ ] Enable HTTPS
- [ ] Configure email (SMTP)
- [ ] Set up backups
- [ ] Configure firewall
- [ ] Enable monitoring

## 📚 Documentation

- [Supabase Self-Host](https://supabase.com/docs/guides/self-hosting)
- [Edge Functions](https://supabase.com/docs/guides/functions)
- [Deno Runtime](https://deno.land/manual)
- [Ollama API](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Neo4j Cypher](https://neo4j.com/docs/cypher-manual/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details.

---

Built with ❤️ for the TTRPG community.