/**
 * PodCounter — unit tests
 *
 * Verifies:
 * - Shows X/target format when captured < target (e.g. 3/7)
 * - Shows UNLOCKED when captured >= target (7/7 → UNLOCKED)
 * - Shows UNLOCKED when capturedCount > targetCount
 * - Correct accessibility labels
 *
 * F3-E1: src/modules/food/components/__tests__/PodCounter.test.tsx
 */

import { render } from '@testing-library/react-native';
// biome-ignore lint/correctness/noUnusedImports: vitest-native requires React in scope for JSX transform
import React from 'react';
import { describe, expect, it } from 'vitest';

import { PodCounter } from '../PodCounter';

describe('PodCounter', () => {
  it('shows 3/7 when capturedCount=3, targetCount=7', () => {
    const { getByText } = render(<PodCounter capturedCount={3} targetCount={7} />);
    expect(getByText('3/7')).toBeTruthy();
  });

  it('shows UNLOCKED when capturedCount=7, targetCount=7', () => {
    const { getByText } = render(<PodCounter capturedCount={7} targetCount={7} />);
    expect(getByText('UNLOCKED')).toBeTruthy();
  });

  it('shows UNLOCKED when capturedCount exceeds targetCount', () => {
    const { getByText } = render(<PodCounter capturedCount={31} targetCount={30} />);
    expect(getByText('UNLOCKED')).toBeTruthy();
  });

  it('shows 0/30 when capturedCount=0', () => {
    const { getByText } = render(<PodCounter capturedCount={0} targetCount={30} />);
    expect(getByText('0/30')).toBeTruthy();
  });

  it('shows 29/30 when capturedCount=29', () => {
    const { getByText } = render(<PodCounter capturedCount={29} targetCount={30} />);
    expect(getByText('29/30')).toBeTruthy();
  });

  it('has correct accessibility label for in-progress state', () => {
    const { getByLabelText } = render(<PodCounter capturedCount={3} targetCount={7} />);
    expect(getByLabelText('3 of 7 meals captured')).toBeTruthy();
  });

  it('has correct accessibility label for UNLOCKED state', () => {
    const { getByLabelText } = render(<PodCounter capturedCount={7} targetCount={7} />);
    expect(getByLabelText('Food Pod unlocked')).toBeTruthy();
  });
});
