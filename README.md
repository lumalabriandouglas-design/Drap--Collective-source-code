# Drapé Collective

Premium marketplace for Kampala ateliers. Live catalog is the existing Supabase floor (House of Zion, Tassy Stitches, Ensemble, UCJ, May Stitches, independents).

## Branches

| Branch | What it is |
|---|---|
| `main` | Current live site. Do not merge until the preview looks right. |
| `premium-marketplace` | New marketplace (hero slider, showrooms, R2, roles). Vercel preview only. |

## Vercel preview (one-time project setting)

The live project is still set up as the old static Vite site. The new app is a server app, so the preview build needs these **Build & Development** settings. Turn **off** any Override switches, or set:

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
