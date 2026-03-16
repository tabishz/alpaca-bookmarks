#!/bin/bash

# Exit on error
set -e

# Ensure we are in the project root
cd "$(dirname "$0")"

# 1. Grab version from frontend/package.json
# We use a simple grep/sed combo to avoid requiring 'jq'
VERSION=$(grep '"version":' frontend/package.json | head -1 | awk -F: '{ print $2 }' | sed 's/[", ]//g')

if [ -z "$VERSION" ]; then
    echo "Error: Could not extract version from frontend/package.json"
    exit 1
fi

IMAGE_TAG="tabishz/alpaca-bookmarks:amd64-$VERSION"

echo "Detected Version: $VERSION"
echo "Building Image: $IMAGE_TAG"

# 2. Build for linux/amd64
# Load the image locally first, then push it to the registry
docker buildx build --platform linux/amd64 -t "$IMAGE_TAG" --load .
docker push "$IMAGE_TAG"

echo "Successfully built and pushed $IMAGE_TAG"
