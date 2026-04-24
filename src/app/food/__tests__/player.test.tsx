/**
 * FoodPlayerScreen integration tests.
 *
 * Verifies four render paths:
 *   1. Loading: ActivityIndicator + "Tuning in..." while episode query is pending
 *   2. No episode (404): "Your FoodPod isn't ready yet" + back button
 *   3. Other error: error message + retry button
 *   4. Success: episode title, summary, and audio controls rendered
 *
 * Mock strategy:
 *   - MSW intercepts GET /api/pods/:podId/episode
 *   - expo-av: auto-mocked via __mocks__/expo-av.ts (loaded by test-setup.ts)
 *   - expo-router: inline vi.mock (overrides global setup mock)
 *   - expo-secure-store: auto-mocked via __mocks__/expo-secure-store.ts
 *
 * F3-E4 — src/app/food/__tests__/player.test.tsx
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
// biome-ignore lint/style/useImportType: React value import required for JSX transform in vitest-native
import React from 'react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockRouterBack } = vi.hoisted(() => ({
  mockRouterBack: vi.fn(),
}));

vi.mock('expo-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: mockRouterBack,
  }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: vi.fn(),
  Redirect: () => null,
  Stack: () => null,
  Link: () => null,
}));

vi.mock('expo-secure-store', () => {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    getItemAsync: async (key: string) => store[key] ?? null,
    setItemAsync: async (key: string, value: string) => {
      store[key] = value;
    },
    deleteItemAsync: async (key: string) => {
      delete store[key];
    },
    isAvailableAsync: async () => true,
  };
});

// ─── Environment ─────────────────────────────────────────────────────────────

const BASE_URL = 'https://test-player-screen.example.com';
process.env.EXPO_PUBLIC_API_BASE_URL = BASE_URL;
process.env.EXPO_PUBLIC_DEMO_BEARER_TOKEN = 'test-token-player-screen';

// ─── Screen under test ────────────────────────────────────────────────────────

import FoodPlayerScreen from '../player';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockEpisode = {
  episodeId: 'ep_001',
  audioUrl: 'https://example.com/episode.mp3',
  durationSec: 183,
  title: 'FoodPod',
  summary:
    "Here's your weekly nutrition recap! You hit your protein goals 5 out of 7 days with great hydration levels.",
  highlights: ['protein goals met', 'hydration excellent'],
  createdAt: '2026-03-10T00:00:00.000Z',
};

// ─── MSW server ───────────────────────────────────────────────────────────────

const server = setupServer(
  // GET /api/pods/current — required by useCurrentPod() in FoodPlayerScreen
  http.get(`${BASE_URL}/api/pods/current`, () =>
    HttpResponse.json({ id: 'pod_demo_01', status: 'ready', targetCount: 7, capturedCount: 7, recentSnaps: [], episode: { audioUrl: 'https://example.com/ep.mp3' } }),
  ),
  http.get(`${BASE_URL}/api/pods/:podId/episode`, () => HttpResponse.json(mockEpisode)),
);


beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <FoodPlayerScreen />
    </QueryClientProvider>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('FoodPlayerScreen — loading state', () => {
  it('shows ActivityIndicator with "Tuning in" while loading', () => {
    // Make the request never resolve
    server.use(http.get(`${BASE_URL}/api/pods/:podId/episode`, () => new Promise(() => {})));
    const { getByLabelText } = renderScreen();
    expect(getByLabelText('Tuning in')).toBeTruthy();
  });

  it('renders loading container with correct accessibility label', () => {
    server.use(http.get(`${BASE_URL}/api/pods/:podId/episode`, () => new Promise(() => {})));
    const { getByLabelText } = renderScreen();
    expect(getByLabelText('Loading player')).toBeTruthy();
  });
});

describe('FoodPlayerScreen — 404 no-episode path', () => {
  beforeEach(() => {
    server.use(
      http.get(`${BASE_URL}/api/pods/:podId/episode`, () =>
        HttpResponse.json({ error: 'No episode' }, { status: 404 }),
      ),
    );
  });

  it('shows "Your FoodPod" text when 404', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => {
      expect(getByText(/Your FoodPod/)).toBeTruthy();
    });
  });

  it('shows back button when 404', async () => {
    const { getByLabelText } = renderScreen();
    await waitFor(() => {
      expect(getByLabelText('Go back to Food home')).toBeTruthy();
    });
  });

  it('back button calls router.back()', async () => {
    const { getByLabelText } = renderScreen();
    await waitFor(() => {
      expect(getByLabelText('Go back to Food home')).toBeTruthy();
    });
    fireEvent.press(getByLabelText('Go back to Food home'));
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });
});

describe('FoodPlayerScreen — other error path', () => {
  it('shows retry button on non-404 error', async () => {
    server.use(
      http.get(`${BASE_URL}/api/pods/:podId/episode`, () =>
        HttpResponse.json({ error: 'Server Error' }, { status: 500 }),
      ),
    );

    const { getByLabelText } = renderScreen();
    await waitFor(() => {
      expect(getByLabelText('Retry loading episode')).toBeTruthy();
    });
  });

  it('shows error message text on 500', async () => {
    server.use(
      http.get(`${BASE_URL}/api/pods/:podId/episode`, () =>
        HttpResponse.json({ error: 'Server Error' }, { status: 500 }),
      ),
    );

    const { getByText } = renderScreen();
    await waitFor(() => {
      expect(getByText(/HTTP 500/)).toBeTruthy();
    });
  });
});

describe('FoodPlayerScreen — success state', () => {
  it('renders episode title', async () => {
    const { getAllByText } = renderScreen();
    await waitFor(() => {
      // FoodPod appears as big title + episode title in bottom sheet
      expect(getAllByText('FoodPod').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders episode summary text', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => {
      expect(getByText(/protein goals/)).toBeTruthy();
    });
  });

  it('renders play button in initial paused state', async () => {
    const { getByLabelText } = renderScreen();
    await waitFor(() => {
      expect(getByLabelText('Play')).toBeTruthy();
    });
  });

  it('renders skip back and skip forward buttons', async () => {
    const { getByLabelText } = renderScreen();
    await waitFor(() => {
      expect(getByLabelText('Skip back 15 seconds')).toBeTruthy();
      expect(getByLabelText('Skip forward 15 seconds')).toBeTruthy();
    });
  });

  it('renders progress bar with accessibility role', async () => {
    const { UNSAFE_getByProps } = renderScreen();
    await waitFor(() => {
      expect(UNSAFE_getByProps({ accessibilityRole: 'progressbar' })).toBeTruthy();
    });
  });
});
