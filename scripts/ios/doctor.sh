#!/usr/bin/env bash
# Check this Mac for everything an iOS build needs, fix what can be fixed
# automatically (npm packages, ios/local.env with your signing team) and say
# what to do about the rest.
#
#   npm run ios:doctor

# shellcheck source=lib.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

problems=0
problem() {
  warn "$*"
  problems=$((problems + 1))
}

require_macos

echo "Xcode"
if xcode_version="$(require_xcode)"; then
  ok "Xcode $xcode_version ($(xcode-select -p))"
  xcodebuild -checkFirstLaunchStatus >/dev/null 2>&1 ||
    problem "Xcode still has to finish installing. Run: sudo xcodebuild -runFirstLaunch"
  xcodebuild -license check >/dev/null 2>&1 ||
    problem "Accept the Xcode license. Run: sudo xcodebuild -license accept"
  # grep without -q reads all input, so pipefail never sees a SIGPIPE.
  if xcodebuild -showsdks 2>/dev/null | grep -- '-sdk iphoneos' >/dev/null; then
    ok "iOS SDK installed"
  else
    problem "iOS platform missing. Run: xcodebuild -downloadPlatform iOS"
  fi
  if xcrun simctl list runtimes available 2>/dev/null | grep '^iOS' >/dev/null; then
    ok "iOS Simulator runtime installed"
  else
    warn "No iOS Simulator runtime (only needed for 'npm run ios:sim'): xcodebuild -downloadPlatform iOS"
  fi
else
  problems=$((problems + 1))
fi

echo
echo "Node.js"
if command -v node >/dev/null 2>&1; then
  node_version="$(node -p 'process.versions.node')"
  node_major="${node_version%%.*}"
  node_minor="$(printf '%s' "$node_version" | cut -d. -f2)"
  # Vite 8 needs ^20.19 or >= 22.12.
  if [ "$node_major" -gt 22 ] || { [ "$node_major" -eq 22 ] && [ "$node_minor" -ge 12 ]; } ||
    { [ "$node_major" -eq 20 ] && [ "$node_minor" -ge 19 ]; }; then
    ok "Node $node_version"
    ensure_node_deps
    ok "npm packages installed"
  else
    problem "Node $node_version is too old; install Node 22 LTS ('brew install node@22' or https://nodejs.org)."
  fi
else
  problem "Node.js not found; install Node 22 LTS ('brew install node@22' or https://nodejs.org)."
fi

echo
echo "Signing (free Apple ID is fine)"
[ -f "$LOCAL_ENV" ] || cp "$IOS_DIR/local.env.example" "$LOCAL_ENV"
teams="$(list_teams | awk -F '\t' '!seen[$1]++')"
if [ -n "$teams" ]; then
  printf '%s\n' "$teams" | while IFS="$(printf '\t')" read -r id name; do
    printf '    %s  %s\n' "$id" "$name"
  done
fi
if (ensure_team_id); then
  [ -n "$IOS_TEAM_ID" ] || IOS_TEAM_ID="$(awk -F= '$1 == "IOS_TEAM_ID" { print $2 }' "$LOCAL_ENV")"
  ok "Team $IOS_TEAM_ID, bundle ID $IOS_BUNDLE_ID (settings: ios/local.env)"
else
  problems=$((problems + 1))
fi

echo
echo "Devices"
devices="$(list_devices)"
if [ -z "$devices" ]; then
  problem "No iPhone/iPad paired yet. Connect it with a cable, unlock it and tap \"Trust\", then run this again."
else
  printf '%s\n' "$devices" | while IFS="$(printf '\t')" read -r udid name link dev_mode; do
    expires="$(cat "$STATE_DIR/$udid.expires" 2>/dev/null || true)"
    signed=""
    [ -z "$expires" ] || signed=", our build signed until $(format_epoch "$expires")"
    printf '    %s (%s): %s, Developer Mode %s%s\n' "$name" "$udid" "$link" "$dev_mode" "$signed"
  done
  if printf '%s\n' "$devices" | awk -F '\t' '$4 == "disabled" { found = 1 } END { exit !found }'; then
    warn "Turn on Developer Mode on that device: Settings → Privacy & Security → Developer Mode (then restart)."
  fi
  printf '%s\n' "$devices" | awk -F '\t' '$3 != "offline" { found = 1 } END { exit !found }' ||
    warn "No device reachable right now: plug it in, or unlock it on the same Wi-Fi."
fi

echo
if [ "$problems" -eq 0 ]; then
  ok "Ready. Next: 'npm run ios:device' (iPhone) or 'npm run ios:sim' (Simulator)."
else
  die "Fix the $problems item(s) above, then run 'npm run ios:doctor' again."
fi
