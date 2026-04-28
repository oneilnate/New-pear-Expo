/**
 * MealThumbnailGrid — 4×2 grid of rounded photo squares replacing PodGrid dots.
 *
 * Renders targetCount slots (default 8) in rows of 4 columns.
 * - Empty slot: #E2E8F0 background square.
 * - Filled slot: meal photo via <Image> with full URL (API_BASE + snap.thumb).
 *
 * Backend returns recentSnaps DESC (most-recent-first).
 * The component reverses them so slot 0 is the first captured meal.
 *
 * Architecture: display-only component — no hooks, no fetch.
 */

// biome-ignore lint/correctness/noUnusedImports: vitest-native requires React in scope for JSX transform
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

const SLOT_SIZE = 64;
const SLOT_RADIUS = 12;
const SLOT_GAP = 10;
const COLUMNS = 4;
const EMPTY_BG = '#E2E8F0';

export type SnapThumb = { id: string; thumb: string; rating: string | null };

export type MealThumbnailGridProps = {
  recentSnaps: SnapThumb[];
  targetCount: number;
};

export function MealThumbnailGrid({ recentSnaps, targetCount }: MealThumbnailGridProps) {
  const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
  const total = targetCount > 0 ? targetCount : 8;
  // Backend returns DESC (most-recent-first); reverse so slot 0 = first captured meal
  const snaps = [...recentSnaps].reverse();
  const rows: number[][] = [];
  for (let r = 0; r < Math.ceil(total / COLUMNS); r++) {
    const row: number[] = [];
    for (let c = 0; c < COLUMNS; c++) {
      const index = r * COLUMNS + c;
      if (index < total) row.push(index);
    }
    rows.push(row);
  }

  return (
    <View style={styles.grid} accessible={false}>
      {rows.map((row, ri) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: grid rows are positional; row index is the stable identity
        <View key={`row-${ri}`} style={styles.row}>
          {row.map((slotIndex) => {
            const snap = snaps[slotIndex];
            return (
              <View key={`slot-${slotIndex}`} style={styles.slot}>
                {snap ? (
                  <Image
                    source={{ uri: `${apiBase}${snap.thumb}` }}
                    style={styles.image}
                    resizeMode="cover"
                    accessibilityLabel={`Captured meal ${slotIndex + 1}`}
                  />
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'column', gap: SLOT_GAP, alignItems: 'center' },
  row: { flexDirection: 'row', gap: SLOT_GAP },
  slot: {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderRadius: SLOT_RADIUS,
    backgroundColor: EMPTY_BG,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
});
