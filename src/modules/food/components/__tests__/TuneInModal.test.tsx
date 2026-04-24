/**
 * TuneInModal — component tests
 *
 * Verifies:
 * - Modal renders when visible=true
 * - Modal is hidden when visible=false
 * - "Tune In" button calls onTuneIn
 * - "Not Now" button calls onNotNow
 * - Accessibility labels and roles are present
 *
 * F3-E3: TuneInModal tests
 */

import { fireEvent, render } from '@testing-library/react-native';
// biome-ignore lint/correctness/noUnusedImports: vitest-native requires React in scope for JSX transform
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { TuneInModal } from '../TuneInModal';

describe('TuneInModal', () => {
  it('renders headline and subtitle when visible', () => {
    const { getByText } = render(
      <TuneInModal visible={true} onTuneIn={vi.fn()} onNotNow={vi.fn()} />,
    );
    expect(getByText('Your FoodPod')).toBeTruthy();
    expect(getByText('Tune In')).toBeTruthy();
    expect(getByText('Not Now')).toBeTruthy();
  });

  it('is not rendered when visible=false', () => {
    const { queryByText } = render(
      <TuneInModal visible={false} onTuneIn={vi.fn()} onNotNow={vi.fn()} />,
    );
    // React Native Modal with visible=false still mounts but is not interactive
    // queryByText may still return null or null depending on RN Modal implementation
    // We assert the "Tune In" button text not being visually present
    expect(queryByText('Tune In')).toBeNull();
  });

  it('calls onTuneIn when "Tune In" button is pressed', () => {
    const onTuneIn = vi.fn();
    const { getByLabelText } = render(
      <TuneInModal visible={true} onTuneIn={onTuneIn} onNotNow={vi.fn()} />,
    );
    fireEvent.press(getByLabelText('Tune In to your FoodPod'));
    expect(onTuneIn).toHaveBeenCalledTimes(1);
  });

  it('calls onNotNow when "Not Now" button is pressed', () => {
    const onNotNow = vi.fn();
    const { getByLabelText } = render(
      <TuneInModal visible={true} onTuneIn={vi.fn()} onNotNow={onNotNow} />,
    );
    fireEvent.press(getByLabelText('Not Now — dismiss Tune In modal'));
    expect(onNotNow).toHaveBeenCalledTimes(1);
  });

  it('has correct accessibilityRole on Tune In button', () => {
    const { getByRole } = render(
      <TuneInModal visible={true} onTuneIn={vi.fn()} onNotNow={vi.fn()} />,
    );
    // Both "Tune In" and "Not Now" have accessibilityRole="button"
    const buttons = getByRole('button', { name: 'Tune In to your FoodPod' });
    expect(buttons).toBeTruthy();
  });

  it('has correct accessibilityRole on Not Now button', () => {
    const { getByRole } = render(
      <TuneInModal visible={true} onTuneIn={vi.fn()} onNotNow={vi.fn()} />,
    );
    const btn = getByRole('button', { name: 'Not Now — dismiss Tune In modal' });
    expect(btn).toBeTruthy();
  });
});
