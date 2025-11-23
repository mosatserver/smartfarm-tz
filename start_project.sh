#!/bin/bash

# SmartFarm TZ - Complete Project Startup Script
# This script starts both frontend and backend services

echo "🌱 Starting SmartFarm TZ Project..."
echo "=================================="

# Kill any existing processes on ports 5000 and 5173
echo "🧹 Cleaning up existing processes..."
lsof -ti:5000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
sleep 2

# Check if database is accessible
echo "🗄️ Checking database connection..."
cd /home/mosat/smartfarm-tz/server
if ! npm run check-db 2>/dev/null; then
    echo "⚠️ Database connection issue detected. Please ensure MySQL is running."
    echo "   Run: sudo systemctl start mysql"
fi

# Start backend server
echo "🚀 Starting backend server (port 5000)..."
cd /home/mosat/smartfarm-tz/server
npm start &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Check if backend started successfully
if ps -p $BACKEND_PID > /dev/null; then
    echo "✅ Backend server started successfully"
else
    echo "❌ Backend server failed to start"
    exit 1
fi

# Start frontend server
echo "🎨 Starting frontend server (port 5173)..."
cd /home/mosat/smartfarm-tz
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 3

# Check if frontend started successfully
if ps -p $FRONTEND_PID > /dev/null; then
    echo "✅ Frontend server started successfully"
else
    echo "❌ Frontend server failed to start"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎉 SmartFarm TZ is now running!"
echo "================================"
echo "📱 Frontend: http://localhost:5173"
echo "🔌 Backend API: http://localhost:5000"
echo "🤖 AI Service: Ready for crop health analysis"
echo ""
echo "ℹ️ Features available:"
echo "   • User authentication and profiles"
echo "   • Weather monitoring"
echo "   • Crop health analysis (powered by PyTorch)"
echo "   • Market prices"
echo "   • Community features"
echo "   • Multi-language support (English/Swahili)"
echo ""
echo "⏹️ Press Ctrl+C to stop all services"

# Keep script running and handle cleanup
cleanup() {
    echo ""
    echo "🛑 Stopping SmartFarm TZ services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait
