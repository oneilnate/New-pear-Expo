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

This is the F1-E1 scaffold. Full hooks/types are stubs — finalized in F2/F3 once
New-pear-backend API contract is confirmed.

## Public API

See `index.ts` for the full export list. Key exports:
- Types: `Pod`, `Meal`, `Podcast`, `PodStatus`, `MealStatus`, `CreateMealResponse`
- Hooks: `useCreatePod`, `useCreateMeal`, `useUploadMealImage`, `usePatchMeal`, `useCompletePod`, `usePodStatus`, `usePodcast`

## Closed-loop check

```bash
pnpm test --run src/services
pnpm typecheck
pnpm lint
```

All three must exit 0 before committing changes to this module.

