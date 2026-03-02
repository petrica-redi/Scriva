#!/bin/bash
# ============================================================
#  MindCare AI — One-Click Launcher
#
#  HOW TO USE:
#    Just double-click this file. That's it.
#    It will build the project, then open the app
#    in your browser automatically.
#
#  TO STOP:
#    Close this terminal window, or press Ctrl+C.
# ============================================================

cd "$(dirname "$0")"

clear
echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║                                          ║"
echo "  ║           MindCare AI  v1                ║"
echo "  ║       AI-Powered Medical Scribe          ║"
echo "  ║                                          ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

# ----------------------------------------------------------
# Step 1: Check that Node.js is installed
# ----------------------------------------------------------
echo "  [1/4]  Checking prerequisites..."
echo ""

if ! command -v node &> /dev/null; then
    echo "  ❌  Node.js is not installed."
    echo ""
    echo "  Please install it first:"
    echo "    → Download from https://nodejs.org (LTS version)"
    echo "    → Or run: brew install node"
    echo ""
    read -p "  Press Enter to close..."
    exit 1
fi

echo "         Node.js $(node -v)  ✓"
echo "         npm     $(npm -v 2>/dev/null)  ✓"
echo ""

# ----------------------------------------------------------
# Step 2: Install dependencies (only if needed)
# ----------------------------------------------------------
echo "  [2/4]  Installing dependencies..."
echo ""

if [ ! -d "node_modules" ]; then
    echo "         First run detected — installing packages."
    echo "         This may take a minute..."
    echo ""
    npm install --loglevel=error
    if [ $? -ne 0 ]; then
        echo ""
        echo "  ❌  Failed to install dependencies."
        echo "     Check your internet connection and try again."
        echo ""
        read -p "  Press Enter to close..."
        exit 1
    fi
    echo ""
    echo "         Packages installed  ✓"
else
    echo "         Packages already installed  ✓"
fi
echo ""

# ----------------------------------------------------------
# Step 3: Build the project
# ----------------------------------------------------------
echo "  [3/4]  Building the application..."
echo "         (this takes about 20–30 seconds)"
echo ""

npm run build 2>&1 | while IFS= read -r line; do
    echo "         $line"
done
BUILD_EXIT=${PIPESTATUS[0]}

echo ""
if [ $BUILD_EXIT -ne 0 ]; then
    echo "  ❌  Build failed. See errors above."
    echo ""
    read -p "  Press Enter to close..."
    exit 1
fi
echo "         Build successful  ✓"
echo ""

# ----------------------------------------------------------
# Step 4: Start the server
# ----------------------------------------------------------
echo "  [4/4]  Starting the server..."
echo ""

# Free port 3000 if something is using it
existing_pid=$(lsof -ti:3000 2>/dev/null)
if [ -n "$existing_pid" ]; then
    echo "         Port 3000 was in use — freeing it..."
    kill -9 $existing_pid 2>/dev/null
    sleep 1
fi

# Check for .env.local
if [ ! -f ".env.local" ]; then
    echo "  ⚠  No .env.local file found."
    echo "     The app needs API keys to work fully."
    echo "     Copy .env.example → .env.local and add your keys."
    echo ""
fi

echo "  ┌──────────────────────────────────────────┐"
echo "  │                                          │"
echo "  │   App running at:                        │"
echo "  │                                          │"
echo "  │      http://localhost:3000               │"
echo "  │                                          │"
echo "  │   Opening your browser now...            │"
echo "  │   Close this window to stop the server.  │"
echo "  │                                          │"
echo "  └──────────────────────────────────────────┘"
echo ""

# Open browser after a short delay
(sleep 2 && open "http://localhost:3000") &

# Start the production server (uses the build we just made)
npm run start
