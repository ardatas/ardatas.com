# Track

A private study notebook for track.ardatas.com. From the repository root, run `pnpm install --frozen-lockfile` and `pnpm dev:track`. Run `pnpm test:track` for timer and calendar checks and `pnpm build:track` for type checking and the production bundle in `track/dist`.

## Storage

For local development, leaving both Supabase settings empty selects IndexedDB. The sidebar indicates “This browser”. These records belong to that browser origin. Cloud mode uses a separate notebook associated with the signed-in user.

Apply [the database migration](supabase/001_study_tracker.sql) to the intended Supabase project. It creates two owner-scoped tables with row-level security. Each session records its tag, original IANA time zone, UTC epoch timestamps in milliseconds, worked intervals, optional productivity score from 1 to 5, and a revision used to reject stale writes. The database permits one unfinished session per owner. Compute study time by summing intervals, clipping each interval at local day boundaries for daily reports.

For a dedicated project, disable new user signups and create the owner under Authentication → Users. Enable email magic links, set the Site URL to `https://track.ardatas.com`, and allow the exact development origin if needed. The sign-in form requests links only for existing users. For local cloud development copy `track/.env.example` to `track/.env.local` and set the project URL and publishable key. The browser needs only the public client key.

## Vercel

Create a separate Vercel project for this repository, using the repository root and framework preset **Other**. Set the install command to `pnpm install --frozen-lockfile`, the build command to `pnpm build:track`, and the output directory to `track/dist`. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` before building for production. Assign `track.ardatas.com` to this project and use the DNS record Vercel displays.

The portfolio and tracker have separate build commands. All study data is private. A future landing-page integration can publish explicitly selected aggregates through a restricted endpoint.
