# Gateling Announcer (Local)

This is a tiny local server meant to run on the cafe PC (the machine connected to the speakers).

It solves two problems:

1) The announcement audio is not tied to the browser tab focus (multiple tabs / background tabs).
2) During a callout, it can temporarily **duck other apps' audio** so the announcement is more audible over music.

## What it does

- Listens on `http://127.0.0.1:17777` (localhost only).
- `GET /` returns a small JSON help response (so you won't see a browser 404).
- Accepts `POST /announce` with `{ "urls": ["...mp3", "...mp3"], "duck": true }`.
- Accepts `POST /announce-tts` with `{ "clips": [{"key":"...","base64":"..."}], "duck": true }`.
   - If `sounds/<key>.mp3` already exists, you can omit `base64` and it will play from disk.
- Accepts `POST /test-beep` to play a generated tone (no MP3 URL required).
- Accepts `POST /schedule-reservation` to set a **local timer** on the cafe PC.
- Accepts `POST /cancel-reservation` to cancel a scheduled timer.
- Downloads each MP3 and plays them sequentially.
- Optionally ducks other apps' volumes while playing, then restores them.

## Local caching (offline-friendly)

The announcer persists audio files to disk so future callouts can play even with a weak connection.

- Cache folder: `sounds/` (next to the EXE)
- `POST /announce-tts` saves `sounds/<key>.mp3`
- `POST /announce` saves `sounds/url-<hash>.mp3` after the first download

## Onboarding (recommended)

### Build the EXE locally (requires .NET SDK)

1) Install **.NET 8 SDK** on a dev machine:
   - https://dotnet.microsoft.com/download

2) Build the single-file EXE once:

   - From repo root:
     - `powershell -ExecutionPolicy Bypass -File .\local-announcer\publish-win-x64.ps1`

3) Copy the produced file to the cafe PC:

   - Output folder: `local-announcer/dist/`
   - Run: `local-announcer/dist/Gateling.Announcer.exe`

4) Keep it running (startup folder / Task Scheduler is ideal).

### Cafe PC setup (recommended)

Copy everything from `local-announcer/dist/` onto the cafe PC (keep the EXE + installer script together), then run:

- From an **Administrator** PowerShell in the same folder as `Gateling.Announcer.exe`:
   - `powershell -ExecutionPolicy Bypass -File .\install-announcer-service.ps1`

This installs:
- A Windows Service (API + scheduler) on `http://127.0.0.1:17777`
- A per-user Scheduled Task (interactive helper for ducking) on `http://127.0.0.1:17778`

Quick checks:
- `Invoke-RestMethod http://127.0.0.1:17777/debug`
- `Invoke-RestMethod http://127.0.0.1:17778/debug`
- `Invoke-RestMethod -Method Post http://127.0.0.1:17777/test-beep -ContentType 'application/json' -Body '{"duck":true,"durationMs":300}'`

## Environment variables

- `GATELING_ANNOUNCER_PORT` (default `17777`)
- `GATELING_ANNOUNCER_USER_AGENT_PORT` (default `17778`) — port used by `--user-agent`
- `GATELING_ANNOUNCER_DUCK_VOLUME` (0.0 - 1.0, default `0.20`) — target volume for other apps during playback
- `GATELING_ANNOUNCER_END_URL` (example: `https://YOUR_DOMAIN/api/local-announcer/end-reservation`) — server callback URL
- `GATELING_ANNOUNCER_END_TOKEN` (shared secret) — Bearer token used for the callback
- `GATELING_ANNOUNCER_USE_HELPER` (`true`/`false`) — when running as a Windows Service, forward playback to the user-session helper (default: `true` for services)
- `GATELING_ANNOUNCER_HELPER_URL` (default `http://127.0.0.1:17778`) — helper base URL

## Run as a Windows Service (recommended for cafe PCs)

Running as a service prevents accidental shutdown (closing a terminal window).

### One-file setup (recommended)

The release/artifact includes a helper script next to the EXE:

- `install-announcer-service.ps1`

Run it once as Administrator (it will prompt for elevation if needed). It will:

- Set machine env vars (only if missing)
- Install + start the Windows Service
- Configure auto-start on Windows boot
- Create/start a Scheduled Task that runs the announcer in `--user-agent` mode (needed for reliable ducking)

From an **Administrator** PowerShell in the folder containing `Gateling.Announcer.exe`:

- `powershell -ExecutionPolicy Bypass -File .\install-announcer-service.ps1`

- Install + start:
   - `./Gateling.Announcer.exe --install-service`

- Uninstall:
   - `./Gateling.Announcer.exe --uninstall-service`

The service name defaults to `GatelingAnnouncer`. You can override it:

- `./Gateling.Announcer.exe --install-service --service-name MyCafeAnnouncer`

## Local timers (works even if the browser is closed)

The web app can push reservation end times to the local announcer.
The announcer persists them to `schedules.json` (next to the EXE), so timers survive restarts.

When a timer fires:

1) The announcer plays the cached audio locally (from `sounds/`)
2) Then it makes a **single** server request (best effort) to mark the reservation ended + revalidate

To enable the server callback:

- Set `GATELING_ANNOUNCER_END_URL` and `GATELING_ANNOUNCER_END_TOKEN` on the cafe PC
- Set `LOCAL_ANNOUNCER_END_TOKEN` on the Next.js server (must match)

## Web app integration

The Next.js app can call the local server from the same PC.

- Default URL used by the client: `http://127.0.0.1:17777`
- Optional override: `NEXT_PUBLIC_LOCAL_ANNOUNCER_URL`

Example `.env.local`:

```
NEXT_PUBLIC_LOCAL_ANNOUNCER_URL=http://127.0.0.1:17777
```
