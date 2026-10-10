#!/usr/bin/env bash
# Keep tensaiasobi from expiring on your devices. Apps signed with a free Apple
# ID stop opening after 7 days; this installs a background job on this Mac that
# re-signs and re-installs the app on every device you deployed to with
# 'npm run ios:device', once less than 2 days are left. Your kids' progress is kept.
#
#   npm run ios:auto-refresh -- install [--pull]   start the job (every 3 hours)
#       --pull   also 'git pull' this checkout first and install new commits
#                right away (only when nothing is uncommitted)
#   npm run ios:auto-refresh -- status             devices, expiry dates, recent log
#   npm run ios:auto-refresh -- uninstall          stop and remove the job
#   npm run ios:auto-refresh -- run [--force] [--pull]   one pass, as the job does it
#
# The Mac has to be awake and logged in; the device has to be reachable
# (same Wi-Fi or cable) and unlocked at some point while the job runs.

# shellcheck source=lib.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

LABEL="com.tensaiasobi.ios-refresh"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$HOME/Library/Logs/tensaiasobi-ios-refresh.log"
SCRIPT="$REPO_ROOT/scripts/ios/auto-refresh.sh"
DOMAIN="gui/$(id -u)"

xml_escape() {
  printf '%s' "$1" | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g'
}

notify() {
  osascript -e "display notification \"$1\" with title \"tensaiasobi\"" >/dev/null 2>&1 || true
}

