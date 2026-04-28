/**
 * Food module — public API.
 * Named exports only (no default export per AGENTS.md).
 *
 * SCAFFOLD: index.ts wired. Full hooks/types finalized in F2/F3.
 */

export type { FoodSnapCardProps } from './components/FoodSnapCard';

// Components
export { FoodSnapCard } from './components/FoodSnapCard';
export type {
  MealThumbnailGridProps,
  SnapThumb as MealSnapThumb,
} from './components/MealThumbnailGrid';
export { MealThumbnailGrid } from './components/MealThumbnailGrid';
// Player
export type { PlayerControlsProps } from './components/PlayerControls';
export { formatMs, PlayerControls } from './components/PlayerControls';
export type { PodCounterProps } from './components/PodCounter';
export { PodCounter } from './components/PodCounter';
export type { PodGridProps } from './components/PodGrid';
export { PodGrid } from './components/PodGrid';
export { StartNewPodButton } from './components/StartNewPodButton';
// TuneIn
export type { TuneInModalProps } from './components/TuneInModal';
export { TuneInModal } from './components/TuneInModal';
export type { AudioPlayerState } from './hooks';
// Hooks
export {
  foodQueryKeys,
  useAudioPlayer,
  useCompletePod,
  useCreateMeal,
  useCreatePod,
  useCurrentPod,
  useEpisode,
  usePatchMeal,
  usePodcast,
  usePodState,
  usePodStatus,
  useUploadMeal,
  useUploadMealImage,
} from './hooks';
export type { UseTuneInResult } from './tunein';
export { useTuneIn } from './tunein';
// Types
export type {
  CreateMealResponse,
  Episode,
  GroundedFacts,
  Meal,
  MealStatus,
  PipelineStage,
  Pod,
  Podcast,
  PodStatus,
  StageState,
  StageStatus,
  TranscriptSegment,
} from './types';
