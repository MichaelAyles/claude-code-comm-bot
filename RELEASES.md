# Release Guidelines

## Creating a New Release

### Option 1: Using the Release Script (Recommended)
```bash
npm run release
```

This interactive script will:
1. Prompt for new version (or auto-increment)
2. Update package.json and CLAUDE.md
3. Build and package the extension
4. Create git commit and tag
5. Provide instructions for pushing to GitHub

### Option 2: Manual Release
```bash
# Update version
npm version patch  # or minor/major

# Build
npm run compile
npm run package

# Create git tag
git tag -a v0.1.7 -m "Release version 0.1.7"

# Push
git push origin main
git push origin v0.1.7
```

### Option 3: Quick Patch Release
```bash
npm run release:patch  # Auto-increment patch version
npm run release:minor  # Increment minor version
npm run release:major  # Increment major version
```

## GitHub Actions

When you push a tag starting with `v` (e.g., `v0.1.7`), GitHub Actions will automatically:
1. Build the extension
2. Run tests
3. Package the VSIX file
4. Create a GitHub release
5. Upload the VSIX as a release asset

## Manual GitHub Release

If the action fails or you prefer manual control:

1. Go to [GitHub Releases](https://github.com/yourusername/claude-code-comm-bot/releases)
2. Click "Create a new release"
3. Choose the tag you created
4. Set release title: "Release v0.1.7"
5. Add release notes (copy from CLAUDE.md)
6. Upload the VSIX file
7. Publish release

## Version Numbering

Follow semantic versioning:
- **Patch** (0.0.X): Bug fixes, minor updates
- **Minor** (0.X.0): New features, backwards compatible
- **Major** (X.0.0): Breaking changes

## Pre-release Checklist

- [ ] Update version in package.json
- [ ] Update CLAUDE.md with changes
- [ ] Run `npm run lint`
- [ ] Run `npm run compile`
- [ ] Test the extension locally
- [ ] Remove old VSIX files
- [ ] Commit all changes
- [ ] Create version tag

## Post-release

1. Verify GitHub release was created
2. Download and test the VSIX from releases
3. Update any documentation
4. Announce in relevant channels