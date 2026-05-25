#!/usr/bin/env bash
# Build a production bundle and serve it on the LAN so a real phone can load it.
# Why: `next dev` is too heavy to hydrate on iOS WebKit (unminified + React-dev +
# Matter.js/motion on the main thread trips Safari's per-tab watchdog), so text
# stuck at opacity:0 never reveals. The prod build is ~10x lighter and hydrates
# fine. Use this only for on-device checks; keep `npm run dev` for normal coding.
set -euo pipefail

PORT="${PORT:-3000}"

# Mac's LAN IP: Wi-Fi (en0) first, then wired (en1). Falls back to localhost.
IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo '')"

echo "▸ Building production bundle (npm run build → runs sync:versions first)…"
npm run build

echo
echo "▸ Serving on the LAN. Open this on your phone (same Wi-Fi):"
if [ -n "$IP" ]; then
  echo "    http://$IP:$PORT"
else
  echo "    (couldn't detect LAN IP — run \`ipconfig getifaddr en0\` manually)"
fi
echo "    Local: http://localhost:$PORT"
echo
echo "  This terminal now RUNS the server (foreground) — that's normal, not a"
echo "  freeze. Leave it open; for other commands open a new terminal tab."
echo "  Ctrl-C once to stop. Re-run after code changes (prod build has no hot reload)."
echo

# Run the server in its own process group (set -m) and trap Ctrl-C so a single
# press tears down next start AND all its Turbopack workers, then returns a clean
# prompt. (Plain `exec next start` left workers alive / swallowed SIGINT on
# Next 16, so Ctrl-C felt dead.)
# -H 0.0.0.0 binds all interfaces so the phone can reach it, not just localhost.
set -m
trap 'echo; echo "▸ stopping server…"; kill -TERM -- -"$SRV" 2>/dev/null; wait "$SRV" 2>/dev/null; exit 0' INT TERM
next start -H 0.0.0.0 -p "$PORT" &
SRV=$!
wait "$SRV"
