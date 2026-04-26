/**
 * PodGrid — dot grid visualising meal capture progress.
 *
 * Layout: driven by `targetCount` from props. Dots are arranged in rows of up
 * to 7 columns. For the current 7-meal target, this renders a single row of 7.
 *
 * CHANGE from F3-E1: TOTAL_DOTS was hardcoded to 30 (6-col × 5-row); now
 * derived from `targetCount` so the grid responds to server-side target
 * changes automatically. Default 7 matches the new 7-meal target.
 *
 * Captured dots: #22C55E (~3.0:1 on white — UI element, not normal text)
 * Empty dots:    #E2E8F0 (decorative, no contrast requirement)
 * Dot size: 12px diameter, 16px gap (same as F3-E1 — maintains IMG_5116/5117 style)
 *
 * Architecture: display-only component — no hooks, no fetch.
 */

// biome-ignore lint/correctness/noUnusedImports: vitest-native requires React in scope for JSX transform
import React from 'react';
import { StyleSheet, View } from 'react-native';

// Layout constants — maintain IMG_5116/5117 visual style
const DOT_SIZE = 12;
const DOT_GAP = 16;
const COLUMNS = 7;

const GREEN = '#22C55E'; // ~3.0:1 on #FFFFFF — UI element/icon use only
const GRAY = '#E2E8F0'; // decorative empty state

export type PodGridProps = {
  capturedCount: number;
  targetCount: number;
};

export function PodGrid({ capturedCount, targetCount }: PodGridProps) {
  // Drive total dots from server targetCount; prefer dynamic.
  // If targetCount is somehow 0 or negative, fall back to 7.
  const totalDots = targetCount > 0 ? targetCount : 7;
  const filled = Math.min(capturedCount, totalDots);

  const rows: boolean[][] = [];
  for (let r = 0; r < Math.ceil(totalDots / COLUMNS); r++) {
    const row: boolean[] = [];
    for (let c = 0; c < COLUMNS; c++) {
      const index = r * COLUMNS + c;
      if (index < totalDots) {
        row.push(index < filled);
      }
    }
    rows.push(row);
  }

  return (
    <View style={styles.grid} accessible={false}>
      {rows.map((row, rowIndex) => {
        const rowKey = `row-${String(rowIndex)}`;
        return (
          <View key={rowKey} style={styles.row}>
            {row.map((isFilled, colIndex) => {
              const dotKey = `dot-${String(rowIndex * COLUMNS + colIndex)}`;
              return (
                <View
                  key={dotKey}
                  style={[styles.dot, { backgroundColor: isFilled ? GREEN : GRAY }]}
                  accessibilityLabel={
                    isFilled
                      ? `Captured meal ${rowIndex * COLUMNS + colIndex + 1}`
                      : `Empty slot ${rowIndex * COLUMNS + colIndex + 1}`
                  }
                />
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'column',
    gap: DOT_GAP,
  },
  row: {
    flexDirection: 'row',
    gap: DOT_GAP,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});