known_devices() {
  local f
  for f in "$STATE_DIR"/*.next; do
    [ -f "$f" ] && basename "$f" .next
  done
  return 0
}

cmd_install() {
  local pull_arg=""
  case "${1-}" in
    --pull) pull_arg="<string>--pull</string>" ;;
    "") ;;
    *) die "Unknown option: $1" ;;
  esac
  require_macos
  [ -n "$(known_devices)" ] || die "Deploy once by hand first, so you can approve the prompts: npm run ios:device"
  mkdir -p "$(dirname "$PLIST")" "$(dirname "$LOG")"
  # launchd starts jobs with a bare PATH; keep the one that finds node and npm now.
  cat >"$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$(xml_escape "$SCRIPT")</string>
    <string>run</string>
    $pull_arg
  </array>
  <key>StartInterval</key>
  <integer>10800</integer>
  <key>RunAtLoad</key>
  <true/>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>$(xml_escape "$PATH")</string>
  </dict>
  <key>StandardOutPath</key>
  <string>$(xml_escape "$LOG")</string>
  <key>StandardErrorPath</key>
  <string>$(xml_escape "$LOG")</string>
</dict>
</plist>
EOF
  plutil -lint -s "$PLIST" || die "Generated $PLIST is invalid."
  launchctl bootout "$DOMAIN/$LABEL" >/dev/null 2>&1 || true
  launchctl bootstrap "$DOMAIN" "$PLIST"
  ok "Auto-refresh is on: every 3 hours this Mac re-signs tensaiasobi on your devices when it gets close to expiring."
  info "Log: $LOG    Status: npm run ios:auto-refresh -- status"
}

cmd_uninstall() {
  launchctl bootout "$DOMAIN/$LABEL" >/dev/null 2>&1 || true
  rm -f "$PLIST"
  ok "Auto-refresh removed."
}

cmd_status() {
  local udid now
  if launchctl print "$DOMAIN/$LABEL" >/dev/null 2>&1; then
    ok "Auto-refresh job is installed ($PLIST)"
  else
    warn "Auto-refresh job is not installed (npm run ios:auto-refresh -- install)"
  fi
  now="$(date +%s)"
  for udid in $(known_devices); do
    printf '    %s: signed until %s, next refresh after %s\n' \
      "$(cat "$STATE_DIR/$udid.name")" \
      "$(format_epoch "$(cat "$STATE_DIR/$udid.expires")")" \
      "$(format_epoch "$(cat "$STATE_DIR/$udid.next")")"
    [ "$(cat "$STATE_DIR/$udid.expires")" -gt "$now" ] || warn "  expired: run 'npm run ios:device -- --device $udid'"
  done
  if [ -f "$LOG" ]; then
    echo
    info "Last log lines ($LOG):"
    tail -n 15 "$LOG"
  fi
}

cmd_run() {
  local force=0 pull=0 now udid name exp next notified head_before skip_web="" failed=0
  while [ $# -gt 0 ]; do
    case "$1" in
      --force) force=1 ;;
      --pull) pull=1 ;;
      *) die "Unknown option: $1" ;;
    esac
    shift
  done
  # Keep the log small.
  if [ -f "$LOG" ] && [ "$(wc -c <"$LOG" | tr -d ' ')" -gt 1000000 ]; then
    tail -n 2000 "$LOG" >"$LOG.tmp" && cat "$LOG.tmp" >"$LOG" && rm -f "$LOG.tmp"
  fi

  if [ "$pull" = 1 ]; then
    # Untracked files are fine: a fast-forward refuses to overwrite them.
    if [ -n "$(git -C "$REPO_ROOT" status --porcelain --untracked-files=no)" ]; then
      echo "$(date '+%F %T') Not pulling: $REPO_ROOT has uncommitted changes."
    else
      head_before="$(git -C "$REPO_ROOT" rev-parse HEAD)"
      if git -C "$REPO_ROOT" pull --ff-only --quiet; then
        if [ "$(git -C "$REPO_ROOT" rev-parse HEAD)" != "$head_before" ]; then
          echo "$(date '+%F %T') Pulled $(git -C "$REPO_ROOT" log -1 --format='%h %s'); updating all devices."
          force=1
        fi
      else
        echo "$(date '+%F %T') git pull failed; continuing with the current checkout."
      fi
    fi
  fi

  now="$(date +%s)"
  for udid in $(known_devices); do
    name="$(cat "$STATE_DIR/$udid.name")"
    exp="$(cat "$STATE_DIR/$udid.expires")"
    next="$(cat "$STATE_DIR/$udid.next")"
    [ "$force" = 1 ] || [ "$now" -ge "$next" ] || continue

    echo "$(date '+%F %T') Refreshing $name (signed until $(format_epoch "$exp"))…"
    # Re-exec rather than source: deploy-device.sh exits on errors.
    # shellcheck disable=SC2086 # skip_web is empty or one flag
    if bash "$REPO_ROOT/scripts/ios/deploy-device.sh" --device "$udid" --no-launch $skip_web; then
      skip_web="--skip-web"
    else
      failed=1
      echo "$(date '+%F %T') Could not refresh $name; trying again in 3 hours."
      notified="$(cat "$STATE_DIR/$udid.notified" 2>/dev/null || echo 0)"
      # Nag at most twice a day, and only when it is about to stop working.
      if [ $((exp - now)) -lt 86400 ] && [ $((now - notified)) -gt 43200 ]; then
        if [ "$exp" -gt "$now" ]; then
          notify "Expires $(format_epoch "$exp") on $name. Unlock it on the Mac's Wi-Fi or plug it in."
        else
          notify "Expired on $name. Unlock it on the Mac's Wi-Fi or plug it in to renew."
        fi
        echo "$now" >"$STATE_DIR/$udid.notified"
      fi
    fi
  done
  return "$failed"
}

case "${1-}" in
  # ${1+"$@"}: an empty "$@" counts as unbound under set -u in macOS's bash 3.2.
  install) shift && cmd_install ${1+"$@"} ;;
  uninstall) cmd_uninstall ;;
  status) cmd_status ;;
  run) shift && cmd_run ${1+"$@"} ;;
  -h | --help | "") sed -n '2,/^$/s/^# \{0,1\}//p' "$0" ;;
  *) die "Unknown command: $1 (see --help)" ;;
esac
