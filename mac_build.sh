#!/bin/bash

# Exit on error
set -e

PLATFORM="linux/arm64"
REGISTRY="tabishz"

while [[ $# -gt 0 ]]; do
    case $1 in
        --platform)
            PLATFORM="linux/$2"
            shift 2
            ;;
        --registry)
            REGISTRY="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--platform amd64] [--registry hq.truthful.men]"
            exit 1
            ;;
    esac
done

# Ensure we are in the project root
cd "$(dirname "$0")"

# 1. Grab version from frontend/package.json
# We use a simple grep/sed combo to avoid requiring 'jq'
VERSION=$(grep '"version":' frontend/package.json | head -1 | awk -F: '{ print $2 }' | sed 's/[", ]//g')

if [ -z "$VERSION" ]; then
    echo "Error: Could not extract version from frontend/package.json"
    exit 1
fi

TAG_SUFFIX='arm64'
if [[ $PLATFORM == *"amd64"* ]]; then
    TAG_SUFFIX="amd64"
fi

IMAGE_TAG="$REGISTRY/alpaca-bookmarks:$TAG_SUFFIX-$VERSION"

echo "Detected Version: $VERSION"
echo "Building Image: $IMAGE_TAG"

# 2. Build for linux/arm64 on macOS
# Load the image locally first, then push it to the registry
docker-buildx build --platform $PLATFORM -t "$IMAGE_TAG" --load .
docker push "$IMAGE_TAG"

echo "Successfully built and pushed $IMAGE_TAG"
