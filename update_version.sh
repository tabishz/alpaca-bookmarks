#!/bin/bash

# Check if version argument is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <new_version>"
    echo "Example: $0 0.2.2-beta"
    exit 1
fi

NEW_VERSION=$1
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Updating version to $NEW_VERSION..."

# 1. Update Version in cmd/server/main.go
# macOS (darwin) sed requires -i ''
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/const Version = \".*\"/const Version = \"$NEW_VERSION\"/" "$SCRIPT_DIR/cmd/server/main.go"
else
    sed -i "s/const Version = \".*\"/const Version = \"$NEW_VERSION\"/" "$SCRIPT_DIR/cmd/server/main.go"
fi

# 2. Update Version in README.md (line after "## Version")
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' '/^## Version$/{n;s/.*/'$NEW_VERSION'/;}' "$SCRIPT_DIR/README.md"
else
    sed -i '/^## Version$/{n;s/.*/'$NEW_VERSION'/;}' "$SCRIPT_DIR/README.md"
fi

# 3. Update ALPACA_VERSION in .env file
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/^ALPACA_VERSION=.*/ALPACA_VERSION=$NEW_VERSION/" "$SCRIPT_DIR/.env"
else
    sed -i "s/^ALPACA_VERSION=.*/ALPACA_VERSION=$NEW_VERSION/" "$SCRIPT_DIR/.env"
fi

# 4. Update Version in frontend/package.json and run npm install
cd "$SCRIPT_DIR/frontend" || exit
npm version --no-git-tag-version "$NEW_VERSION"
npm install

echo "Successfully updated version to $NEW_VERSION in Go backend, Frontend, README, and .env."
