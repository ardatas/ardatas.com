# Track

A private study notebook for track.ardatas.com. From the repository root, run `pnpm install --frozen-lockfile` and configure `track/.env.local` as described below before running `pnpm dev:track`. Run `pnpm test:track` for timer and calendar checks and `pnpm build:track` for type checking and the production bundle in `track/dist`.

## Storage

Apply [the database migration](supabase/001_study_tracker.sql) to the intended Supabase project. It creates two owner-scoped tables with row-level security. Each session records its tag, original IANA time zone, UTC epoch timestamps in milliseconds, worked intervals, optional productivity score from 1 to 5, and a revision used to reject stale writes. The database permits one unfinished session per owner. Compute study time by summing intervals, clipping each interval at local day boundaries for daily reports.

## Owner login

In Supabase Authentication → Sign In / Providers, enable Email and disable “Allow new users to sign up”. In Authentication → Users → Add user → Create new user, enter `<username>@track.invalid` as the email, set your password, and select **Auto Confirm User**. The username is case-insensitive and can contain 1–64 ASCII letters, digits, hyphens, or underscores. Enter only the username and password on the tracker. The reserved domain is an internal identifier. Create and reset the owner's credentials in the Supabase dashboard.

Both development and production require the Supabase URL and publishable key. Copy `track/.env.example` to `track/.env.local` for development. Supabase Auth verifies the password and issues a session held in tab memory. Reloading requires signing in again. Study blocks and running timers persist in PostgreSQL. Owner-only row-level policies protect the records independently of the login screen.

## Vercel

Create a separate Vercel project for this repository, using the repository root and framework preset **Other**. Set the install command to `pnpm install --frozen-lockfile`, the build command to `pnpm build:track`, and the output directory to `track/dist`. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` before building for production. Assign `track.ardatas.com` to this project and use the DNS record Vercel displays.

The portfolio and tracker have separate build commands. All study data is private. A future landing-page integration can publish explicitly selected aggregates through a restricted endpoint.
