#!/bin/bash

# ===========================================
# SagaDrive Self-Host Setup Script
# ===========================================

set -e

echo "🚀 SagaDrive Self-Host Setup"
echo "=============================="

# Check prerequisites
echo ""
echo "📦 Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed!"
    echo "   Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed!"
    echo "   Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker: $(docker --version)"
echo "✅ Docker Compose: $(docker-compose --version 2>/dev/null || docker compose version)"

# Generate secrets
echo ""
echo "🔐 Generating secrets..."

if [ ! -f .env ]; then
    # Generate JWT Secret (32 bytes hex)
    JWT_SECRET=$(openssl rand -hex 32)
    
    # Generate POSTGRES Password (32 bytes hex)
    POSTGRES_PASSWORD=$(openssl rand -hex 16)
    
    # Generate ANON Key (base64)
    ANON_KEY=$(openssl rand -base64 32)
    
    # Generate SERVICE_ROLE Key (base64)
    SERVICE_ROLE_KEY=$(openssl rand -base64 32)
    
    # Generate Neo4j Password
    NEO4J_PASSWORD=$(openssl rand -hex 16)
    
    cat > .env << EOF
# ===========================================
# SagaDrive Self-Host Configuration
# GENERATED - Keep this file secure!
# ===========================================

# JWT Secret (for auth tokens)
JWT_SECRET=${JWT_SECRET}

# PostgreSQL Password
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# Supabase Keys
SUPABASE_ANON_KEY=${ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}

# Site URL
SITE_URL=http://localhost:3000
ADDITIONAL_REDIRECT_URLS=http://localhost:3000/auth/callback

# Email (optional)
MAILER_AUTOCONFIRM=true
DISABLE_SIGNUP=false

# Neo4j Password
NEO4J_PASSWORD=${NEO4J_PASSWORD}

# Ollama Model
OLLAMA_MODEL=llama3.2
EOF
    
    echo "✅ Generated .env file with secrets"
else
    echo "✅ Using existing .env file"
fi

# Pull Ollama model
echo ""
echo "🦙 Ollama Model Setup"
echo "--------------------"
echo "You need to download the LLM model for AI Game Master."
echo ""
echo "After starting the services, run:"
echo "  docker exec -it sagadrive-ollama ollama pull llama3.2"
echo ""
echo "Or for a larger model:"
echo "  docker exec -it sagadrive-ollama ollama pull llama3.1:8b"
echo ""

# Start services
echo ""
echo "🐳 Starting Docker services..."
echo ""

# Check if we should start
read -p "Start services now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose up -d
    
    echo ""
    echo "⏳ Waiting for services to start..."
    sleep 10
    
    # Check services
    echo ""
    echo "🔍 Checking service health..."
    
    # PostgreSQL
    if docker exec sagadrive-db pg_isready -U postgres &>/dev/null; then
        echo "✅ PostgreSQL: Running"
    else
        echo "⏳ PostgreSQL: Starting..."
    fi
    
    # Supabase Auth
    if curl -s http://localhost:9999/health &>/dev/null; then
        echo "✅ Supabase Auth: Running"
    else
        echo "⏳ Supabase Auth: Starting..."
    fi
    
    # Neo4j
    if curl -s http://localhost:7474 &>/dev/null; then
        echo "✅ Neo4j: Running"
    else
        echo "⏳ Neo4j: Starting..."
    fi
    
    # Redis
    if docker exec sagadrive-redis redis-cli ping &>/dev/null; then
        echo "✅ Redis: Running"
    else
        echo "⏳ Redis: Starting..."
    fi
    
    # Ollama
    if curl -s http://localhost:11434/api/tags &>/dev/null; then
        echo "✅ Ollama: Running"
    else
        echo "⏳ Ollama: Starting..."
    fi
    
    echo ""
    echo "🎉 Setup complete!"
    echo ""
    echo "📱 Access Points:"
    echo "   Frontend:      http://localhost:3000"
    echo "   Studio:        http://localhost:3000 (Supabase Dashboard)"
    echo "   API Gateway:   http://localhost:8000"
    echo "   Functions:     http://localhost:9998"
    echo "   PostgreSQL:    localhost:5432"
    echo "   Neo4j Browser: http://localhost:7474"
    echo "   Redis:         localhost:6379"
    echo "   Ollama:        http://localhost:11434"
    echo ""
    echo "📚 Next Steps:"
    echo "   1. Download LLM model:"
    echo "      docker exec -it sagadrive-ollama ollama pull llama3.2"
    echo ""
    echo "   2. Set Neo4j password:"
    echo "      Change NEO4J_PASSWORD in .env"
    echo ""
    echo "   3. Create your first project:"
    echo "      Use the frontend or API directly"
    echo ""
    echo "   4. Test functions:"
    echo "      curl -X POST http://localhost:9998/functions/v1/dm-tools/dice \\"
    echo "        -H 'Content-Type: application/json' \\"
    echo "        -d '{\"notation\": \"d20\", \"modifier\": 5}'"
    echo ""
else
    echo ""
    echo "To start services manually:"
    echo "  docker-compose up -d"
    echo ""
fi

echo "✅ Setup script completed"