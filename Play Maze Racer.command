#!/bin/bash
cd "$(dirname "$0")"
echo "Starting Maze Racer server..."

# Start server in the background
npx serve . -l 8080 &
SERVER_PID=$!

# Wait until the server is actually responding
for i in {1..15}; do
  if curl -s -o /dev/null http://localhost:8080 2>/dev/null; then
    echo "Server ready! Opening browser..."
    open http://localhost:8080
    break
  fi
  sleep 0.5
done

# Bring server back to foreground so Ctrl+C works and closing terminal stops it
wait $SERVER_PID
