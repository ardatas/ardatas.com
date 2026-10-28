# Manual cPanel deployment

This repository now includes the Studyplan source and production build under `studyplan/`. cPanel tracks `https://github.com/ardatas/ardatas.com.git`, branch `main`.

After this commit reaches GitHub, click **Update from Remote**, confirm the new HEAD commit, then click **Deploy HEAD Commit** when ready. The user performs deployment; no live deployment was performed by the agent.

The root `.cpanel.yml` retains the personal-site copy and also copies only Studyplan public app files to `/home/ardatas/studyplan.ardatas.com/`. Hosting-generated `.htaccess`, `.user.ini`, and `php.ini` are preserved. No Node installation on cPanel is required because the build is checked in.

This update includes selected sessions at 50% opacity across module filters, separate lanes for overlapping options, and conflict details. The source is based on studyplan-organizer commit `33325ae`.

For future changes, build from the `studyplan/` directory and commit both source and generated `studyplan/dist/` changes before pushing to `main`. The separate studyplan-organizer repository is not the remote configured in cPanel.


## Latest update: GDB sequence and university holidays

GDB is scheduled from its published weekly pattern by user instruction and included in exports without opt-in. The central academic calendar follows both pages of TUM's 2026/27 circular: no tutorials on teaching-free days or during Christmas break (24 December–6 January inclusive), with the existing FVV/SVV exclusions retained. Source, generated build and tests are committed together. The agent has not deployed this update; use Update from Remote and then Deploy HEAD Commit manually.
