/**
 * Food Pod sub-layout — /food/...
 *
 * Wraps all food screens in FoodPodProvider so the active pod ID
 * is shared between /food (home) and /food/capture without prop-drilling.
 */

import { Stack } from 'expo-router';
import { FoodPodProvider } from '@/store/food-pod.store';

export default function FoodLayout() {
  return (
    <FoodPodProvider>
      <Stack screenOptions={{ headerBackTitle: 'Back' }}>
        <Stack.Screen name="index" options={{ title: 'Food Pod' }} />
        {/* capture and pod/[id] screens added in F2/F3 once New-pear-backend is live */}
      </Stack>
    </FoodPodProvider>
  );
}
