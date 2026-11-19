#!/usr/bin/env bash
set -e

echo "=================================================="
echo "🎓 Starting Personal AI Teacher Platform"
echo "=================================================="

# Check Python 3
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: python3 is not installed. Please install Python 3.11+."
    exit 1
fi

# Set up virtual environment
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

echo "📦 Installing backend Python dependencies..."
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r backend/requirements.txt

# Check Node.js
if command -v npm &> /dev/null; then
    echo "📦 Installing frontend Node dependencies..."
    cd frontend
    npm install
    echo "🔨 Building frontend bundle..."
    npm run build
    cd ..
else
    echo "⚠️ npm not found, skipping frontend rebuild (using prebuilt dist if available)"
fi

echo ""
echo "🚀 Launching Personal AI Teacher Server on http://localhost:8000"
echo "API Docs available at: http://localhost:8000/docs"
echo "Press Ctrl+C to stop."
echo "=================================================="

PYTHONPATH=backend ./venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
