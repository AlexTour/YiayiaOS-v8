#!/usr/bin/env bash
# YiayiaOS — installation launcher (macOS / Linux). Runs fully offline.
# Serves the folder locally and opens Chrome full-screen with camera + sound allowed.
set -e
cd "$(dirname "$0")/.."
PORT=8080
PROFILE="${TMPDIR:-/tmp}/yiayiaos-kiosk-profile"

python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
sleep 1

if [[ "$OSTYPE" == darwin* ]]; then
  CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
else
  CHROME="$(command -v google-chrome || command -v google-chrome-stable || command -v chromium || command -v chromium-browser)"
fi

"$CHROME" \
  --kiosk --no-first-run --noerrdialogs --disable-infobars --disable-session-crashed-bubble \
  --disable-translate --overscroll-history-navigation=0 --disable-pinch \
  --autoplay-policy=no-user-gesture-required \
  --use-fake-ui-for-media-stream \
  --user-data-dir="$PROFILE" \
  "http://127.0.0.1:$PORT/?kiosk"
