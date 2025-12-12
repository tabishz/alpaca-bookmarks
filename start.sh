#!/bin/sh

# 1. Start the Go Backend in the background
# We log output to a file or stdout (simpler)
echo "Starting Bookmarks Manager Backend..."
/usr/local/bin/bookmarks-manager &

# 2. Wait a moment for the backend to initialize (optional but safe)
sleep 2

# 3. Start Caddy in the foreground
# This keeps the container running. If Caddy dies, the container dies.
echo "Starting Caddy..."
caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
