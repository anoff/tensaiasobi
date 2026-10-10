# shellcheck shell=bash
# Shared helpers for scripts/ios/*.sh — sourced, not run.
# Written for the stock macOS /bin/bash (3.2): no associative arrays, no mapfile.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IOS_DIR="$REPO_ROOT/ios"
XCODE_PROJECT="$IOS_DIR/App/App.xcodeproj"
SCHEME="App"
LOCAL_ENV="$IOS_DIR/local.env"
DERIVED_DATA="$IOS_DIR/DerivedData"
OUTPUT_DIR="$IOS_DIR/App/output"
STATE_DIR="$HOME/Library/Application Support/tensaiasobi-ios"
# Free-team provisioning profiles last 7 days; refresh when less than this is left.
REFRESH_WINDOW_HOURS=48

# ── Logging ──────────────────────────────────────────────────────────────────
if [ -t 1 ]; then
  _c_blue=$'\033[1;34m' _c_green=$'\033[1;32m' _c_yellow=$'\033[1;33m' _c_red=$'\033[1;31m' _c_off=$'\033[0m'
else
  _c_blue='' _c_green='' _c_yellow='' _c_red='' _c_off=''
fi
info() { printf '%s▸%s %s\n' "$_c_blue" "$_c_off" "$*"; }
ok() { printf '%s✓%s %s\n' "$_c_green" "$_c_off" "$*"; }
warn() { printf '%s!%s %s\n' "$_c_yellow" "$_c_off" "$*" >&2; }
die() {
  printf '%s✗%s %s\n' "$_c_red" "$_c_off" "$*" >&2
  exit 1
}

# ── Settings: environment > ios/local.env > defaults ─────────────────────────
_env_team="${IOS_TEAM_ID-}" _env_bundle="${IOS_BUNDLE_ID-}" _env_device="${IOS_DEVICE-}" _env_sim="${IOS_SIMULATOR-}"
if [ -f "$LOCAL_ENV" ]; then
  # shellcheck source=/dev/null
  . "$LOCAL_ENV"
fi
IOS_TEAM_ID="${_env_team:-${IOS_TEAM_ID:-}}"
IOS_BUNDLE_ID="${_env_bundle:-${IOS_BUNDLE_ID:-com.tensaiasobi.app}}"
IOS_DEVICE="${_env_device:-${IOS_DEVICE:-}}"
IOS_SIMULATOR="${_env_sim:-${IOS_SIMULATOR:-}}"

# Write KEY=VALUE into ios/local.env, creating it from the example if needed.
set_local_env() {
  local key="$1" value="$2" tmp
  [ -f "$LOCAL_ENV" ] || cp "$IOS_DIR/local.env.example" "$LOCAL_ENV"
  tmp="$(mktemp)"
  awk -v k="$key" -v v="$value" '
    $0 ~ "^" k "=" { print k "=" v; done = 1; next }
    { print }
    END { if (!done) print k "=" v }
  ' "$LOCAL_ENV" >"$tmp"
  mv "$tmp" "$LOCAL_ENV"
}

# ── Prerequisites ────────────────────────────────────────────────────────────
require_macos() {
  [ "$(uname -s)" = "Darwin" ] || die "This needs a Mac with Xcode. On other systems use the GitHub workflow (see AppStore.md)."
}

# Prints the Xcode version (e.g. 26.6), or dies with a fix if Xcode is missing or too old.
require_xcode() {
  local version
  if ! version="$(xcodebuild -version 2>/dev/null | awk 'NR == 1 { print $2 }')" || [ -z "$version" ]; then
    die "Xcode not found. Install it from the App Store, open it once, then run:
    sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"
  fi
  # Capacitor 8 needs Xcode 26.
  [ "${version%%.*}" -ge 26 ] || die "Xcode $version is too old; Capacitor 8 needs Xcode 26 or newer."
  printf '%s\n' "$version"
}

require_node() {
  command -v node >/dev/null 2>&1 || die "Node.js not found. Install Node 22 LTS (https://nodejs.org or 'brew install node@22')."
}

# npm ci when node_modules is missing or older than package-lock.json.
ensure_node_deps() {
  require_node
  if [ "$REPO_ROOT/package-lock.json" -nt "$REPO_ROOT/node_modules/.package-lock.json" ]; then
    info "Installing npm dependencies…"
    (cd "$REPO_ROOT" && npm ci --no-audit --no-fund)
  fi
}

# ── Build steps ──────────────────────────────────────────────────────────────
# Monotonic build number (CFBundleVersion): the commit count of HEAD.
build_number() {
  git -C "$REPO_ROOT" rev-list --count HEAD 2>/dev/null || echo 1
}

