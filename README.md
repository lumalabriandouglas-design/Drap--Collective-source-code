# Drapé Collective

Premium marketplace for Kampala ateliers. Live catalog is the existing Supabase floor (House of Zion, Tassy Stitches, Ensemble, UCJ, May Stitches, independents).

## Branches

| Branch | What it is |
|---|---|
| `main` | Current live site. Do not merge until the preview looks right. |
| `premium-marketplace` | New marketplace (hero slider, showrooms, R2, roles). Vercel preview only. |

Existing designer and collector accounts stay. This branch does **not** run database migrations on build, so the live product catalog cannot be wiped.

## Vercel preview

Vercel deploys this branch as a preview URL. Production (`odrapecollective.com`) stays on `main` until you merge.

Set these on the Vercel project (preview + production):

| Variable | Purpose |
|---|---|
| `VITE_AUTH_ENABLED` | `true` |
| `BETTER_AUTH_URL` | Preview URL, then `https://odrapecollective.com` on production |
| `ADMIN_EMAIL` | Your email — opens the hidden house ledger |
| `R2_ACCOUNT_ID` | Cloudflare account |
| `R2_BUCKET` | `odrapecollective` |
| `R2_ACCESS_KEY_ID` | R2 token |
| `R2_SECRET_ACCESS_KEY` | R2 token secret |
| `R2_PUBLIC_BASE` | `https://pub-….r2.dev` (not the `cloudflarestorage.com` API URL) |
| `DATABASE_URL` | Optional. Only needed for local cart/orders. Leave unset to keep using PGLite locally and live Supabase for the floor. |

Do **not** point `DATABASE_URL` at the live Supabase database. The shop already reads products through the public REST API.

## Roles

- **Collector** — shop, bag, account
- **Designer** — studio + shareable showroom (`/s/your-atelier`)
- **Admin** — only after sign-in with `ADMIN_EMAIL`. `/admin` looks like a missing page to everyone else.
