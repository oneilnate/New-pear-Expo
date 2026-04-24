/**
 * PodGrid — unit tests
 *
 * Verifies:
 * - Renders exactly 30 dots total (29 green + 1 gray for 29/30 state)
 * - N dots have the captured (green) accessibility label
 * - Remaining dots have the empty accessibility label
 * - 7/7 (all green) renders correctly
 * - Snapshot captures layout
 *
 * F3-E1: src/modules/food/components/__tests__/PodGrid.test.tsx
 */

import { render } from '@testing-library/react-native';
// biome-ignore lint/correctness/noUnusedImports: vitest-native requires React in scope for JSX transform
import React from 'react';
import { describe, expect, it } from 'vitest';

import { PodGrid } from '../PodGrid';

describe('PodGrid', () => {
  it('renders 30 dots total for a 30-target grid', () => {
    const { getAllByLabelText } = render(<PodGrid capturedCount={0} targetCount={30} />);
    const capturedDots = getAllByLabelText(/Captured meal|Empty slot/);
    expect(capturedDots).toHaveLength(30);
  });

  it('marks 3 dots as captured and 27 as empty for capturedCount=3', () => {
    const { getAllByLabelText } = render(<PodGrid capturedCount={3} targetCount={30} />);
    const captured = getAllByLabelText(/^Captured meal/);
    const empty = getAllByLabelText(/^Empty slot/);
    expect(captured).toHaveLength(3);
    expect(empty).toHaveLength(27);
  });

  it('marks all 30 dots as captured when capturedCount=30', () => {
    const { getAllByLabelText, queryAllByLabelText } = render(
      <PodGrid capturedCount={30} targetCount={30} />,
    );
    const captured = getAllByLabelText(/^Captured meal/);
    const empty = queryAllByLabelText(/^Empty slot/);
    expect(captured).toHaveLength(30);
    expect(empty).toHaveLength(0);
  });

  it('marks 0 dots as captured when capturedCount=0', () => {
    const { queryAllByLabelText, getAllByLabelText } = render(
      <PodGrid capturedCount={0} targetCount={30} />,
    );
    const captured = queryAllByLabelText(/^Captured meal/);
    const empty = getAllByLabelText(/^Empty slot/);
    expect(captured).toHaveLength(0);
    expect(empty).toHaveLength(30);
  });

  it('matches snapshot (29/30 state)', () => {
    const { toJSON } = render(<PodGrid capturedCount={29} targetCount={30} />);
    expect(toJSON()).toMatchSnapshot();
  });
});
