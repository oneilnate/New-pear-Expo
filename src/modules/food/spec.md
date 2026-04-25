# food — Food Pod Module

## Purpose

Owns the client-side types, React Query hooks, and public API surface for the
Food Pod feature. A user captures meal images over time, then receives a
personalised nutrition podcast.

**Standalone app**: This module is the entire feature surface of New-pear-Expo.
There are no other modules. The backend is oneilnate/New-pear-backend.

This module does NOT own:
- Network calls (all fetch() lives in `src/services/food.service.ts`)
- Screen layout / navigation (lives in `src/app/food/`)
- Audio playback (expo-av, handled in the playback screen)

## Responsibilities

Owns:
- `types.ts` — Pod, Meal, Podcast, GroundedFacts, and supporting status types
- `hooks.ts` — React Query wrappers (mutations + queries) over food.service
- `index.ts` — barrel export of types + hooks (no default export)

## Scaffold status

F3-E1 implemented. usePodState hook + PodGrid/PodCounter/FoodSnapCard components
added. Home screen (/food) pixel-matches IMG_5116/IMG_5117.

FoodSnapCard restyled (Simon's mock): light-gray pill #CBD5E1 background, dark
text #0F172A title / #334155 sublabel, bright-green #22C55E camera circle (52px)
on the right using Ionicons camera-outline. Copy updated to 'Snap food &
beverages' / 'Capture your next food-item to progress'. Removed chevron arrow.

F3-E2 implemented. useUploadMeal hook added. Calls uploadMeal() service (POST
/api/pods/:podId/images multipart) and invalidates podState and currentPod queries
on success so home grid dots and N/7 counter auto-refresh immediately after snap.

F3-E3 implemented. TuneInModal component + useTuneIn hook added.
- isUnlocked: status === 'ready' && episode != null
- hasShownTuneIn: persisted per-pod via expo-secure-store
- Auto-shows on first unlock, re-openable via "Tune In" banner button
- Tune In navigates to /food/player; Not Now dismisses + persists flag

F3-E4 implemented. Full player screen at /food/player + audio playback.
- getEpisode(podId) added to food.service.ts (GET /api/pods/:id/episode)
- useEpisode(podId) React Query hook (staleTime: 60s, no 404 retry)
- useAudioPlayer(audioUrl) wraps expo-av Audio.Sound: load/play/pause/seek/unload
- Auto-pauses on screen blur via useFocusEffect
- PlayerControls component: circular 72px play/pause (#15803D), progress bar,
  back-15/fwd-15 skip buttons, elapsed/remaining MM:SS labels
- Player screen: black area + "FoodPod" title + timer pill + white bottom sheet
  with episode title, date, summary, PlayerControls (pixel-matches IMG_5119)
- Loading: "Tuning in..." + ActivityIndicator
- 404: "Your FoodPod isn't ready yet" + back button
- Other error: message + retry button

## Public API

See `index.ts` for the full export list. Key exports:
- Types: `Pod`, `Meal`, `Podcast`, `PodStatus`, `MealStatus`, `CreateMealResponse`
- Hooks: `useCreatePod`, `useCreateMeal`, `useUploadMealImage`, `useUploadMeal`, `usePatchMeal`, `useCompletePod`, `usePodStatus`, `usePodcast`, `usePodState`, `useCurrentPod`, `useTuneIn`, `useEpisode`, `useAudioPlayer` (returns `loadError: string | null`)
- Components: `PodGrid`, `PodCounter`, `FoodSnapCard`, `TuneInModal`, `PlayerControls`, `StartNewPodButton`
- Types: `Episode`, `AudioPlayerState`

## Closed-loop check

```bash
pnpm test --run src/services
pnpm typecheck
pnpm lint
```

All three must exit 0 before committing changes to this module.

F8 (exe_n8VFR9XQ) implemented. Audio error surfacing + player layout fix.
- useAudioPlayer: `loadError: string | null` added to AudioPlayerState; catch block sets it
  instead of silently swallowing errors; reset to null on URL change and unmount cleanup.
- player.tsx: `loadError` banner (yellow) shown in white bottom sheet when audio fails to load.
- player.tsx: sheet layout changed from `maxHeight: '55%'` to `height: '50%'` so PlayerControls
  are always visible regardless of scroll content height.

F7 (exe_VKuAAzpN) implemented. Dynamic current pod + 7-dot grid + StartNewPodButton.
- getCurrentPod() added to food.service.ts (GET /api/pods/current)
- useCurrentPod() React Query hook (staleTime: 10s); foodQueryKeys.currentPod added
- DEMO_POD_ID removed from all production paths (index.tsx, capture.tsx, player.tsx)
  now read podId from useCurrentPod().data?.id
- PodGrid updated: dot count now driven by targetCount prop (COLUMNS=7);
  totalDots = targetCount > 0 ? targetCount : 7; maintains IMG_5116/5117 visual style
- StartNewPodButton added: secondary style, always visible on Home screen;
  tap -> POST /api/pods -> invalidate currentPod query -> reset FoodPodProvider
  -> stays on home screen (user sees fresh 0/7 pod; no navigation to /food/capture)
