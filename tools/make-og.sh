#!/usr/bin/env bash
# Renders the social-sharing card (1200x630) and the Apple touch icon (180x180)
# from the HTML sources next to this script. Requires Google Chrome.
set -euo pipefail
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --virtual-time-budget=8000 --window-size=1200,630 \
  --screenshot="$ROOT/images/og-card.png" "file://$ROOT/tools/og-card.html" 2>/dev/null
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --virtual-time-budget=2000 --window-size=180,180 \
  --screenshot="$ROOT/images/apple-touch-icon.png" "file://$ROOT/tools/touch-icon.html" 2>/dev/null
ls -la "$ROOT/images/og-card.png" "$ROOT/images/apple-touch-icon.png"
