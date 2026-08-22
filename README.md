# Drapé Collective

Premium marketplace for Kampala ateliers. Live catalog is the existing Supabase floor (House of Zion, Tassy Stitches, Ensemble, UCJ, May Stitches, independents).

## Branches

| Branch | What it is |
|---|---|
| `main` | Current live site. Do not merge until the preview looks right. |
| `premium-marketplace` | New marketplace (hero slider, showrooms, R2, roles). Vercel preview only. |

## Vercel preview

The live project is still set up as the old static Vite site. This branch does two things so the preview can come up without touching production:

1. Writes Nitro’s server output (`.vercel/output`) so the house can run as a server app when Vercel is set to **Other**.
2. Also copies the client into `dist/` with an `index.html`, so the old Vite “Output Directory = dist” setting still finds files. The floor (shop, ateliers, journal) loads from the live catalog in the browser.

Best settings (Vercel → Project → Settings → General → Build & Development). Turn **off** Override, or set:

| Setting | Value |
|---|---|
| Framework Preset | Other |
| Build Command | `npm run build` |
| Output Directory | *leave empty* |
| Install Command | `npm install --include=dev` |
| Node.js Version | 22.x |

Leave Production Branch on `main`. [odrapecollective.com](https://odrapecollective.com) will not change.

Existing designer and collector accounts stay. This branch does **not** run database migrations on build, so the live product catalog cannot be wiped.

## Env vars (preview + production)

| Variable | Purpose |
|---|---|
| `VITE_AUTH_ENABLED` | `true` |
| `BETTER_AUTH_URL` | Preview URL, then `https://odrapecollective.com` on production |
| `ADMIN_EMAIL` | Your email — opens the hidden house ledger |
| `R2_ACCOUNT_ID` | Cloudflare account |
| `R2_BUCKET` | `odrapecollective` |
| `R2_ACCESS_KEY_ID` | R2 token |
| `R2_SECRET_ACCESS_KEY` | R2 token secret |
| `R2_PUBLIC_BASE` | `https://pub-….r2.dev` |
| `DATABASE_URL` | Leave unset on this preview. Do not point it at live Supabase. |

## Roles

- **Collector** — shop, bag, account
- **Designer** — studio + shareable showroom (`/s/your-atelier`). Existing emails/passwords from the live floor still work.
- **Admin** — only after sign-in with `ADMIN_EMAIL`. `/admin` looks like a missing page to everyone else.
