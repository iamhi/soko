#!/bin/bash

# Navigate to the script's directory
cd "$(dirname "$0")"

echo "Starting Soko with nohup..."
nohup node server.js > nohup.out 2>&1 &
PID=$!
echo $PID > soko.pid

echo "Soko is now running in the background with PID $PID!"
echo "Check the logs using: tail -f nohup.out"
