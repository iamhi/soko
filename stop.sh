#!/bin/bash

# Navigate to the script's directory
cd "$(dirname "$0")"

if [ -f soko.pid ]; then
  PID=$(cat soko.pid)
  echo "Stopping Soko (PID: $PID)..."
  kill $PID
  rm soko.pid
  echo "Stopped."
else
  echo "Soko PID file not found. It might not be running or was started manually."
  # Fallback to pkill if process is running but pid file is missing
  echo "Attempting to kill via process name..."
  pkill -f "node server.js" && echo "Stopped via pkill." || echo "No matching process found."
fi
