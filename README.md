# SoulNote
A simple, local-first notes app made using [claude](https://claude.ai). No build step, no dependencies.

## Features
Search, pin, tags, timestamps, trash (30 days), autosave, JSON export/import, per-note .md download, installable offline PWA, optional Google Drive sync.

## Google sync (free)
Notes sync to a hidden app-data file in your own Google Drive (`drive.appdata` scope). No server, no cost. Newest edit per note wins.
1. Google Cloud Console: create a project, enable **Google Drive API**.
2. OAuth consent screen: External, add yourself as a test user.
3. Credentials: Create OAuth client ID, type **Web application**. Authorized JavaScript origins: your site origin (e.g. `https://alanbutidk.github.io`) and `http://localhost:8000`.
4. Paste the client ID into `config.js`.
5. Settings (gear) > **Sync with Google**. Sync re-runs 3s after edits while connected; after a reload tap Sync again (tokens last 1h).

## License
GPL-3.0
