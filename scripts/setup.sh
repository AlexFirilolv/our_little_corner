#!/bin/bash

# Our Little Corner - Setup Script
# This script helps you get started quickly with the development environment

set -e

echo "💖 Setting up Our Little Corner..."
echo "=================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop first."
    echo "   Visit: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created. Please edit it with your configuration!"
    echo ""
    echo "🔧 Required configuration:"
    echo "   - Set APP_PASSWORD (your romantic password)"
    echo "   - Set JWT_SECRET (32+ characters)"
    echo "   - Set NEXTAUTH_SECRET (32+ characters)" 
    echo "   - Set POSTGRES_PASSWORD (secure database password)"
    echo "   - Configure AWS S3 credentials"
    echo ""
    echo "📝 Edit the .env file now and then run this script again."
    exit 0
fi

# Check if required environment variables are set
echo "🔍 Checking environment configuration..."

if grep -q "your_" .env; then
    echo "⚠️  Please update the placeholder values in your .env file:"
    echo "   - APP_PASSWORD"
    echo "   - JWT_SECRET" 
    echo "   - NEXTAUTH_SECRET"
    echo "   - POSTGRES_PASSWORD"
    echo "   - AWS credentials"
    echo ""
    echo "📝 Edit .env and run this script again."
    exit 1
fi

echo "✅ Environment configuration looks good!"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    if command -v npm &> /dev/null; then
        npm install
    else
        echo "⚠️  npm not found. Dependencies will be installed in Docker container."
    fi
fi

# Start the services
echo "🚀 Starting Docker services..."
docker-compose up -d

# Wait for database to be ready
echo "⌛ Waiting for database to be ready..."
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo ""
    echo "🎉 Our Little Corner is now running!"
    echo "=================================="
    echo ""
    echo "🌐 Access URLs:"
    echo "   Main Gallery: http://localhost:3000"
    echo "   Admin Panel:  http://localhost:3000/admin"
    echo ""
    echo "💡 Tips:"
    echo "   - Use the password you set in .env to access the gallery"
    echo "   - The admin panel is hidden and only accessible via direct URL"
    echo "   - Upload photos and videos through the admin panel"
    echo ""
    echo "🛠️  Management commands:"
    echo "   View logs:    docker-compose logs -f"
    echo "   Stop:         docker-compose down"
    echo "   Restart:      docker-compose restart"
    echo ""
    echo "Made with 💖 for preserving beautiful memories!"
else
    echo "❌ Something went wrong. Check the logs:"
    echo "   docker-compose logs"
    exit 1
fi