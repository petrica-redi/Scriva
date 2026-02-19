#!/bin/bash
# Auto-restart wrapper for MindCare HTTPS server
cd "$(dirname "$0")"

while true; do
  echo "[$(date)] Starting MindCare HTTPS server..."
  node server.js
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE. Restarting in 3 seconds..."
  sleep 3
done
