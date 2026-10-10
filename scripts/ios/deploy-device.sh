#!/usr/bin/env bash
# Build tensaiasobi, sign it with your Apple ID (a free one is fine) and install
# it on your iPhone or iPad, over the cable or Wi-Fi.
#
#   npm run ios:device [-- options]
#     --device NAME   iPhone/iPad name or UDID; repeat for several devices
#                     (default: IOS_DEVICE in ios/local.env, comma-separated,
#                     else the first reachable device)
#     --debug         Debug build: Safari → Develop → <iPhone> shows the Web Inspector
#     --skip-web      reuse the web build already copied into ios/App
#     --no-launch     install only, don't open the app
#
# Free Apple IDs sign for 7 days. Run this again before then (your kids'
# progress survives), or let 'npm run ios:auto-refresh -- install' do it.

# shellcheck source=lib.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

configuration=Release
launch=1
skip_web=0
targets=""
while [ $# -gt 0 ]; do
  case "$1" in
    --device)
      [ $# -ge 2 ] || die "--device needs a name or UDID"
      targets="$targets$2
"
      shift
      ;;
    --debug) configuration=Debug ;;
    --skip-web) skip_web=1 ;;
    --no-launch) launch=0 ;;
    -h | --help)
      sed -n '2,/^$/s/^# \{0,1\}//p' "$0"
      exit 0
      ;;
    *) die "Unknown option: $1 (see --help)" ;;
  esac
  shift
done
[ -n "$targets" ] || targets="$(printf '%s' "$IOS_DEVICE" | tr ',' '\n')"

require_macos
require_xcode >/dev/null
require_node
ensure_team_id

# Resolve every target before the slow build, so a missing iPhone fails fast.
devices=""
if [ -z "$targets" ]; then
  pick_device ""
  devices="$DEVICE_UDID	$DEVICE_NAME"
else
  while IFS= read -r target <&4; do
    [ -n "$target" ] || continue
    pick_device "$target"
    devices="$devices$DEVICE_UDID	$DEVICE_NAME
"
  done 4<<EOF
$targets
EOF
fi

[ "$skip_web" = 1 ] || sync_web
drop_expiring_profiles

derived="$DERIVED_DATA/device"
app="$derived/Build/Products/$configuration-iphoneos/App.app"
# FD 3 keeps xcodebuild/devicectl from reading the device list on stdin.
while IFS="$(printf '\t')" read -r udid name <&3; do
  [ -n "$udid" ] || continue
  info "Building $IOS_BUNDLE_ID ($configuration) for $name, team $IOS_TEAM_ID…"
  # Building for this exact device lets Xcode register it with your team and
  # put it into the (free) provisioning profile.
  run_xcodebuild -project "$XCODE_PROJECT" -scheme "$SCHEME" -configuration "$configuration" \
    -destination "id=$udid" -derivedDataPath "$derived" \
    -allowProvisioningUpdates -allowProvisioningDeviceRegistration \
    DEVELOPMENT_TEAM="$IOS_TEAM_ID" PRODUCT_BUNDLE_IDENTIFIER="$IOS_BUNDLE_ID" \
    CODE_SIGN_STYLE=Automatic CURRENT_PROJECT_VERSION="$(build_number)" \
    build

  info "Installing on $name…"
  xcrun devicectl device install app --device "$udid" "$app" >/dev/null ||
    die "Installing on $name failed (see above). Unlock it and try again."
  record_deploy "$udid" "$name" "$app"

  if [ "$launch" = 1 ]; then
    if xcrun devicectl device process launch --device "$udid" --terminate-existing "$IOS_BUNDLE_ID" >/dev/null 2>&1; then
      ok "tensaiasobi is running on $name"
    else
      warn "Installed, but iOS wouldn't open it. First install? On the device go to Settings → General →
  VPN & Device Management → Apple Development: <your Apple ID> → Trust, then tap the app.
  (A locked screen blocks this too; just open the app yourself.)"
    fi
  fi
done 3<<EOF
$devices
EOF
