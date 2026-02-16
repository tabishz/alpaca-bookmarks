#!/bin/bash

# Exit on error
set -e

# Ensure we are in the project root
cd "$(dirname "$0")"

# 1. Determine ALPACA_VERSION
# Priority: 1. Environment variable, 2. .env file, 3. package.json

# Load .env file if it exists and export variables
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

if [ -n "$ALPACA_VERSION" ]; then
    echo "Using ALPACA_VERSION from environment/.env"
fi

# Fallback to package.json if not found
if [ -z "$ALPACA_VERSION" ]; then
    # We use a simple grep/sed combo to avoid requiring 'jq'
    ALPACA_VERSION=$(grep '"version":' frontend/package.json | head -1 | awk -F: '{ print $2 }' | sed 's/[", ]//g')
    echo "Using version from package.json"
fi

if [ -z "$ALPACA_VERSION" ]; then
    echo "Error: Could not determine ALPACA_VERSION"
    exit 1
fi

echo "Detected Version: $ALPACA_VERSION"

# Determine docker buildx command based on OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    DOCKER_BUILDX="docker-buildx"
else
    DOCKER_BUILDX="docker buildx"
fi

# 2. Create and push versioned manifest using buildx imagetools
echo "Creating manifest for version $ALPACA_VERSION..."
$DOCKER_BUILDX imagetools create \
    -t tabishz/alpaca-bookmarks:$ALPACA_VERSION \
    tabishz/alpaca-bookmarks:amd64-$ALPACA_VERSION \
    tabishz/alpaca-bookmarks:arm64-$ALPACA_VERSION

# 3. Create and push latest manifest using buildx imagetools
echo "Creating manifest for latest..."
$DOCKER_BUILDX imagetools create \
    -t tabishz/alpaca-bookmarks:latest \
    tabishz/alpaca-bookmarks:amd64-$ALPACA_VERSION \
    tabishz/alpaca-bookmarks:arm64-$ALPACA_VERSION

echo "Successfully created and pushed multi-arch manifests for version $ALPACA_VERSION and latest"
