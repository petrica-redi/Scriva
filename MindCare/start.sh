#!/bin/bash
cd "/Users/bot/.openclaw/workspace/MindCare/MindCare AI v1"

# Kill any existing processes
lsof -ti:3000 | xargs kill -9 2>/dev/null
pkill -f cloudflared 2>/dev/null
sleep 1

# Start Next.js
nohup npx next dev > /tmp/mindcare-next.log 2>&1 &
NEXT_PID=$!
echo "Next.js started (PID: $NEXT_PID)"

# Wait for it to be ready
sleep 5

# Start cloudflared
nohup cloudflared tunnel --url http://localhost:3000 > /tmp/mindcare-tunnel.log 2>&1 &
TUNNEL_PID=$!
echo "Cloudflared started (PID: $TUNNEL_PID)"

# Save PIDs
echo "$NEXT_PID" > /tmp/mindcare-next.pid
echo "$TUNNEL_PID" > /tmp/mindcare-tunnel.pid

echo "Both services running. Logs: /tmp/mindcare-next.log, /tmp/mindcare-tunnel.log"
