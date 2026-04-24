# Food Pod — Buzz ONeil

A food-pod-only Expo app. Capture meals, get a personalised nutrition podcast.

**This is Buzz's work.** Forked from the Functional-Health scaffold, trimmed to food features only.

---

## Architecture

Two repos, one deliverable:

| Repo | Role |
|---|---|
| **oneilnate/New-pear-Expo** (this repo) | Expo React Native app — UI, camera capture, podcast playback |
| **oneilnate/New-pear-backend** | Bun + Hono + SQLite API on `pear-sandbox.everbetter.com` |

The Expo app talks to the backend via `EXPO_PUBLIC_API_BASE_URL`. Default: `https://pear-sandbox.everbetter.com`.

No auth. Single demo bearer token via `EXPO_PUBLIC_DEMO_BEARER_TOKEN`.

---

## What's in this repo

- `src/modules/food/` — food pod types, React Query hooks
- `src/services/food.service.ts` — API client for the VM backend
- `src/store/food-pod.store.tsx` — active pod ID state (React context)
- `src/app/food/` — food screens (home, pod status/playback)
- `src/components/app-tabs.tsx` — single 'Food Pod' tab

**Removed from scaffold**: auth, energy, feed, marketplace, mepod, mood, workouts.

---

## Setup

```bash
pnpm install
pnpm start          # Expo Go dev server
pnpm verify:fast    # typecheck + lint + test:coverage + build:web + size-limit
```

Requires Node 22+, pnpm 9.

---

## Environment

Create `.env.local` (gitignored):

```
EXPO_PUBLIC_API_BASE_URL=https://pear-sandbox.everbetter.com
EXPO_PUBLIC_DEMO_BEARER_TOKEN=<token>
```

---

## CI

- Every push to `main` publishes an EAS OTA update (Expo Go QR code in PR comment)
- Every non-draft PR gets an Expo Go preview QR code posted in the PR comments
- `pnpm verify:fast` is the CI gate (typecheck + lint + test + build:web + size-limit)

---

## CI & EAS Setup

The OTA preview workflow requires one GitHub Actions secret to be set:

### `EXPO_TOKEN`

This is the Expo account token that lets the CI runner authenticate with EAS and publish OTA updates.

**How to set it (one-time setup):**

1. Get your Expo token from [expo.dev/accounts/nateoutsidethebox/settings/access-tokens](https://expo.dev/accounts/nateoutsidethebox/settings/access-tokens)
   - Or retrieve it from the Obvious workspace secret `EXPO_TOKEN` (ask an admin)
2. Set it as a GitHub Actions secret:

```bash
echo "<your-expo-token>" | gh secret set EXPO_TOKEN --repo oneilnate/New-pear-Expo
```

To verify it's set:
```bash
gh secret list --repo oneilnate/New-pear-Expo
# Should show: EXPO_TOKEN   Updated <date>
```

**What happens after it's set:**
- Every PR gets a sticky comment with a **scannable QR code** — open Expo Go and scan to load that PR's exact JS bundle on your device
- Push to `main` posts a commit comment with the production QR code
- EAS preview branches (`pr-<number>`) are auto-deleted when the PR closes

### Expo project details

| Field | Value |
|-------|-------|
| Project ID | `28a85fb2-e56c-4a53-a398-0080b43414ea` |
| Owner | `nateoutsidethebox` |
| Slug | `food-pod` |
| App scheme | `foodpod` |
| EAS update URL | `https://u.expo.dev/28a85fb2-e56c-4a53-a398-0080b43414ea` |

> **Note:** The project is already registered on expo.dev. The `EXPO_TOKEN` is the only missing piece — once set, CI will be fully green.
