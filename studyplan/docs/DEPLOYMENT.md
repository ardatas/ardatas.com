# Deploy Studyplan on studyplan.ardatas.com

The user selected `studyplan.ardatas.com` on 28 October 2026. The app runs at the root of that subdomain and has its own visual identity. It is a static build: no database, Node server, additional hosting provider, or purchased domain is needed. cPanel was verified to allow five subdomains, with none used before this setup.

## Release selection

Use only the **viewport-v2** release. The earlier uploaded `studyplan-upload.zip` contains the obsolete purple design and must not be extracted. Archive it outside the public document root. The current upload is `studyplan-v2-upload.zip`; its HTML has the `studyplan-release: viewport-v2` marker.

## Manual deployment from the configured GitHub repository

cPanel tracks `https://github.com/ardatas/ardatas.com.git`, branch `main`. This checkout contains Studyplan source and its production build under `studyplan/`. The root `.cpanel.yml` copies that build into the dedicated subdomain directory while preserving hosting settings and the personal-site deployment.

In cPanel, click **Update from Remote**, confirm the expected HEAD commit, then click **Deploy HEAD Commit** when ready. No server-side Node build is required. Publishing is manual.

For later source changes, run the commands below inside `studyplan/`, commit the source and updated `dist/`, and push to `main`.

## Local review

Requires Node 22.12+ (tested with Node 24):

```sh
npm ci
npm test
npm run build
npm run preview -- --port 4173
```

Open http://127.0.0.1:4173/. `npm run test:e2e` runs Chromium and mobile WebKit against the production build. Install the test browsers first with `npx playwright install chromium webkit`.

## Hosting setup

1. The subdomain was created successfully in cPanel with the separate document root `/home/ardatas/studyplan.ardatas.com`. The personal site remains at `/home/ardatas/public_html`. Do not create a duplicate domain.
2. Check the DNS zone for `studyplan`. The authoritative nameservers observed on 28 October were `ns10.piyaweb.com` and `ns20.piyaweb.com`; the main domain resolved to `31.210.74.51`. Use the hosting IP confirmed by cPanel for the subdomain A record. Avoid duplicate records. Do not change nameservers or mail records. cPanel may create the record automatically when adding the domain.
3. Run or inspect AutoSSL for the subdomain. Wait for a valid certificate before enabling an HTTPS redirect. Do not bypass certificate warnings.
4. Confirm the assigned document root contains no unrelated site. Back up any existing Studyplan files before replacement.

## Package and upload

```sh
npm run package
```

The dated ZIP in `artifacts/` contains `studyplan/`, `SHA256SUMS.txt`, and these instructions. Build assets use `/assets/` paths. Shared plans use URL fragments; no server rewrite is needed.

For manual staging, upload the dated release ZIP outside any public document root, extract it, then copy **the contents of `studyplan/`** into the dedicated document root. Preserve the hosting-generated `.htaccess`; merge optional app headers after inspection. Alternatively, `artifacts/studyplan-v2-upload.zip` contains only public app files and deliberately omits `.htaccess`, so it can be uploaded to the dedicated root and extracted in place. Move the upload ZIP outside the public root afterwards. Do not upload the enclosing folder as an extra URL path, source files, `node_modules`, manifest, or these instructions.

The existing personal site's deployment target is `/home/ardatas/public_html/`. Do not overwrite its `index.html`, `.htaccess`, files, or deployment configuration. The active root `.cpanel.yml` has separate verified destinations for the personal site and Studyplan.

## Verify delivery

- Check `https://studyplan.ardatas.com/`, JavaScript, CSS, fonts and favicon return HTTP 200 over valid HTTPS.
- Confirm the personal homepage still works.
- Select a tutorial, reload, open a shared URL in a fresh browser, and download an ICS file. Compare exported dates and rooms with source data.
- Check mobile navigation, readable blocks, date exclusions, and GDB default export and university holiday exclusions.
- A successful upload or local test does not establish live delivery. Record the actual live checks separately.

For rollback, restore only the dedicated subdomain directory from its backup. Leave the personal site untouched.

## Updating source data

Run `python3 scripts/import-gbs.py` and `python3 scripts/import-gdb.py` (Python 3 and curl). Review the diff and `docs/gbs-coverage.json`. Moodle tables in `src/weekly.ts` and the GBS lecture plan in `src/data.ts` require a fresh authenticated source check. Rerun tests/build/package. The app is a dated snapshot, not a live feed.
