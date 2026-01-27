#!/bin/bash

# Script to set up your own GitHub repository
# Replace YOUR_USERNAME and YOUR_REPO_NAME with your actual values

echo "🚀 Setting up your own GitHub repository..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git not initialized. Run 'git init' first."
    exit 1
fi

# Show current remote
echo "📋 Current remote:"
git remote -v

# Ask for new repository details
read -p "Enter your GitHub username: " GITHUB_USERNAME
read -p "Enter your repository name: " REPO_NAME

# Remove old remote
echo "🗑️  Removing old remote..."
git remote remove origin 2>/dev/null || echo "No old remote to remove"

# Add new remote
echo "➕ Adding new remote..."
git remote add origin "https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git"

# Verify
echo "✅ New remote:"
git remote -v

echo ""
echo "📝 Next steps:"
echo "1. Create the repository on GitHub: https://github.com/new"
echo "2. Name it: ${REPO_NAME}"
echo "3. DO NOT initialize with README, .gitignore, or license"
echo "4. Then run: git push -u origin main"
echo ""
echo "Or if you've already created the repo, run:"
echo "  git add ."
echo "  git commit -m 'Initial commit: HRMS application'"
echo "  git push -u origin main"
