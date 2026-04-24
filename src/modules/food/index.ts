/**
 * Food module — public API.
 * Named exports only (no default export per AGENTS.md).
 *
 * SCAFFOLD: index.ts wired. Full hooks/types finalized in F2/F3.
 */

export type { FoodSnapCardProps } from './components/FoodSnapCard';

// Components
export { FoodSnapCard } from './components/FoodSnapCard';
// Player
export type { PlayerControlsProps } from './components/PlayerControls';
export { formatMs, PlayerControls } from './components/PlayerControls';
export type { PodCounterProps } from './components/PodCounter';
export { PodCounter } from './components/PodCounter';
export type { PodGridProps } from './components/PodGrid';
export { PodGrid } from './components/PodGrid';
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
