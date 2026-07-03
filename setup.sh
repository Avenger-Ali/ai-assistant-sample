#!/bin/bash
# Shadow AI v2.0 — Quick Setup Script
# Run: chmod +x setup.sh && ./setup.sh

echo ""
echo "🌑 Shadow AI v2.0 — Setup"
echo "=================================="
echo ""

# Check Node
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Install from https://nodejs.org (v18+)"
  exit 1
fi
NODE_VER=$(node -v)
echo "✅ Node.js $NODE_VER"

# Check npm
if ! command -v npm &> /dev/null; then
  echo "❌ npm not found."
  exit 1
fi
echo "✅ npm $(npm -v)"

# Install server deps
echo ""
echo "📦 Installing server dependencies..."
cd server && npm install --silent
echo "✅ Server dependencies installed"
cd ..

# Install client deps
echo ""
echo "📦 Installing client dependencies..."
cd client && npm install --silent
echo "✅ Client dependencies installed"
cd ..

# Setup .env
if [ ! -f server/.env ]; then
  cp server/.env.example server/.env
  echo ""
  echo "⚙️  Created server/.env from example"
  echo "   → Edit server/.env to add your MongoDB URI and JWT secret"
else
  echo ""
  echo "ℹ️  server/.env already exists — skipping"
fi

echo ""
echo "=================================="
echo "✅ Setup complete!"
echo ""
echo "To start development:"
echo "  Terminal 1:  cd server && npm run dev"
echo "  Terminal 2:  cd client && npm start"
echo ""
echo "  Frontend:    http://localhost:3000"
echo "  Backend API: http://localhost:5000/api/health"
echo "  Mobile view: http://localhost:3000/mobile"
echo ""
echo "Default free account: 10 credits on signup"
echo "=================================="
