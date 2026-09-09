# Orbit Roll online setup

The app, website, and admin panel share Expo Router and one Supabase backend. The game still works without online configuration. No project is created or schema applied by opening the app.

## 1. Configure a Supabase project

Create separate Supabase projects for staging and production. Copy `.env.example` to `.env` **only if `.env` does not already exist**, then set:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
EXPO_PUBLIC_SITE_URL=https://YOUR_PUBLIC_WEBSITE_DOMAIN
```

Use the project URL and publishable key from the Supabase dashboard. These values are compiled into the client. Never use a secret/service-role key, database password, or management token in `EXPO_PUBLIC_*`. `.env` is ignored by Git. Restart Metro after changing configuration; rebuild website/native bundles to update compiled values.

## 2. Apply migrations

Review and run these files in order using Supabase SQL Editor, or your authenticated Supabase CLI migration workflow:

1. `migrations/202609090001_community.sql`: profiles, RLS, replay validation, rankings, connections, admin roles, audit history.
2. `migrations/202609090002_ranked_levels.sql`: all 18 revision-1 trails.

For CLI-managed projects:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push --dry-run
supabase db push
```

Do not rerun applied migration files manually. Add new migrations for future changes. `private` must not be an exposed API schema. Keep public schema function access limited to the explicit grants in the migration.

## 3. Configure email code sign-in

Enable email authentication and signup. The app uses `signInWithOtp` followed by `verifyOtp` with type `email`; it does not consume magic-link callbacks. Configure the **Magic Link** email template to display `{{ .Token }}` instead of only a link. Also include the token in **Confirm signup** if your project uses a separate confirmation template. Example body:

```html
<h2>Your Orbit Roll sign-in code</h2>
<p>Enter this code in the app:</p>
<p style="font-size:28px;letter-spacing:4px">{{ .Token }}</p>
<p>If you did not request this code, you can ignore this email.</p>
```

Set the canonical Site URL in Supabase Auth URL Configuration. Configure your own SMTP provider and delivery domain before inviting real users; default email delivery is not a production mail service. Set appropriate Auth rate limits. If enabling CAPTCHA in Supabase, add its challenge/token flow to the app before enabling that setting—the current form does not provide CAPTCHA tokens.

## 4. Provision the first administrator

Sign in through `/account` first. A project owner then runs this in SQL Editor, replacing the address with the intended administrator:

```sql
insert into private.admin_users(user_id)
select id from auth.users where lower(email) = lower('YOUR_ADMIN_EMAIL')
on conflict do nothing;
```

Refresh the account screen and open `/admin`. Verify exactly the intended user was provisioned. There is no client-side role editor. To revoke access, delete that user's row from `private.admin_users`; every admin RPC checks the database role again.

## Routes and behavior

| Route | Purpose |
| --- | --- |
| `/` on web | Responsive website with playable trail preview and game links |
| `/account` | Email code sign-in, profile visibility, invitations, queued run retry, sign-out |
| `/leaderboard` | Paginated global rankings, crew rankings, connections/disconnect |
| `/player/:username` | Shareable public score card; private cards return no data |
| `/invite/:code` | Unlisted invitation preview and explicit acceptance |
| `/admin` | Role-protected run/player moderation with required reasons and audit history |
| `/privacy` | Explanation of local, account, ranked, and public data |

Public profiles are opt-in. Email addresses and invitation codes never appear on rankings/player cards. Invitation links reveal the inviter's name even when their ranking is private. Accepting creates a mutual connection; either person can disconnect. Shared HTTPS links open the website. Native universal/app links require the final domain's association files and app configuration; they are not yet configured.

## Ranked scores and offline play

The client submits a UUID request ID, account ID, level revision, and accepted move sequence. It cannot write a score or role directly. PostgreSQL replays rolls, lifts, gravity landings, ceiling collisions, and unique crystal collection, and requires reaching the portal. Only the best verified run per player per current published trail revision contributes to ranking.

`points = stars × 1000 + max(0, path.length + 2 − moves) × 10`

Stars use the same rules as the game engine. Rankings use dense ties. Device time is never ranked. Cloud-restored records have an unknown local time until played on this device. Guest records and practice lessons do not upload; sign in before starting a ranked run. Levels 1 and 7 are ranked entry points; other levels require the previous verified trail.

The per-account queue persists up to 50 runs. Each trace is limited to 512 moves; server submission is limited to 120 successful runs/hour/account. Queue writes are serialized, network operations do not hold the storage lock, and retries reuse request IDs. Uploads run after completion, on sign-in/app foreground, or via **Sync & refresh**. An account mismatch is checked again on the server. Rejected runs stay visible for review/removal; removing a queued run does not erase a run already accepted by the server.

Replay validation rejects impossible scores but does **not** prove human play: a script can replay a legal solution. For prize competitions, add server-issued challenges, abuse detection and independent review. Rankings currently aggregate indexed runs at read time; measure query cost and introduce transactionally maintained best-run tables/cache when traffic justifies it.

## Deployment

```sh
npm ci
npm run check
npm run check:ranked-levels
npm run export:web
```

Host `dist` with an SPA fallback to `/index.html`, including `/player/*`, `/invite/*`, and `/admin`. A private Sites preview requires owner access; it is not a public invitation domain. Configure the final public HTTPS origin in `EXPO_PUBLIC_SITE_URL` before distributing mobile builds. Website links fall back to the current origin if that variable is absent.

Use the same three variables in the appropriate EAS build environment, with separate staging/production Supabase projects. Native builds must be rebuilt for `expo-secure-store` and `expo-crypto`. SecureStore persists session chunks using device-only keychain accessibility; browser sessions use Supabase's browser storage adapter. Do not send tokens to analytics/logging.

## Verification

`npm run check` covers types, lint, gameplay, persisted data, and share/queue validation. `npm run check:ranked-levels` detects drift between the game and seeded definitions. Do not change deployed level definitions in place: add a new revision migration and update the client revision contract together.

`npm run test:database` applies all migrations inside a rolled-back transaction against a **disposable PostgreSQL instance at 127.0.0.1:55439**. It creates mock Supabase auth roles/functions and tests all 18 engine/server replays, RLS, forged score writes, idempotency, account mismatches, private/public cards, invitations, cloud results, moderation and audits. It does not use your `.env` or a live Supabase project. Install PostgreSQL client tools on PATH. CI starts its own PostgreSQL service. To run locally with Docker:

```sh
docker run --name orbit-roll-tests --rm -d -p 127.0.0.1:55439:5432 -e POSTGRES_PASSWORD=orbit-test-only postgres:17
ORBIT_TEST_DB_USER=postgres PGPASSWORD=orbit-test-only npm run test:database
docker stop orbit-roll-tests
```

Before public launch, test email delivery and code expiry against staging; two real accounts connecting; public visibility changes; offline completion/relaunch/retry; account switching during upload; denied admin RPCs; direct URL refresh; and native secure storage/sign-out on physical iOS/Android devices. PostgreSQL tests mock Auth and do not verify hosted Supabase email delivery or native UI behavior.

## Remaining launch operations

Supply real environment values, apply migrations, configure SMTP, provision an admin, and approve the intended public website audience. Add the game operator's contact and account-deletion workflow before a store release; this version does not implement self-service account deletion. No payments, push notifications, analytics, or store submission are included.

References: [Supabase React Native Auth](https://supabase.com/docs/guides/auth/quickstarts/react-native), [email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless), [database security](https://supabase.com/docs/guides/database/secure-data).
