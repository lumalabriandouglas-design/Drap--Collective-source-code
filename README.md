# Drapé Collective

Premium marketplace for Kampala ateliers. Live catalog is the existing Supabase floor (House of Zion, Tassy Stitches, Ensemble, UCJ, May Stitches, independents).

## Branches

| Branch | What it is |
|---|---|
| `main` | Current live site. Do not merge until the preview looks right. |
| `premium-marketplace` | New marketplace (hero slider, showrooms, R2, roles). Vercel preview only. |

## Vercel preview

The live project is a static Vite site (`index.html` → `src/main.tsx` → `dist`). This branch matches that contract when Vercel runs `vite build`:

- Root `index.html` is the same SPA door the live house uses
- `vite build` writes `dist/index.html` and the client bundle
- Shop, ateliers, journal, and the hero load from the live catalog in the browser
- Existing designer emails and passwords sign in the same way as [odrapecollective.com](https://odrapecollective.com)

Leave the dashboard as the old Vite site (Framework Vite, Output Directory `dist`, Node 22 if you can). Production Branch stays on `main`, so the live house does not change.

This branch does **not** run database migrations on build. Do not set `DATABASE_URL` to live Supabase.

## Env vars (preview + production)

| Variable | Purpose |
|---|---|
| `VITE_AUTH_ENABLED` | `true` |
| `BETTER_AUTH_URL` | Only needed for the full server house. Leave unset on this static preview. |
| `ADMIN_EMAIL` | Your email — opens the hidden house ledger on the full server house |
| `R2_ACCOUNT_ID` | Cloudflare account |
| `R2_BUCKET` | `odrapecollective` |
| `R2_ACCESS_KEY_ID` | R2 token |
| `R2_SECRET_ACCESS_KEY` | R2 token secret |
| `R2_PUBLIC_BASE` | `https://pub-….r2.dev` |
| `DATABASE_URL` | Leave unset on this preview. Do not point it at live Supabase. |

## Roles

- **Collector** — shop, bag, account
- **Designer** — studio + shareable showroom (`/s/your-atelier`). Existing emails/passwords from the live floor still work.
- **Admin** — only after sign-in with an admin profile on the floor. `/admin` looks like a missing page to everyone else.