# Build the web app in iOS mode and copy it into the Xcode project.
sync_web() {
  ensure_node_deps
  info "Building the web app for iOS…"
  (cd "$REPO_ROOT" && GIT_HASH="${GIT_HASH:-$(git rev-parse HEAD 2>/dev/null || echo UNKNOWN)}" npm run --silent build:ios)
  info "Copying it into the Xcode project…"
  (cd "$REPO_ROOT" && npx cap sync ios)
}

# xcodebuild with readable output (xcbeautify if installed, else -quiet).
run_xcodebuild() {
  if command -v xcbeautify >/dev/null 2>&1; then
    xcrun xcodebuild "$@" 2>&1 | xcbeautify
  else
    xcrun xcodebuild -quiet "$@"
  fi
}

# ── Signing team ─────────────────────────────────────────────────────────────
# Prints "TEAMID<TAB>name" for each team Xcode knows (signed-in Apple IDs) and
# each team that owns an "Apple Development" certificate in the keychain.
list_teams() {
  local tmp f
  {
    # The key moved between Xcode versions; read both.
    defaults read com.apple.dt.Xcode IDEProvisioningTeamByIdentifier 2>/dev/null || true
    defaults read com.apple.dt.Xcode IDEProvisioningTeams 2>/dev/null || true
  } | awk '
    /\{/ { id = ""; name = "" }
    /teamID = / { id = $3; gsub(/[";]/, "", id) }
    /teamName = / { name = $0; sub(/^[^=]*= */, "", name); gsub(/[";]/, "", name) }
    /\}/ { if (id ~ /^[A-Z0-9]{10}$/) print id "\t" name; id = "" }
  '
  tmp="$(mktemp -d)"
  security find-certificate -a -c "Apple Development" -p 2>/dev/null |
    awk -v dir="$tmp" '/BEGIN CERTIFICATE/ { n++ } n { print > (dir "/" n ".pem") }' || true
  for f in "$tmp"/*.pem; do
    [ -f "$f" ] || continue
    openssl x509 -noout -subject -in "$f" 2>/dev/null |
      sed -n 's/.*OU *= *\([A-Z0-9]\{10\}\).*/\1	(from keychain certificate)/p'
  done
  rm -rf "$tmp"
}

# Sets IOS_TEAM_ID (detecting and saving it to ios/local.env if needed) or dies.
ensure_team_id() {
  local teams count personal
  [ -n "$IOS_TEAM_ID" ] && return 0
  # One line per team; Xcode's entry (with the real name) wins over the keychain's.
  teams="$(list_teams | awk -F '\t' '!seen[$1]++')"
  count="$(printf '%s' "$teams" | grep -c . || true)"
  if [ "$count" -eq 1 ]; then
    IOS_TEAM_ID="$(printf '%s' "$teams" | cut -f1)"
  else
    personal="$(printf '%s\n' "$teams" | grep 'Personal Team' || true)"
    if [ -n "$personal" ] && [ "$(printf '%s\n' "$personal" | grep -c .)" -eq 1 ]; then
      IOS_TEAM_ID="$(printf '%s' "$personal" | cut -f1)"
    fi
  fi
  if [ -z "$IOS_TEAM_ID" ]; then
    if [ "$count" -eq 0 ]; then
      die "No Apple ID found in Xcode. Open Xcode → Settings… → Accounts, sign in with
  your Apple ID (a free one is fine), then run this again."
    fi
    die "Several signing teams found. Put the one to use into $LOCAL_ENV as IOS_TEAM_ID=…:
$teams"
  fi
  set_local_env IOS_TEAM_ID "$IOS_TEAM_ID"
  ok "Using signing team $IOS_TEAM_ID (saved to ios/local.env)"
}

# ── Devices ──────────────────────────────────────────────────────────────────
# Prints "udid<TAB>name<TAB>connection<TAB>developer mode" for each iPhone/iPad
# this Mac has seen, reachable ones first. connection is wired, localNetwork
# or offline. Pass a name or UDID to list only that device.
list_devices() {
  local tmp
  tmp="$(mktemp -d)"
  xcrun devicectl list devices --timeout 10 --json-output "$tmp/devices.json" >/dev/null 2>&1 || true
  WANT="${1-}" node -e '
    const fs = require("fs");
    let devices = [];
    try { devices = JSON.parse(fs.readFileSync(process.argv[1], "utf8")).result.devices || []; } catch {}
    const want = (process.env.WANT || "").toLowerCase();
    const rows = devices
      .filter((d) => d.hardwareProperties && d.hardwareProperties.platform === "iOS" && d.hardwareProperties.udid)
      .map((d) => {
        const c = d.connectionProperties || {};
        const p = d.deviceProperties || {};
        return {
          udid: d.hardwareProperties.udid,
          id: d.identifier || "",
          name: p.name || d.hardwareProperties.marketingName || "iOS device",
          link: c.pairingState === "paired" && c.transportType ? c.transportType : "offline",
          devMode: p.developerModeStatus || "unknown",
        };
      })
      .filter((d) => !want || [d.udid, d.id, d.name].some((v) => v.toLowerCase() === want))
      .sort((a, b) => (a.link === "offline") - (b.link === "offline"));
    for (const d of rows) console.log([d.udid, d.name, d.link, d.devMode].join("\t"));
  ' "$tmp/devices.json"
  rm -rf "$tmp"
}

# Sets DEVICE_UDID and DEVICE_NAME to the device matching $1 (name or UDID),
# or to the first reachable one when $1 is empty. Dies if it can't be reached.
pick_device() {
  local want="${1-}" line label="iPhone"
  line="$(list_devices "$want" | awk -F '\t' '$3 != "offline" { print; exit }')"
  if [ -z "$line" ]; then
    [ -z "$want" ] || label="device \"$want\""
    die "No reachable $label. Plug it in with a cable, unlock it and tap
  \"Trust\". After the first time it also works over Wi-Fi when the iPhone is unlocked
  and on the same network. 'npm run ios:doctor' shows what this Mac can see."
  fi
  DEVICE_UDID="$(printf '%s' "$line" | cut -f1)"
  DEVICE_NAME="$(printf '%s' "$line" | cut -f2)"
  if [ "$(printf '%s' "$line" | cut -f4)" = "disabled" ]; then
    die "Developer Mode is off on $DEVICE_NAME. On the iPhone: Settings → Privacy & Security →
  Developer Mode → On, restart, and confirm \"Turn On\"."
  fi
}

# ── Provisioning profiles (free teams expire after 7 days) ───────────────────
# Reads the string/date that follows <key>NAME</key> in a plist on stdin.
plist_value() {
  awk -v key="<key>$1</key>" 'index($0, key) { getline; gsub(/^[ \t]*<[a-z]+>|<\/[a-z]+>[ \t]*$/, ""); print; exit }'
}

iso_to_epoch() {
  TZ=UTC date -j -f '%Y-%m-%dT%H:%M:%SZ' "$1" +%s 2>/dev/null || true
}

# Expiry (epoch seconds) of the profile a built .app was signed with; empty if unknown.
app_expiry_epoch() {
  local profile="$1/embedded.mobileprovision" date
  [ -f "$profile" ] || return 0
  date="$(security cms -D -i "$profile" 2>/dev/null | plist_value ExpirationDate || true)"
  if [ -n "$date" ]; then iso_to_epoch "$date"; fi
}

# Xcode keeps using a cached profile until it runs out, so a rebuild shortly
# before expiry would expire just the same. Remove this app's profiles that end
# within the refresh window so Xcode has to fetch a fresh one.
drop_expiring_profiles() {
  local limit dir f plist exp
  limit=$(($(date +%s) + REFRESH_WINDOW_HOURS * 3600))
  for dir in "$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles" "$HOME/Library/MobileDevice/Provisioning Profiles"; do
    for f in "$dir"/*.mobileprovision; do
      [ -f "$f" ] || continue
      plist="$(security cms -D -i "$f" 2>/dev/null)" || continue
      [ "$(printf '%s\n' "$plist" | plist_value application-identifier)" = "$IOS_TEAM_ID.$IOS_BUNDLE_ID" ] || continue
      exp="$(iso_to_epoch "$(printf '%s\n' "$plist" | plist_value ExpirationDate)")"
      if [ -n "$exp" ] && [ "$exp" -lt "$limit" ]; then
        info "Removing provisioning profile that expires soon: $(basename "$f")"
        rm -f "$f"
      fi
    done
  done
}

format_epoch() {
  date -r "$1" '+%a %d %b %H:%M'
}

# Remember when the build on a device runs out, for ios:auto-refresh and ios:doctor.
# State lives in $STATE_DIR as <udid>.name / .expires / .next (epoch seconds).
record_deploy() {
  local udid="$1" name="$2" app="$3" now exp next window
  now="$(date +%s)"
  window=$((REFRESH_WINDOW_HOURS * 3600))
  exp="$(app_expiry_epoch "$app")"
  [ -n "$exp" ] || exp=$((now + 7 * 86400))
  if [ $((exp - now)) -gt "$window" ]; then
    next=$((exp - window))
  else
    # Apple handed back the old, nearly expired profile; retry right after it ends.
    next=$((exp + 600))
  fi
  mkdir -p "$STATE_DIR"
  printf '%s\n' "$name" >"$STATE_DIR/$udid.name"
  printf '%s\n' "$exp" >"$STATE_DIR/$udid.expires"
  printf '%s\n' "$next" >"$STATE_DIR/$udid.next"
  ok "$name: signed until $(format_epoch "$exp")"
}
