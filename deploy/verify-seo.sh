#!/usr/bin/env bash
#
# EAST HOOD — SEO verification.
# Run after every infrastructure change. Every line here catches a real
# class of silent regression.
#
# Usage:  ./verify-seo.sh [https://easthood.house]
#
SITE="${1:-https://easthood.house}"

echo "SITE: $SITE"
echo

echo "--- data files 404 honestly (soft-404 check) ---"
printf 'missing .xml   -> '; curl -s -o /dev/null -w '%{http_code}  (want 404)\n' "$SITE/definitely-not-here.xml"
printf 'sitemap.xml    -> '; curl -s -o /dev/null -w '%{http_code}  (want 200)\n' "$SITE/sitemap.xml"
printf 'robots.txt     -> '; curl -s -o /dev/null -w '%{http_code}  (want 200)\n' "$SITE/robots.txt"
echo

echo "--- sitemap: valid XML, real lastmod, full catalogue ---"
curl -s "$SITE/sitemap.xml" | head -3
printf 'URL count      : '; curl -s "$SITE/sitemap.xml" | grep -c "<url>"
echo 'distinct lastmod (all-same means the field is fake):'
curl -s "$SITE/sitemap.xml" | grep -o "<lastmod>[^<]*" | sed 's/<lastmod>//' | cut -c1-10 | sort -u | head -5
printf 'cache header   : '; curl -sI "$SITE/sitemap.xml" | grep -i "x-sitemap-cache" || echo "(none)"
echo

echo "--- robots.txt declares the sitemap with a real directive ---"
curl -s "$SITE/robots.txt" | grep -i "^Sitemap:" || echo "MISSING — a bare URL on its own line is silently ignored"
echo

echo "--- one canonical URL shape (trailing slash must 301) ---"
curl -sI "$SITE/articles/" | grep -iE "^HTTP|^location"
echo

# Pick a real article so the checks below mean something.
ART_PATH=$(curl -s "$SITE/sitemap.xml" | grep -o "<loc>[^<]*/articles/[^<]*" | head -1 | sed 's|<loc>||')
ART="${ART_PATH:-$SITE/articles}"
echo "--- page is real HTML without JS, with its own metadata ---"
echo "target: $ART"
curl -s -A "OAI-SearchBot" "$ART" | python3 -c "
import sys, re
h = sys.stdin.read()
print('bytes           :', len(h))
print('h1 count        :', len(re.findall(r'<h1', h)), '(want 1)')
print('title           :', (re.search(r'<title[^>]*>([^<]*)', h) or [None,'MISSING'])[1])
print('canonical       :', (re.search(r'rel=\"canonical\"[^>]*href=\"([^\"]+)', h) or [None,'MISSING'])[1])
print('description     :', (re.search(r'name=\"description\"[^>]*content=\"([^\"]{0,60})', h) or [None,'MISSING'])[1])
print('json-ld blocks  :', h.count('application/ld+json'), '(want 2-3 on an article)')
print('og:image        :', (re.search(r'og:image\"[^>]*content=\"([^\"]+)', h) or [None,'MISSING'])[1])
print('body in HTML    :', 'YES' if len(re.sub(r'<[^>]+>',' ',h).split()) > 150 else 'NO - looks like the shell')
"
echo

echo "--- homepage size, for comparison ---"
printf 'home bytes     : '; curl -s -A "OAI-SearchBot" "$SITE/" | wc -c
echo "(an article near this size means it fell back to the shell)"
echo

echo "--- AI citation crawlers reach the edge ---"
for UA in OAI-SearchBot ChatGPT-User Claude-SearchBot Claude-User PerplexityBot Googlebot Bingbot Google-Extended; do
  printf "%-18s -> " "$UA"
  curl -s -o /dev/null -w "%{http_code}\n" -A "$UA" "$ART"
done
echo
echo "All must be 200. A 403 or 429 means the CDN is blocking that assistant"
echo "regardless of what robots.txt says."
