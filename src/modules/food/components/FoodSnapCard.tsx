/**
 * FoodSnapCard — CTA card for capturing a new meal snap.
 *
 * Prominent card/button that navigates to /food/capture.
 * Green background, camera icon, label text.
 * Satisfies WCAG AA: white text on #15803D = 4.86:1.
 *
 * Architecture: display-only, navigation triggered by onPress callback.
 */

// biome-ignore lint/correctness/noUnusedImports: vitest-native requires React in scope for JSX transform
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type FoodSnapCardProps = {
  onPress: () => void;
};

export function FoodSnapCard({ onPress }: FoodSnapCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityLabel="Snap a meal"
      accessibilityRole="button"
      accessibilityHint="Navigate to meal capture screen"
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>📷</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.label}>Snap a meal</Text>
        <Text style={styles.sublabel}>Capture your next meal to progress</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#15803D',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 14,
  },
  cardPressed: {
    opacity: 0.85,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sublabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  arrow: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '300',
  },
});
