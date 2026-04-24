/**
 * PlayerControls component tests.
 *
 * Verifies:
 *   - Renders play button in paused state
 *   - Renders pause button in playing state
 *   - Pressing play/pause calls correct callback
 *   - Skip back button calls onSkipBack
 *   - Skip forward button calls onSkipForward
 *   - Elapsed and remaining time labels are formatted correctly (MM:SS)
 *   - Progress bar renders with correct accessibility label
 *   - formatMs utility function correctness
 *
 * F3-E4 — src/modules/food/components/__tests__/PlayerControls.test.tsx
 */

import { fireEvent, render } from '@testing-library/react-native';
// biome-ignore lint/correctness/noUnusedImports: vitest-native requires React in scope for JSX transform
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { formatMs, PlayerControls } from '../PlayerControls';

// ─── formatMs utility ─────────────────────────────────────────────────────────

describe('formatMs', () => {
  it('formats 0ms as 00:00', () => {
    expect(formatMs(0)).toBe('00:00');
  });

  it('formats 60000ms as 01:00', () => {
    expect(formatMs(60_000)).toBe('01:00');
  });

  it('formats 183000ms (3:03) as 03:03', () => {
    expect(formatMs(183_000)).toBe('03:03');
  });

  it('formats 3661000ms (1h 1m 1s) as 61:01', () => {
    expect(formatMs(3_661_000)).toBe('61:01');
  });

  it('handles negative values as 00:00', () => {
    expect(formatMs(-1000)).toBe('00:00');
  });

  it('pads seconds with leading zero', () => {
    expect(formatMs(5_000)).toBe('00:05');
  });
});

// ─── PlayerControls rendering ─────────────────────────────────────────────────

describe('PlayerControls', () => {
  const defaultProps = {
    isPlaying: false,
    positionMillis: 0,
    durationMillis: 183_000, // 3:03
    onPlay: vi.fn(),
    onPause: vi.fn(),
    onSeek: vi.fn(),
    onSkipBack: vi.fn(),
    onSkipForward: vi.fn(),
  };

  it('renders Play button when isPlaying=false', () => {
    const { getByLabelText } = render(<PlayerControls {...defaultProps} />);
    expect(getByLabelText('Play')).toBeTruthy();
  });

  it('renders Pause button when isPlaying=true', () => {
    const { getByLabelText } = render(<PlayerControls {...defaultProps} isPlaying={true} />);
    expect(getByLabelText('Pause')).toBeTruthy();
  });

  it('pressing play button calls onPlay', () => {
    const onPlay = vi.fn();
    const { getByLabelText } = render(<PlayerControls {...defaultProps} onPlay={onPlay} />);
    fireEvent.press(getByLabelText('Play'));
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('pressing pause button calls onPause', () => {
    const onPause = vi.fn();
    const { getByLabelText } = render(
      <PlayerControls {...defaultProps} isPlaying={true} onPause={onPause} />,
    );
    fireEvent.press(getByLabelText('Pause'));
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it('pressing skip back button calls onSkipBack', () => {
    const onSkipBack = vi.fn();
    const { getByLabelText } = render(<PlayerControls {...defaultProps} onSkipBack={onSkipBack} />);
    fireEvent.press(getByLabelText('Skip back 15 seconds'));
    expect(onSkipBack).toHaveBeenCalledTimes(1);
  });

  it('pressing skip forward button calls onSkipForward', () => {
    const onSkipForward = vi.fn();
    const { getByLabelText } = render(
      <PlayerControls {...defaultProps} onSkipForward={onSkipForward} />,
    );
    fireEvent.press(getByLabelText('Skip forward 15 seconds'));
    expect(onSkipForward).toHaveBeenCalledTimes(1);
  });

  it('shows elapsed time as 00:00 at start', () => {
    const { getByLabelText } = render(<PlayerControls {...defaultProps} />);
    expect(getByLabelText('Elapsed time 00:00')).toBeTruthy();
  });

  it('shows remaining time as -03:03 at start with durationMillis=183000', () => {
    const { getByLabelText } = render(<PlayerControls {...defaultProps} />);
    expect(getByLabelText('Remaining time -03:03')).toBeTruthy();
  });

  it('shows correct elapsed at mid-play position', () => {
    const { getByLabelText } = render(
      <PlayerControls {...defaultProps} positionMillis={60_000} durationMillis={183_000} />,
    );
    expect(getByLabelText('Elapsed time 01:00')).toBeTruthy();
  });

  it('renders progress bar with correct accessibility role', () => {
    const { UNSAFE_getByProps } = render(<PlayerControls {...defaultProps} />);
    expect(UNSAFE_getByProps({ accessibilityRole: 'progressbar' })).toBeTruthy();
  });

  it('shows --:-- for remaining when durationMillis=0', () => {
    const { getByLabelText } = render(<PlayerControls {...defaultProps} durationMillis={0} />);
    expect(getByLabelText('Remaining time --:--')).toBeTruthy();
  });

  it('renders seek touch target with adjustable role', () => {
    const { UNSAFE_getByProps } = render(<PlayerControls {...defaultProps} />);
    expect(UNSAFE_getByProps({ accessibilityRole: 'adjustable' })).toBeTruthy();
  });
});
