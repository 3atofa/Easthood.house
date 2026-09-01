#!/usr/bin/env bash
#
# EAST HOOD — production deploy.
#
# The job of this script is to REFUSE to call a partial build a success.
# A build that prerenders 9 of 60 pages exits 0 and looks identical to a
# healthy one; the missing 51 quietly serve the generic shell and never
# index. Finding that out here costs minutes. Finding it out from a Search
# Console graph costs three months.
#
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/easthood}"
FRONTEND="$APP_DIR/frontend"
API_URL="${API_URL:-http://localhost:3000/api}"
SITE="${SITE:-https://easthood.house}"

cd "$FRONTEND"

echo "==> 1/6  Backing up the current build"
# A failed rebuild must never leave the site with nothing.
if [ -d dist ]; then
  cp -r dist "dist-backup-$(date +%Y%m%d-%H%M%S)"
fi

echo "==> 2/6  Checking the API is reachable"
# The route generator reads from the API. If it is down, the build would
# quietly prerender the static pages only.
if ! curl -sf "$API_URL/health" > /dev/null; then
  echo "FAILED: $API_URL/health is not responding."
  echo "Start the API first — building now would leave every article on the shell."
  exit 1
fi

echo "==> 3/6  Generating the prerender route list"
API_URL="$API_URL" node scripts/generate-routes.js

ROUTE_COUNT=$(grep -cve '^\s*$' routes.txt)
echo "    $ROUTE_COUNT route(s) to prerender"

echo "==> 4/6  Building"
# Persistent framework caches have served stale prerender output before.
rm -rf .angular
if ! npm run build -- --configuration production; then
  echo "FAILED: build errored. The live site is untouched."
  exit 1
fi

echo "==> 5/6  Verifying every route renders real HTML"
# Under server routing the content pages have no prerendered file to look
# for, so the check is what the SSR process actually RETURNS. A page that
# fell back to the shell is close to the homepage's byte count and has no
# <h1> of its own — that is what we detect.

echo "    starting the SSR server for verification"
node dist/frontend/server/server.mjs &
SSR_PID=$!
trap 'kill $SSR_PID 2>/dev/null || true' EXIT

# Wait for it to accept connections rather than guessing with sleep.
for _ in $(seq 1 30); do
  curl -sf http://localhost:4000/ > /dev/null && break
  sleep 1
done

if ! curl -sf http://localhost:4000/ > /dev/null; then
  echo "FAILED: the SSR server did not come up. Live site untouched."
  exit 1
fi

SHELL_BYTES=$(curl -s http://localhost:4000/ | wc -c)
BAD=0

while IFS= read -r route; do
  [ -z "$route" ] && continue

  BODY=$(curl -s -A "OAI-SearchBot" "http://localhost:4000$route")
  BYTES=$(printf '%s' "$BODY" | wc -c)
  H1=$(printf '%s' "$BODY" | grep -c '<h1' || true)

  if [ "$BYTES" -lt 2000 ]; then
    echo "    THIN:    $route  (${BYTES} bytes — looks like a shell)"
    BAD=$((BAD + 1))
  elif [ "$H1" -eq 0 ]; then
    echo "    NO H1:   $route"
    BAD=$((BAD + 1))
  fi
done < routes.txt

if [ "$BAD" -gt 0 ]; then
  echo
  echo "FAILED: $BAD route(s) did not render real content."
  echo "Those URLs would be indexed as duplicates, or not at all."
  echo "The live site is untouched."
  exit 1
fi
echo "    every route rendered real HTML (shell is ${SHELL_BYTES} bytes)"

kill $SSR_PID 2>/dev/null || true
trap - EXIT

echo "==> 6/6  Reloading nginx and checking the serving contract"
sudo nginx -t
sudo systemctl reload nginx

printf '    sitemap.xml   -> '; curl -s -o /dev/null -w '%{http_code}\n' "$SITE/sitemap.xml"
printf '    robots.txt    -> '; curl -s -o /dev/null -w '%{http_code}\n' "$SITE/robots.txt"
printf '    missing .xml  -> '; curl -s -o /dev/null -w '%{http_code} (want 404)\n' "$SITE/sitemap_index.xml"

# Keep three backups, drop the rest.
ls -dt dist-backup-* 2>/dev/null | tail -n +4 | xargs -r rm -rf

echo
echo "Deployed."
