/**
 * Food module — public API.
 * Named exports only (no default export per AGENTS.md).
 *
 * SCAFFOLD: index.ts wired. Full hooks/types finalized in F2/F3.
 */

export type { FoodSnapCardProps } from './components/FoodSnapCard';

// Components
export { FoodSnapCard } from './components/FoodSnapCard';
export type { PodCounterProps } from './components/PodCounter';
export { PodCounter } from './components/PodCounter';
export type { PodGridProps } from './components/PodGrid';
export { PodGrid } from './components/PodGrid';
// Hooks
export {
  foodQueryKeys,
  useCompletePod,
  useCreateMeal,
  useCreatePod,
  usePatchMeal,
  usePodcast,
  usePodState,
  usePodStatus,
  useUploadMealImage,
} from './hooks';

// Types
export type {
  CreateMealResponse,
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
