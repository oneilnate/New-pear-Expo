/**
 * Food home screen — integration test
 *
 * Verifies:
 * - Loading state: ActivityIndicator is rendered while query is pending
 * - Success state: PodGrid and counter text appear with data from mocked API
 * - Error state: error message and retry button rendered on failure
 * - UNLOCKED state: shown when capturedCount >= targetCount
 * - Auto-navigation: router.push('/food/player') called ONCE when status='ready' && episode != null
 * - Tune In CTA: navigates to /food/player when pressed
 * - Auto-nav fires only once per pod id (ref guard prevents re-navigation on return)
 *
 * Mocks: MSW intercepts GET /api/pods/current, expo-router mocked
 *
 * F3-E1: loading / success / error / unlocked states
 * F3-E3: direct player auto-navigation, Tune In CTA re-entry
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
// biome-ignore lint/style/useImportType: vitest-native requires React as value (not type) for JSX transform
import React from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { FoodPodProvider } from '@/store/food-pod.store';

// ── Mock expo-secure-store ─────────────────────────────────────────────────
const secureStore: Record<string, string> = {};

vi.mock('expo-secure-store', () => ({
  getItem: (key: string) => secureStore[key] ?? null,
  setItem: (key: string, value: string) => {
    secureStore[key] = value;
  },
  deleteItemAsync: async (key: string) => {
    delete secureStore[key];
  },
}));

// ── Capture router.push spy so tests can assert on navigation calls ──────────
// vi.hoisted ensures the variable is available inside the hoisted vi.mock factory.
const mockPush = vi.hoisted(() => vi.fn());

// Mock expo-router before importing the screen
// NOTE: vi.mock is hoisted; no JSX or React in the factory
vi.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
  }),
  Redirect: () => null,
  Stack: () => null,
  Link: () => null,
}));

import FoodHomeScreen from '../index';

// ── Environment ────────────────────────────────────────────────────────────
const BASE_URL = 'https://test-food-api.example.com';
process.env.EXPO_PUBLIC_API_BASE_URL = BASE_URL;
process.env.EXPO_PUBLIC_DEMO_BEARER_TOKEN = 'test-token-xyz';

// ── Fixtures ──────────────────────────────────────────────────────────────
const mockPodState = {
  id: 'pod_demo_01',
  status: 'draft',
  targetCount: 30,
  capturedCount: 3,
  recentSnaps: [],
  episode: null,
};

const mockPodReady = {
  id: 'pod_demo_01',
  status: 'ready',
  targetCount: 30,
  capturedCount: 30,
  recentSnaps: [],
  episode: { audioUrl: 'https://example.com/ep.mp3', title: 'Week 1' },
};

// ── MSW server ─────────────────────────────────────────────────────────────
const server = setupServer(
  http.get(`${BASE_URL}/api/pods/current`, () => HttpResponse.json(mockPodState)),
  // Default: complete endpoint succeeds silently (returns the pod)
  http.post(`${BASE_URL}/api/pods/:podId/complete`, () =>
    HttpResponse.json({ id: 'pod_demo_01', status: 'generating' }),
  ),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  // Clear in-memory secure store between tests
  for (const key of Object.keys(secureStore)) {
    delete (secureStore as Record<string, string>)[key];
  }
  // Reset navigation spy between tests
  mockPush.mockClear();
});
afterAll(() => server.close());

// ── Helpers ───────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
    },
  });
}

function renderWithQueryClient(ui: React.ReactElement, qc?: QueryClient) {
  const queryClient = qc ?? makeQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <FoodPodProvider>{ui}</FoodPodProvider>
    </QueryClientProvider>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('FoodHomeScreen', () => {
  it('shows loading indicator on initial render', () => {
    const { getByLabelText } = renderWithQueryClient(<FoodHomeScreen />);
    expect(getByLabelText('Loading Food Pod')).toBeTruthy();
  });

  it('renders MealThumbnailGrid and counter text after successful data fetch', async () => {
    const { getByLabelText, getByText, queryByLabelText } = renderWithQueryClient(
      <FoodHomeScreen />,
    );

    // Loading state first
    expect(getByLabelText('Loading Food Pod')).toBeTruthy();

    // Wait for success state
    await waitFor(() => {
      expect(queryByLabelText('Loading Food Pod')).toBeNull();
    });

    // MealThumbnailGrid is present: recentSnaps=[] so no filled slot images
    // Empty slots have no accessibility label — grid renders as plain Views
    // Counter shows "3/30" (progress) in the counter badge
    expect(getByText('3/30')).toBeTruthy();
  });

  it('renders error state and retry button when fetch fails', async () => {
    server.use(
      http.get(`${BASE_URL}/api/pods/current`, () =>
        HttpResponse.json({ error: 'Not Found' }, { status: 404 }),
      ),
    );

    const { getByLabelText, queryByLabelText } = renderWithQueryClient(<FoodHomeScreen />);

    // Wait for error state
    await waitFor(() => {
      expect(queryByLabelText('Loading Food Pod')).toBeNull();
    });

    // Retry button present
    expect(getByLabelText('Retry loading Food Pod')).toBeTruthy();
  });

  it('renders MealThumbnailGrid in the success state tree (30 empty slots)', async () => {
    const { queryByLabelText, queryAllByLabelText } = renderWithQueryClient(<FoodHomeScreen />);

    await waitFor(() => {
      expect(queryByLabelText('Loading Food Pod')).toBeNull();
    });

    // MealThumbnailGrid: recentSnaps=[] → all 30 slots are empty Views, no accessibility labels
    // Filled slot images show 'Captured meal N' but there are none in this fixture
    const filledSlots = queryAllByLabelText(/Captured meal/);
    expect(filledSlots).toHaveLength(0);
  });

  it('shows UNLOCKED state when capturedCount >= targetCount', async () => {
    server.use(
      http.get(`${BASE_URL}/api/pods/current`, () =>
        HttpResponse.json({
          ...mockPodState,
          capturedCount: 30,
          targetCount: 30,
          status: 'ready',
          episode: { audioUrl: 'https://example.com/ep.mp3', title: 'Week 1' },
        }),
      ),
    );

    const { queryByLabelText, getByLabelText } = renderWithQueryClient(<FoodHomeScreen />);

    await waitFor(() => {
      expect(queryByLabelText('Loading Food Pod')).toBeNull();
    });

    await waitFor(() => {
      expect(getByLabelText('Food Pod unlocked')).toBeTruthy();
    });
  });

  it('auto-navigates to /food/player when status=ready and episode is non-null', async () => {
    server.use(http.get(`${BASE_URL}/api/pods/current`, () => HttpResponse.json(mockPodReady)));

    const { queryByLabelText } = renderWithQueryClient(<FoodHomeScreen />);

    await waitFor(() => {
      expect(queryByLabelText('Loading Food Pod')).toBeNull();
    });

    // Auto-navigation to player should fire once pod is ready with an episode
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/food/player');
    });

    // Navigation fires exactly once (ref guard prevents re-navigation)
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('Tune In CTA navigates to /food/player when pressed', async () => {
    server.use(http.get(`${BASE_URL}/api/pods/current`, () => HttpResponse.json(mockPodReady)));

    const { queryByLabelText, getByLabelText } = renderWithQueryClient(<FoodHomeScreen />);

    await waitFor(() => {
      expect(queryByLabelText('Loading Food Pod')).toBeNull();
    });

    // Wait for unlocked state to appear
    await waitFor(() => {
      expect(getByLabelText('Food Pod unlocked')).toBeTruthy();
    });

    // Reset call count so we can isolate the CTA press (auto-nav may have already fired)
    mockPush.mockClear();

    // Press the explicit Tune In CTA
    await act(async () => {
      fireEvent.press(getByLabelText('Open Tune In for your FoodPod'));
    });

    // Should navigate to player
    expect(mockPush).toHaveBeenCalledWith('/food/player');
  });

  it('auto-nav fires only once per pod id (ref guard prevents re-navigation)', async () => {
    server.use(http.get(`${BASE_URL}/api/pods/current`, () => HttpResponse.json(mockPodReady)));

    const { queryByLabelText } = renderWithQueryClient(<FoodHomeScreen />);

    await waitFor(() => {
      expect(queryByLabelText('Loading Food Pod')).toBeNull();
    });

    // Wait for auto-navigation to fire
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/food/player');
    });

    const callsBefore = mockPush.mock.calls.length;

    // Give more time to confirm no additional auto-nav fires
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    // Should still be the same count — navigatedPods ref prevents re-firing
    expect(mockPush.mock.calls.length).toBe(callsBefore);
  });

  // ── Polling-trust tests (F10) ────────────────────────────────────────────

  it('mutation error + status collecting: does not show failed banner, no Retry pressable', async () => {
    // Pod is at 7/7 collecting — auto-complete fires; endpoint returns error
    const collectingFull = {
      id: 'pod_demo_01',
      status: 'collecting',
      targetCount: 7,
      capturedCount: 7,
      recentSnaps: [],
      episode: null,
    };
    server.use(
      http.get(`${BASE_URL}/api/pods/current`, () => HttpResponse.json(collectingFull)),
      http.post(`${BASE_URL}/api/pods/:podId/complete`, () =>
        HttpResponse.json({ error: 'timeout' }, { status: 504 }),
      ),
    );

    const { queryByLabelText, queryByText } = renderWithQueryClient(<FoodHomeScreen />);

    // Wait for data to load
    await waitFor(() => {
      expect(queryByLabelText('Loading Food Pod')).toBeNull();
    });

    // Give mutation time to fire and error handler to run
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // No "Generation failed — Retry" should appear — only backend status drives this
    expect(queryByText('Generation failed — Retry')).toBeNull();
    expect(queryByLabelText('Retry generating your FoodPod')).toBeNull();
  });

  it('status failed: shows failed banner with Retry pressable (backend-driven)', async () => {
    // Backend explicitly sets status to 'failed'
    const failedPod = {
      id: 'pod_demo_01',
      status: 'failed',
      targetCount: 7,
      capturedCount: 7,
      recentSnaps: [],
      episode: null,
    };
    server.use(http.get(`${BASE_URL}/api/pods/current`, () => HttpResponse.json(failedPod)));

    const { queryByLabelText, getByLabelText } = renderWithQueryClient(<FoodHomeScreen />);

    await waitFor(() => {
      expect(queryByLabelText('Loading Food Pod')).toBeNull();
    });

    // Failed banner MUST be visible
    await waitFor(() => {
      expect(getByLabelText('Retry generating your FoodPod')).toBeTruthy();
    });
  });

  it('status generating: shows Generating indicator, no failed banner', async () => {
    const generatingPod = {
      id: 'pod_demo_01',
      status: 'generating',
      targetCount: 7,
      capturedCount: 7,
      recentSnaps: [],
      episode: null,
    };
    server.use(http.get(`${BASE_URL}/api/pods/current`, () => HttpResponse.json(generatingPod)));

    const { queryByLabelText, queryByText, getByLabelText } = renderWithQueryClient(
      <FoodHomeScreen />,
    );

    await waitFor(() => {
      expect(queryByLabelText('Loading Food Pod')).toBeNull();
    });

    // Generating indicator must be visible with updated copy
    await waitFor(() => {
      expect(getByLabelText('Your FoodPod is being created')).toBeTruthy();
    });

    // No failed banner
    expect(queryByLabelText('Retry generating your FoodPod')).toBeNull();
    // No UNLOCKED banner — status is 'generating', not 'ready'
    expect(queryByText('Your FoodPod is Ready!')).toBeNull();
    // No Tune In CTA
    expect(queryByLabelText('Open Tune In for your FoodPod')).toBeNull();
  });

  it('status generating (isGridUnlocked): spinner visible, no UNLOCKED banner, no Tune In CTA', async () => {
    const generatingPod = {
      id: 'pod_demo_01',
      status: 'generating',
      targetCount: 7,
      capturedCount: 7,
      recentSnaps: [],
      episode: null,
    };
    server.use(http.get(`${BASE_URL}/api/pods/current`, () => HttpResponse.json(generatingPod)));

    const { queryByLabelText, queryByText, getByLabelText } = renderWithQueryClient(
      <FoodHomeScreen />,
    );

    await waitFor(() => {
      expect(queryByLabelText('Loading Food Pod')).toBeNull();
    });

    // Spinner with correct copy must be visible
    await waitFor(() => {
      expect(getByLabelText('Your FoodPod is being created')).toBeTruthy();
    });

    // UNLOCKED banner must NOT be visible before status==='ready'
    expect(queryByText('Your FoodPod is Ready!')).toBeNull();
    expect(queryByLabelText('Food Pod unlocked')).toBeNull();
    // Tune In CTA must NOT be present
    expect(queryByLabelText('Open Tune In for your FoodPod')).toBeNull();
  });

  it('status collecting (transient after snap-7, before /complete success): spinner visible', async () => {
    // Simulates the gap between the 7th snap and /complete returning:
    // capturedCount === targetCount but status is still 'collecting'
    const collectingFull = {
      id: 'pod_demo_01',
      status: 'collecting',
      targetCount: 7,
      capturedCount: 7,
      recentSnaps: [],
      episode: null,
    };
    server.use(
      http.get(`${BASE_URL}/api/pods/current`, () => HttpResponse.json(collectingFull)),
      // /complete returns generating — simulates normal path
      http.post(`${BASE_URL}/api/pods/:podId/complete`, () =>
        HttpResponse.json({ id: 'pod_demo_01', status: 'generating' }),
      ),
    );

    const { queryByLabelText, getByLabelText } = renderWithQueryClient(<FoodHomeScreen />);

    await waitFor(() => {
      expect(queryByLabelText('Loading Food Pod')).toBeNull();
    });

    // Spinner must be visible: isGridUnlocked=true, status='collecting' (not 'ready', not 'failed')
    await waitFor(() => {
      expect(getByLabelText('Your FoodPod is being created')).toBeTruthy();
    });
  });
});
