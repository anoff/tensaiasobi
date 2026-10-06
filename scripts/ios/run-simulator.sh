#!/usr/bin/env bash
# Build tensaiasobi and start it in the iOS Simulator. No Apple ID needed.
#
#   npm run ios:sim [-- options]
#     --simulator NAME   simulator name or UDID (default: IOS_SIMULATOR, else a booted
#                        iPhone, else an iPhone on the newest iOS)
#     --skip-web         reuse the web build already copied into ios/App
#
# Debug build: Safari → Develop → Simulator shows the Web Inspector.

# shellcheck source=lib.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

skip_web=0
while [ $# -gt 0 ]; do
  case "$1" in
    --simulator)
      [ $# -ge 2 ] || die "--simulator needs a name"
      IOS_SIMULATOR="$2"
      shift
      ;;
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
require_node

sim="$(xcrun simctl list devices available --json | WANT="$IOS_SIMULATOR" node -e '
  const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
  const want = (process.env.WANT || "").toLowerCase();
  const sims = [];
  for (const [runtime, list] of Object.entries(data.devices || {})) {
    const m = runtime.match(/SimRuntime\.iOS-(\d+)-(\d+)/);
    if (!m) continue;
    for (const d of list) sims.push({ ...d, major: +m[1], minor: +m[2] });
  }
  const pick = sims
    .filter((d) => (want ? [d.name, d.udid].some((v) => v.toLowerCase() === want) : d.name.startsWith("iPhone")))
    .sort((a, b) => (b.state === "Booted") - (a.state === "Booted") || b.major - a.major || b.minor - a.minor)[0];
  if (pick) console.log(pick.udid + "\t" + pick.name);
')"
[ -n "$sim" ] || die "No ${IOS_SIMULATOR:-iPhone} simulator found. Add one in Xcode → Window → Devices and Simulators,
  or install the iOS runtime: xcodebuild -downloadPlatform iOS"
sim_udid="$(printf '%s' "$sim" | cut -f1)"
sim_name="$(printf '%s' "$sim" | cut -f2)"

[ "$skip_web" = 1 ] || sync_web

info "Building for $sim_name…"
derived="$DERIVED_DATA/simulator"
run_xcodebuild -project "$XCODE_PROJECT" -scheme "$SCHEME" -configuration Debug \
  -destination "id=$sim_udid" -derivedDataPath "$derived" \
  PRODUCT_BUNDLE_IDENTIFIER="$IOS_BUNDLE_ID" CURRENT_PROJECT_VERSION="$(build_number)" \
  build

info "Starting $sim_name…"
xcrun simctl bootstatus "$sim_udid" -b >/dev/null
open -a Simulator
xcrun simctl install "$sim_udid" "$derived/Build/Products/Debug-iphonesimulator/App.app"
xcrun simctl launch "$sim_udid" "$IOS_BUNDLE_ID" >/dev/null
ok "tensaiasobi is running in $sim_name"
