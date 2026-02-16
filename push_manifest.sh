#!/bin/bash

# Exit on error
set -e

# Ensure we are in the project root
cd "$(dirname "$0")"

# 1. Determine ALPACA_VERSION
# Priority: 1. Environment variable, 2. .env file, 3. package.json

# Load .env file if it exists and export variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

if [ -n "$ALPACA_VERSION" ]; then
    echo "Using ALPACA_VERSION from environment/.env"
elif [ -f .env ]; then
    # Try to get from .env file
    ALPACA_VERSION=$(grep '^ALPACA_VERSION=' .env | cut -d'=' -f2 | tr -d ' \'\"")
    if [ -n "$ALPACA_VERSION" ]; then
        echo "Using ALPACA_VERSION from .env file"
    fi
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

# 2. Create and push versioned manifest
echo "Creating manifest for version $ALPACA_VERSION..."
docker manifest create tabishz/alpaca-bookmarks:$ALPACA_VERSION \
    --amend tabishz/alpaca-bookmarks:amd64-$ALPACA_VERSION \
    --amend tabishz/alpaca-bookmarks:arm64-$ALPACA_VERSION

echo "Pushing manifest for version $ALPACA_VERSION..."
docker manifest push tabishz/alpaca-bookmarks:$ALPACA_VERSION

# 3. Create and push latest manifest
echo "Creating manifest for latest..."
docker manifest create tabishz/alpaca-bookmarks:latest \
    --amend tabishz/alpaca-bookmarks:amd64-$ALPACA_VERSION \
    --amend tabishz/alpaca-bookmarks:arm64-$ALPACA_VERSION

echo "Pushing manifest for latest..."
docker manifest push tabishz/alpaca-bookmarks:latest

echo "Successfully created and pushed multi-arch manifests for version $ALPACA_VERSION and latest"
