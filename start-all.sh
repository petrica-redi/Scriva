#!/bin/bash
# Start all services - MindCare, MedScribe, AI Pipeline

WORKSPACE="/Users/bot/.openclaw/workspace"
LOG_DIR="$WORKSPACE/logs"
mkdir -p "$LOG_DIR"

# Kill any existing instances
pkill -f "next dev" 2>/dev/null
pkill -f "uvicorn main:app" 2>/dev/null
sleep 2

# Start MindCare (port 3000)
cd "$WORKSPACE/MindCare/MindCare AI v1"
nohup npm run dev > "$LOG_DIR/mindcare.log" 2>&1 &
echo "MindCare PID: $!"

# Start MedScribe (port 3001)
cd "$WORKSPACE/MedScribe/medscribe-ai-main"
nohup npx next dev --experimental-https --experimental-https-key key.pem --experimental-https-cert cert.pem -p 3001 > "$LOG_DIR/medscribe.log" 2>&1 &
echo "MedScribe PID: $!"

# Start AI Pipeline (port 8000)
cd "$WORKSPACE/MedScribe/medscribe-ai-main/services/ai-pipeline"
source venv/bin/activate
nohup python -m uvicorn main:app --host 0.0.0.0 --port 8000 > "$LOG_DIR/ai-pipeline.log" 2>&1 &
echo "AI Pipeline PID: $!"

echo ""
echo "✅ All services started!"
echo "  MindCare:    http://10.211.55.3:3000"
echo "  MedScribe:   https://10.211.55.3:3001"
echo "  AI Pipeline: http://10.211.55.3:8000"
echo ""
echo "Logs: $LOG_DIR/"
