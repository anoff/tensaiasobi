#!/usr/bin/env bash
# Build an unsigned ios/App/output/tensaiasobi-unsigned.ipa. iPhones only run
# signed apps, so install it with a sideloading tool (SideStore, AltStore,
# Sideloadly) that signs it with your own Apple ID. Needs no Apple account here.
# The GitHub workflow (.github/workflows/ios.yml) runs this on every push to master.
#
#   npm run ios:ipa [-- --skip-web]

# shellcheck source=lib.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

skip_web=0
while [ $# -gt 0 ]; do
  case "$1" in
    --skip-web) skip_web=1 ;;
    -h | --help)
      sed -n '2,/^$/s/^# \{0,1\}//p' "$0"
      exit 0
      ;;
    *) die "Unknown option: $1 (see --help)" ;;
  esac
  shift
done

require_macos
require_xcode >/dev/null
[ "$skip_web" = 1 ] || sync_web

info "Building the unsigned Release app…"
derived="$DERIVED_DATA/unsigned"
run_xcodebuild -project "$XCODE_PROJECT" -scheme "$SCHEME" -configuration Release \
  -destination 'generic/platform=iOS' -derivedDataPath "$derived" \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY= \
  PRODUCT_BUNDLE_IDENTIFIER="$IOS_BUNDLE_ID" CURRENT_PROJECT_VERSION="$(build_number)" \
  build
app="$derived/Build/Products/Release-iphoneos/App.app"

# An .ipa is a zip with the app inside a Payload folder.
staging="$(mktemp -d)"
mkdir "$staging/Payload"
ditto "$app" "$staging/Payload/App.app"
mkdir -p "$OUTPUT_DIR"
ipa="$OUTPUT_DIR/tensaiasobi-unsigned.ipa"
rm -f "$ipa"
(cd "$staging" && zip -qry "$ipa" Payload)
rm -rf "$staging"

version="$(plutil -extract CFBundleShortVersionString raw -o - "$app/Info.plist")"
build="$(plutil -extract CFBundleVersion raw -o - "$app/Info.plist")"
ok "Built $ipa: version $version ($build), $(du -h "$ipa" | cut -f1 | tr -d ' ')"
# In GitHub Actions, hand version and build number to later steps.
[ -z "${GITHUB_OUTPUT-}" ] || printf 'version=%s\nbuild=%s\n' "$version" "$build" >>"$GITHUB_OUTPUT"
