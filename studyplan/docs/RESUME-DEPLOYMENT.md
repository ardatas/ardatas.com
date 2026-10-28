# Manual cPanel deployment

This repository now includes the Studyplan source and production build under `studyplan/`. cPanel tracks `https://github.com/ardatas/ardatas.com.git`, branch `main`.

After this commit reaches GitHub, click **Update from Remote**, confirm the new HEAD commit, then click **Deploy HEAD Commit** when ready. The user performs deployment; no live deployment was performed by the agent.

The root `.cpanel.yml` retains the personal-site copy and also copies only Studyplan public app files to `/home/ardatas/studyplan.ardatas.com/`. Hosting-generated `.htaccess`, `.user.ini`, and `php.ini` are preserved. No Node installation on cPanel is required because the build is checked in.

This update includes selected sessions at 50% opacity across module filters, separate lanes for overlapping options, and conflict details. The source is based on studyplan-organizer commit `33325ae`.

For future changes, build from the `studyplan/` directory and commit both source and generated `studyplan/dist/` changes before pushing to `main`. The separate studyplan-organizer repository is not the remote configured in cPanel.
