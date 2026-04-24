/**
 * PodGrid — 30-dot grid visualising meal capture progress.
 *
 * Layout: 6 columns × 5 rows = 30 dots
 * Captured dots: #15803D (WCAG AA 4.86:1 on white)
 * Empty dots:    #E2E8F0 (decorative, no contrast requirement)
 * Dot size: 12px diameter, 16px gap
 *
 * Architecture: display-only component — no hooks, no fetch.
 */

// biome-ignore lint/correctness/noUnusedImports: vitest-native requires React in scope for JSX transform
import React from 'react';
import { StyleSheet, View } from 'react-native';

const TOTAL_DOTS = 30;
const DOT_SIZE = 12;
const DOT_GAP = 16;
const COLUMNS = 6;

const GREEN = '#15803D'; // WCAG AA 4.86:1 on #FFFFFF
const GRAY = '#E2E8F0'; // decorative empty state

export type PodGridProps = {
  capturedCount: number;
  targetCount: number;
};

export function PodGrid({ capturedCount, targetCount }: PodGridProps) {
  const filled = Math.min(capturedCount, targetCount);

  const rows: boolean[][] = [];
  for (let r = 0; r < Math.ceil(TOTAL_DOTS / COLUMNS); r++) {
    const row: boolean[] = [];
    for (let c = 0; c < COLUMNS; c++) {
      const index = r * COLUMNS + c;
      if (index < TOTAL_DOTS) {
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
