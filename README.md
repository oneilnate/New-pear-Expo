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
- `pnpm verify:fast` is the CI gate (typecheck + lint + test + build:web + size-limit)
