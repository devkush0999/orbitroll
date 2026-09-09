# Independent codebases and domains

The standalone admin has a live private preview at https://orbit-roll-admin.greensturn.chatgpt.site. Its custom hostname has been registered with the current host and awaits the [exact GoDaddy verification records](GODADDY-DNS.md). The Cloudflare Pages instructions below are the separate free-hosting option, not a claim that a Pages project was created.

```text
Desktop/
  space-cube/          Expo React Native app + player website + Supabase backend
  orbit-roll-admin/    Independent Next.js administration project
```

The admin has its own package.json, lockfile, environment, TypeScript config, CI and local database contract. It imports no mobile files and can be pushed to a separate repository. Supabase migrations and Edge Functions in `space-cube/supabase` are the backend source of truth; both clients call its public API. Do not copy secrets or entire `.env` files between projects.

## Proposed production hostnames

| Purpose | Hostname | Source and build |
| --- | --- | --- |
| Player website / share links | `orbitroll.deveshkumarsingh.com` | `space-cube`: `npm ci`, `npm run export:web`, output `dist` |
| Admin | `admin-orbitroll.deveshkumarsingh.com` | `orbit-roll-admin`: `npm ci`, `npm run build`, output `out` |

These are proposed names, not a claim that DNS or HTTPS is active. Apex websites and mail records stay untouched. The two frontends can be hosted on separate Cloudflare Pages Free projects; GoDaddy can stay the registrar and DNS provider when using subdomains.

## GoDaddy + Cloudflare Pages

1. Deploy each repository to its own Pages project. Enter only its public Supabase URL and publishable key in build environment variables. Do not set `ADMIN_BASE_PATH`; admin serves at its own domain root.
2. Add the intended hostname under **Custom domains** on the corresponding Pages project **before** editing DNS. Use the exact target returned by that project, not a guessed project name.
3. In GoDaddy DNS, add the requested CNAME record for each unused subdomain:

| Type | GoDaddy Name | Value |
| --- | --- | --- |
| CNAME | `orbitroll` | Actual player-site Pages hostname returned by Cloudflare |
| CNAME | `admin-orbitroll` | Actual admin Pages hostname returned by Cloudflare |

Do not include `https://`, paths, or the whole zone name in GoDaddy's Name field. Use the default TTL. If the hostname already has a record, review its purpose before replacing it. Add any extra provider-supplied validation records exactly. Do not change nameservers, apex A records, MX, or existing TXT records for this setup.

4. Wait for each provider's DNS validation and TLS certificate to show active. Test both HTTPS roots and a direct player/share route.
5. Only then switch live client URLs and rebuild:

```dotenv
# Expo .env / EAS build environment
EXPO_PUBLIC_SITE_URL=https://orbitroll.deveshkumarsingh.com
EXPO_PUBLIC_ADMIN_URL=https://admin-orbitroll.deveshkumarsingh.com
```

The actual preview URLs remain configured until custom domains work. Native universal links require separate association files/app configuration; website links already work without them.

6. Set Supabase Auth Site URL to the player website. Add exact origins to any configured auth redirect allowlist. Set the media function's `ADMIN_ORIGINS` to `https://admin-orbitroll.deveshkumarsingh.com` (optionally keep `http://localhost:3000` for development). Origins have no path or trailing slash.

Cloudflare source: [Custom domains on Pages](https://developers.cloudflare.com/pages/configuration/custom-domains/). GoDaddy source: [Add a CNAME record](https://www.godaddy.com/help/add-a-cname-record-19236).

## Cloudinary credentials

The credential posted in chat should be rotated in Cloudinary. Its original local copy, if present, is in ignored `supabase/functions/.env.local`; it must be replaced before deployment. The committed example contains placeholders only. Never put `CLOUDINARY_API_SECRET` in Expo or Next.js environments, Git, CI logs, or browser code.

Set the new secret directly in Supabase Dashboard → Edge Functions → Secrets. Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, both signed upload preset names, and `ADMIN_ORIGINS`. Cloudinary file bytes remain outside Supabase; verified metadata and publishing permissions live in Postgres. Deploy the `cloudinary-media` function and apply the third media migration after the earlier game migrations.

If a credential was ever committed, rotating it is mandatory even after removing it from the current file. Removing the file does not erase Git history. No history rewriting is performed automatically here.

## Free-tier launch boundary

Keep images below 2 MB and videos below 10 MB / 30 seconds; upload only from admin; avoid autoplay. Review actual database size, CDN bandwidth, transformations and email quota weekly. The 1,000-download milestone is not a guaranteed capacity limit. Keep automated paid upgrades off and approve any plan change separately. Native store registration and sender-domain costs are separate from these backend free tiers.
