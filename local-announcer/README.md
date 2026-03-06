# Gateling Announcer (Local)

This is a tiny local server meant to run on the cafe PC (the machine connected to the speakers).

It solves two problems:

1) The announcement audio is not tied to the browser tab focus (multiple tabs / background tabs).
2) During a callout, it can temporarily **duck** the PC master volume so the announcement is more audible over music.

## What it does

- Listens on `http://127.0.0.1:17777` (localhost only).
- Accepts `POST /announce` with `{ "urls": ["...mp3", "...mp3"], "duck": true }`.
- Downloads each MP3 and plays them sequentially.
- Optionally ducks the Windows master volume while playing, then restores it.

## Onboarding (recommended)

### Download the prebuilt EXE (no installs on the cafe PC)

1) Create a tag that matches `announcer-v*` (example: `announcer-v1.0.0`).
2) Push the tag to GitHub.
3) Download `Gateling.Announcer.exe` from the GitHub Release assets.

The repo includes a GitHub Actions workflow that builds this EXE on tag push:
- `.github/workflows/local-announcer-win-x64.yml`

### Maintainers only: build the EXE locally (requires .NET 8 SDK)

1) Install **.NET 8 SDK** on a dev machine:
   - https://dotnet.microsoft.com/download

2) Build the single-file EXE once:

   - From repo root:
     - `powershell -ExecutionPolicy Bypass -File .\local-announcer\publish-win-x64.ps1`

3) Copy the produced file to the cafe PC:

   - Output folder: `local-announcer/dist/`
   - Run: `local-announcer/dist/Gateling.Announcer.exe`

4) Keep it running (startup folder / Task Scheduler is ideal).

## Environment variables

- `GATELING_ANNOUNCER_PORT` (default `17777`)
- `GATELING_ANNOUNCER_DUCK_VOLUME` (0.0 - 1.0, default `0.20`)

## Web app integration

The Next.js app can call the local server from the same PC.

- Default URL used by the client: `http://127.0.0.1:17777`
- Optional override: `NEXT_PUBLIC_LOCAL_ANNOUNCER_URL`

Example `.env.local`:

```
NEXT_PUBLIC_LOCAL_ANNOUNCER_URL=http://127.0.0.1:17777
```
