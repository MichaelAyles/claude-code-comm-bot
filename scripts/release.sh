#!/bin/bash

# Release script for Claude Discord Chat VS Code Extension

set -e

echo "🚀 Claude Discord Chat Release Script"
echo "===================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this script from the project root."
    exit 1
fi

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📌 Current version: $CURRENT_VERSION"

# Ask for new version
echo ""
read -p "Enter new version (or press Enter to auto-increment): " NEW_VERSION

if [ -z "$NEW_VERSION" ]; then
    # Auto-increment patch version
    IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
    MAJOR=${VERSION_PARTS[0]}
    MINOR=${VERSION_PARTS[1]}
    PATCH=${VERSION_PARTS[2]}
    NEW_PATCH=$((PATCH + 1))
    NEW_VERSION="$MAJOR.$MINOR.$NEW_PATCH"
fi

echo "📦 New version will be: $NEW_VERSION"
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Release cancelled"
    exit 1
fi

# Update package.json version
echo "📝 Updating package.json..."
npm version $NEW_VERSION --no-git-tag-version

# Update CLAUDE.md with new version
echo "📝 Updating CLAUDE.md..."
sed -i.bak "s/## 📌 Current Version: .*/## 📌 Current Version: $NEW_VERSION/" CLAUDE.md
rm CLAUDE.md.bak

# Clean and build
echo "🧹 Cleaning old builds..."
rm -f *.vsix
rm -rf out/

echo "🔨 Building extension..."
npm run compile

echo "📦 Packaging extension..."
npm run package

# Check if VSIX was created
VSIX_FILE="claude-discord-chat-${NEW_VERSION}.vsix"
if [ ! -f "$VSIX_FILE" ]; then
    echo "❌ Error: VSIX file not created"
    exit 1
fi

echo "✅ Successfully built: $VSIX_FILE"

# Git operations
echo ""
echo "📊 Git status:"
git status --short

echo ""
read -p "Commit and tag these changes? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    git add package.json CLAUDE.md
    git commit -m "Release v$NEW_VERSION"
    git tag -a "v$NEW_VERSION" -m "Release version $NEW_VERSION"
    
    echo ""
    echo "✅ Changes committed and tagged"
    echo ""
    echo "📤 To push and trigger GitHub release:"
    echo "   git push origin main"
    echo "   git push origin v$NEW_VERSION"
else
    echo "⚠️  Changes not committed. You can commit manually later."
fi

echo ""
echo "🎉 Release preparation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Test the extension: code --install-extension $VSIX_FILE"
echo "2. Push to GitHub: git push origin main && git push origin v$NEW_VERSION"
echo "3. The GitHub Action will automatically create a release"
echo "4. Or manually upload $VSIX_FILE to GitHub releases"