#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Check if there are uncommitted changes.
if ! git diff-index --quiet HEAD --; then
  echo "You have uncommitted changes. Please commit or stash them before publishing."
  exit 1
fi

# Run the release script
npm run release

# Push the changes and tags to the remote repository
git push --follow-tags origin project-v2

# Publish the package to npm
npm publish

echo "Package published successfully."
