#!/bin/bash

# SmartFarm Tanzania - Quick Start Script
# This script helps you get the system up and running quickly

set -e

echo "🌱 SmartFarm Tanzania - Quick Start"
echo "=================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"

# Create environment files if they don't exist
if [ ! -f "server/.env" ]; then
    echo "📝 Creating backend environment file..."
    cat > server/.env << EOF
# Database Configuration
DB_HOST=db
DB_USER=user
DB_PASSWORD=password
DB_NAME=smartfarm
DB_PORT=3306

# AI Service
AI_SERVICE_URL=http://ai-service:8000

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_in_production

# File Upload
MAX_FILE_SIZE=50MB
UPLOAD_PATH=./uploads

# Payment Provider APIs (Tanzania) - Add your actual keys
MPESA_API_KEY=demo_mpesa_key
MPESA_PUBLIC_KEY=demo_mpesa_public_key
MPESA_SERVICE_PROVIDER_CODE=demo_service_provider

TIGO_API_KEY=demo_tigo_key
TIGO_API_SECRET=demo_tigo_secret

AIRTEL_API_KEY=demo_airtel_key
AIRTEL_API_SECRET=demo_airtel_secret
EOF
    echo "✅ Backend .env file created"
else
    echo "✅ Backend .env file already exists"
fi

if [ ! -f ".env" ]; then
    echo "📝 Creating frontend environment file..."
    cat > .env << EOF
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_AI_SERVICE_URL=http://localhost:8000
EOF
    echo "✅ Frontend .env file created"
else
    echo "✅ Frontend .env file already exists"
fi

# Create uploads directory
mkdir -p uploads
echo "✅ Uploads directory created"

# Ask user which mode to run
echo ""
echo "Choose deployment mode:"
echo "1) Development (recommended for testing)"
echo "2) Production (with Nginx reverse proxy)"
read -p "Enter your choice (1 or 2): " mode

case $mode in
    1)
        echo "🚀 Starting in Development mode..."
        echo "This will start:"
        echo "  - Frontend (React): http://localhost:3000"
        echo "  - Backend (API): http://localhost:5000"
        echo "  - AI Service: http://localhost:8000"
        echo "  - Database: localhost:3307"
        echo ""
        
        # Pull latest images and build
        docker-compose pull
        docker-compose up --build -d
        
        echo ""
        echo "✅ Services are starting up..."
        echo "⏳ Waiting for services to be ready..."
        
        # Wait for services to be ready
        sleep 10
        
        # Check service health
        echo "🔍 Checking service health..."
        
        # Check if services are running
        if docker-compose ps | grep -q "Up"; then
            echo "✅ Services are running!"
            echo ""
            echo "🌐 Access your application:"
            echo "  Frontend: http://localhost:3000"
            echo "  Backend API: http://localhost:5000/api"
            echo "  AI Service: http://localhost:8000"
            echo ""
            echo "📚 Features available:"
            echo "  - Marketplace with Tanzanian payment methods"
            echo "  - AI Plant Health Diagnosis (English/Swahili)"
            echo "  - User authentication and profiles"
            echo ""
            echo "📖 For more information, see DEPLOYMENT_GUIDE.md"
        else
            echo "⚠️  Some services may not be running properly."
            echo "Check logs with: docker-compose logs"
        fi
        ;;
    2)
        echo "🚀 Starting in Production mode..."
        echo "This will start all services behind Nginx reverse proxy"
        echo "Access: http://localhost"
        echo ""
        
        # Pull latest images and build
        docker-compose pull
        docker-compose --profile production up --build -d
        
        echo ""
        echo "✅ Production services are starting up..."
        echo "⏳ Waiting for services to be ready..."
        
        sleep 15
        
        if docker-compose ps | grep -q "Up"; then
            echo "✅ Services are running!"
            echo ""
            echo "🌐 Access your application: http://localhost"
            echo ""
            echo "📖 For more information, see DEPLOYMENT_GUIDE.md"
        else
            echo "⚠️  Some services may not be running properly."
            echo "Check logs with: docker-compose logs"
        fi
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again and choose 1 or 2."
        exit 1
        ;;
esac

echo ""
echo "🔧 Useful commands:"
echo "  View logs: docker-compose logs -f [service-name]"
echo "  Stop services: docker-compose down"
echo "  Restart a service: docker-compose restart [service-name]"
echo "  View running services: docker-compose ps"
echo ""
echo "🎉 SmartFarm Tanzania is ready to use!"
