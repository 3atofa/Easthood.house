# deploy/

Everything that decides what a crawler actually receives.

| File | What it is |
| --- | --- |
| `nginx.conf` | The serving contract. Copy to `/etc/nginx/sites-available/easthood` and symlink into `sites-enabled`. |
| `deploy.sh` | Build + verify + reload. **Exits non-zero if any route failed to prerender.** |
| `verify-seo.sh` | Post-deploy checks (Linux/macOS). Run after every infrastructure change. |
| `verify-seo.ps1` | The same checks for Windows PowerShell. |
| `check-route-drift.js` | Fails if the router, route generator and sitemap disagree. |

## The two-speed model

Discovery and indexability move at different speeds, and conflating them is
how sites end up with either uncrawled content or duplicate pages:

| | Speed | Mechanism |
| --- | --- | --- |
| **Discovery** — "a URL exists" | Instant, on publish | `/sitemap.xml`, generated live from Postgres and invalidated on every write |
| **Indexability** — "this is a real, distinct page" | Per request | Angular SSR renders the page server-side, so the HTML already carries the title, canonical, body and JSON-LD |

Because the site is **server-rendered rather than prerender-only**, there is
no window where a published article is discoverable but still serves the
generic shell. Prerendering is used only for the fixed pages, as a speed
optimisation.

The two halves live in different codebases — the sitemap in `backend/`, the
rendering in `frontend/`. Do not "fix" one by breaking the other.

## On Windows (PowerShell)

Windows PowerShell 5.1 has **no `&&` operator** — it was added in PowerShell 7.
Run each command on its own line, or use `;` (which continues even when a step
fails, so check the output). The `.sh` scripts are for the Linux server; use
`verify-seo.ps1` locally.

```powershell
# from the project root
cd backend
npm install
npm run setup       # db:sync + db:seed, chained inside npm where && works
npm run dev         # :3000  — leave this window open

# in a second window
cd frontend
npm install
npm start           # :4200 dev server, or:
npm run build:prod
npm run serve:ssr   # :4000 the real SSR output

# in a third window
.\deploy\verify-seo.ps1 -Site http://localhost:4000
```

`npm run setup` works because npm runs scripts through `cmd.exe`, where `&&`
is valid — the limitation is only in your shell, not in npm.

## Order of operations on the server

```bash
# 1. API (sitemap, robots, content)
cd backend && npm ci && npm run db:sync && npm run db:seed && npm start   # :3000

# 2. Frontend: generate routes, build, run the SSR server
cd frontend && npm ci && npm run build:prod
npm run serve:ssr                                                        # :4000

# 3. nginx in front of both
sudo cp deploy/nginx.conf /etc/nginx/sites-available/easthood
sudo ln -sf /etc/nginx/sites-available/easthood /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 4. Prove it
./deploy/verify-seo.sh https://easthood.house
```

Run both Node processes under systemd or pm2 — if the SSR process dies,
nginx has nothing to fall back to and the site is down.

## After the first deploy

- Submit `https://easthood.house/sitemap.xml` in Google Search Console.
- Register in **Bing Webmaster Tools** — Copilot and much of ChatGPT search
  read Bing's index, not Google's.
- Optional: set `INDEXNOW_KEY` in `backend/.env` and serve the key file, so
  publishing pings the index rather than waiting to be crawled.
- Skip `llms.txt`. Google's documentation states it is unused and no major
  model is documented as relying on it.
