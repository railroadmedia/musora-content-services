#!/bin/bash

# If this is giving you errors when trying to build on MWP after linking, try the more modern linking method of running
# "yarn link ../musora-content-services/" from the MWP directory.

# Define the paths (edit these paths according to your directory structure)
MUSORA_CONTENT_SERVICES_DIR="../musora-content-services"
MUSORA_WEB_PLATFORM_DIR="../musora-web-platform"

# Navigate to the musora-content-services directory and create a symlink
echo "Linking musora-content-services..."
cd "$MUSORA_CONTENT_SERVICES_DIR" || { echo "Directory not found: $MUSORA_CONTENT_SERVICES_DIR"; exit 1; }
npm link

# Navigate to the musora-web-platform directory and link the package
echo "Linking musora-content-services to musora-web-platform..."
cd "$MUSORA_WEB_PLATFORM_DIR" || { echo "Directory not found: $MUSORA_WEB_PLATFORM_DIR"; exit 1; }
npm link musora-content-services

echo "Symlink created successfully. You can now test your changes locally."

# Optional: List the linked packages to verify
npm ls musora-content-services