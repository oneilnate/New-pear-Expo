# Food Pod — Demo Runbook

This runbook walks you through driving the Food Pod demo from a cold start: setting keys on the VM, resetting the pod, opening the app in iOS Simulator or Expo Go, capturing 7 meals, and listening to Sarah deliver the nutrition podcast. Budget ~5 minutes to reset and ~10 minutes for a full walkthrough.

---

## Prerequisites

**On your laptop**
- macOS + Xcode 15 or later (for iOS Simulator), OR an iPhone with the Expo Go app installed
- `pnpm` 9 and Node 22+ (run `pnpm install` in this repo before the first demo)

**Secrets — one-time setup for whoever runs the VM** (Buzz or Nate)
- `GEMINI_API_KEY` — required for vision analysis and script generation (Gemini 1.5 Pro)
- `ELEVENLABS_API_KEY` — required for Sarah's voice (ElevenLabs TTS)

**For CI deployments (optional)**
- `EXPO_TOKEN` — needed by GitHub Actions to publish OTA updates
- `GCP_SA_KEY` — needed if you want service-account access from CI

---

## One-time VM setup

Run this once per environment — Buzz or Nate runs it, not every demo.

```bash
# 1. SSH into the VM
gcloud compute ssh pear-sandbox --zone us-central1-a

# 2. Open the backend env file
sudo nano /etc/foodpod/env
```

Paste your keys into the file:

```
GEMINI_API_KEY=<your-key>
ELEVENLABS_API_KEY=<your-key>
```

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`), then restart the backend:

```bash
sudo systemctl restart foodpod-backend
```

Verify it came up clean:

```bash
curl https://pear-sandbox.everbetter.com/api/health
# Expected: {"ok":true}
```

Once that returns `{ok:true}`, the VM is ready. You won't need to repeat this unless the keys rotate.

---

## Before every demo — reset the pod

Run this before each stakeholder session to start from a clean slate.

```bash
# In the New-pear-backend repo (or over SSH with a dev token)
cd New-pear-backend && bun run e2e:reset
```

Confirm the reset worked:

```bash
curl https://pear-sandbox.everbetter.com/api/pods/pod_demo_01 | jq '.capturedCount'
# Expected: 0
```

If `capturedCount` is not 0, the reset didn't land — run it again or restart the backend service.

---

## Running the demo

### Start the app

```bash
cd New-pear-Expo
pnpm install   # skip if you ran this recently
pnpm start
```

Expo Dev Tools opens in your terminal. Then:

- **iOS Simulator** — press `i`. Xcode boots the simulator and loads the app automatically.
- **Real iPhone** — open Expo Go, tap the scan icon, and scan the QR code from the terminal.

### The flow (7 photos → Tune In → podcast)

1. **App loads** on the Food Pod home screen. You'll see the 30-dot grid, a `0/7` counter, and a "Snap a meal" card at the bottom.

2. **Tap "Snap a meal"** → the camera opens. Grant camera permission if prompted.
   - On a real device: point the camera at any food and take a photo.
   - In iOS Simulator: the camera rolls to the simulator photo library. Pick any food image, or use the default beach photo — it will still run through Gemini vision.

3. **Repeat for a total of 7 photos.** The counter increments after each successful upload. After each shot you're returned to the home screen; tap "Snap a meal" again.

4. **On the 7th photo**, the dots turn green, the counter hits `7/7`, and the pod animates into its **UNLOCKED** state. A "Tune In" modal slides up from the bottom.

5. **Tap "Tune In".** The pipeline kicks off on the VM: Gemini processes all 7 images and generates a personalised nutrition script in one call (~3–5 sec), then ElevenLabs synthesises Sarah's voice (~2–4 sec), and the MP3 is saved to disk.

6. **The player screen loads** with the episode title and a one-paragraph summary. Tap the play button.

7. **Sarah delivers the podcast.** Sit back. That's the demo.

---

## Troubleshooting

**"Tune In" shows 404 or "isn't ready yet"**
The backend pipeline failed. Check the last 100 log lines on the VM:
```bash
sudo journalctl -u foodpod-backend -n 100
```
Look for errors from the Gemini or ElevenLabs calls. Usually a missing API key or a transient rate-limit.

**No audio plays**
Verify the MP3 was saved and the media server can reach it:
```bash
curl -I https://pear-sandbox.everbetter.com/media/audio/<episodeId>.mp3
```
Expect `200 OK` with `Content-Type: audio/mpeg`. A `404` means the ElevenLabs call didn't complete — check the backend logs.

**Counter stuck at N/7**
An image upload failed silently. Check for upload errors:
```bash
sudo journalctl -u foodpod-backend -n 50
```
Most common cause: disk full on `/opt/foodpod/`. Check `df -h /opt`.

**iOS Simulator can't reach the VM**
The Simulator shares your laptop's network. If `pear-sandbox.everbetter.com` is unreachable, the issue is network-side, not the app. Confirm from your laptop:
```bash
curl https://pear-sandbox.everbetter.com/api/health
```
If that fails, check VPN or firewall rules.

**Gemini returns malformed JSON**
Transient Gemini failure (happens occasionally with unusual image content). Reset the pod and retry — it almost always clears on the second attempt:
```bash
cd New-pear-backend && bun run e2e:reset
```

---

## Cost per demo

Each fully unlocked pod costs roughly **$0.22**:

| Step | Model | Cost |
|---|---|---|
| Vision + script (7 images + ~2 K tokens) | Gemini 1.5 Pro | ~$0.04 |
| Sarah voice (~1,000-char script) | ElevenLabs | ~$0.18 |
| **Total** | | **~$0.22** |

Partial runs (pod reset before completion) cost proportionally less — each image upload triggers no billable AI call; the pipeline only runs when all 7 are in.

---

## Architecture quick-reference

```
Expo app (this repo)
  └── HTTPS ──► nginx (pear-sandbox.everbetter.com)
                  └── reverse proxy ──► Bun/Hono (127.0.0.1:8787)
                                          └── SQLite (/opt/foodpod/)

POST /complete  →  Gemini 1.5 Pro (vision + script, one call)
                →  ElevenLabs TTS  →  MP3 saved to /opt/foodpod/media/audio/
                →  episode row written to SQLite

Media served via:
  /media/images/  — uploaded meal photos
  /media/audio/   — generated MP3s
  (HTTP range requests + 7-day immutable cache headers)
```

The Expo app never communicates with Gemini or ElevenLabs directly. It POSTs to the backend and polls until `status: ready`, then streams audio from the `/media/audio/` endpoint using expo-av.

