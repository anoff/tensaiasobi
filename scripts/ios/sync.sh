#!/usr/bin/env bash
# Build the web app for iOS and copy it into the Xcode project (ios/App).
# Run this before working in Xcode directly; the other ios:* scripts do it themselves.
#
#   npm run ios:sync
#   npm run ios:open     # sync, then open the project in Xcode

# shellcheck source=lib.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

sync_web
ok "ios/App is up to date."
