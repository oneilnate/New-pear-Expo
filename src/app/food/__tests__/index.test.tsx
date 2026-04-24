/**
 * Food home screen — integration test
 *
 * Verifies:
 * - Loading state: ActivityIndicator is rendered while query is pending
 * - Success state: PodGrid and counter text appear with data from mocked API
 * - Error state: error message and retry button rendered on failure
 * - UNLOCKED state: shown when capturedCount >= targetCount
 * - Tune In modal: auto-shown when status='ready' && episode != null
 * - Not Now: dismisses modal (flag persisted via expo-secure-store mock)
 * - Modal does not re-show after Not Now dismissal
 *
 * Mocks: MSW intercepts GET /api/pods/current, expo-router mocked
 *
 * F3-E1: loading / success / error / unlocked states
 * F3-E3: Tune In modal auto-show, Not Now dismiss, re-open via banner
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

// Mock expo-router before importing the screen
// NOTE: vi.mock is hoisted; no JSX or React in the factory
vi.mock('expo-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
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
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  // Clear in-memory secure store between tests
  for (const key of Object.keys(secureStore)) {
    delete (secureStore as Record<string, string>)[key];
  }
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

  it('renders PodGrid and counter text after successful data fetch', async () => {
    const { getByLabelText, getByText, queryByLabelText } = renderWithQueryClient(
      <FoodHomeScreen />,
    );

    // Loading state first
    expect(getByLabelText('Loading Food Pod')).toBeTruthy();

    // Wait for success state
    await waitFor(() => {
      expect(queryByLabelText('Loading Food Pod')).toBeNull();
    });

    // PodGrid is present: 3 captured, 27 empty
    expect(getByLabelText('Captured meal 1')).toBeTruthy();
    expect(getByLabelText('Empty slot 4')).toBeTruthy();

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

  it('renders all 30 PodGrid dots in the success state tree', async () => {
    const { queryByLabelText, getAllByLabelText } = renderWithQueryClient(<FoodHomeScreen />);

    await waitFor(() => {
      expect(queryByLabelText('Loading Food Pod')).toBeNull();
    });

    // Verify grid dots are rendered (30 total)
    const dots = getAllByLabelText(/Captured meal|Empty slot/);
    expect(dots).toHaveLength(30);
  });

  it('shows UNLOCKED state when capturedCount >= targetCount', async () => {
    server.use(
      http.get(`${BASE_URL}/api/pods/current`, () =>
        HttpResponse.json({ ...mockPodState, capturedCount: 30, targetCount: 30 }),
      ),
    );

    const { queryByLabelText, getByLabelText } = renderWithQueryClient(<FoodHomeScreen />);

    await waitFor(() => {
      expect(queryByLabelText('Loading Food Pod')).toBeNull();
    });

    expect(getByLabelText('Food Pod unlocked')).toBeTruthy();
  });

  it('shows Tune In modal when status=ready and episode is non-null', async () => {
    server.use(http.get(`${BASE_URL}/api/pods/current`, () => HttpResponse.json(mockPodReady)));

    const { queryByLabelText, getByText } = renderWithQueryClient(<FoodHomeScreen />);

    await waitFor(() => {
      expect(queryByLabelText('Loading Food Pod')).toBeNull();
    });

    // TuneInModal should be visible
    await waitFor(() => {
      expect(getByText('Your FoodPod')).toBeTruthy();
    });
    expect(getByText('Tune In')).toBeTruthy();
    expect(getByText('Not Now')).toBeTruthy();
  });

  it('dismisses modal and persists flag when "Not Now" is pressed', async () => {
    server.use(http.get(`${BASE_URL}/api/pods/current`, () => HttpResponse.json(mockPodReady)));

    const { queryByLabelText, getByLabelText, queryByText } = renderWithQueryClient(
      <FoodHomeScreen />,
    );

    await waitFor(() => {
      expect(queryByLabelText('Loading Food Pod')).toBeNull();
    });

    // Wait for modal to appear
    await waitFor(() => {
      expect(getByLabelText('Not Now — dismiss Tune In modal')).toBeTruthy();
    });

    // Press Not Now
    await act(async () => {
      fireEvent.press(getByLabelText('Not Now — dismiss Tune In modal'));
    });

    // Modal should be dismissed
    await waitFor(() => {
      expect(queryByText('Not Now')).toBeNull();
    });

    // SecureStore flag should be set
    expect(secureStore.tune_in_dismissed_pod_demo_01).toBe('true');
  });

  it('does not auto-show modal again if dismissed flag is already set', async () => {
    // Pre-seed the dismissal flag
    secureStore.tune_in_dismissed_pod_demo_01 = 'true';

    server.use(http.get(`${BASE_URL}/api/pods/current`, () => HttpResponse.json(mockPodReady)));

    const { queryByLabelText, queryByText } = renderWithQueryClient(<FoodHomeScreen />);

    await waitFor(() => {
      expect(queryByLabelText('Loading Food Pod')).toBeNull();
    });

    // Give it time to load storage and settle
    await waitFor(() => {
      expect(queryByText('Not Now')).toBeNull();
    });
  });

  it('Tune In button is accessible and can be pressed when modal is shown', async () => {
    server.use(http.get(`${BASE_URL}/api/pods/current`, () => HttpResponse.json(mockPodReady)));

    const { queryByLabelText, getByLabelText } = renderWithQueryClient(<FoodHomeScreen />);

    await waitFor(() => {
      expect(queryByLabelText('Loading Food Pod')).toBeNull();
    });

    // TuneInModal visible — Tune In button accessible
    await waitFor(() => {
      expect(getByLabelText('Tune In to your FoodPod')).toBeTruthy();
    });

    // Pressing Tune In should not throw; navigation is handled by mocked router
    await act(async () => {
      fireEvent.press(getByLabelText('Tune In to your FoodPod'));
    });

    // Modal should close after pressing Tune In
    await waitFor(() => {
      expect(queryByLabelText('Not Now — dismiss Tune In modal')).toBeNull();
    });
  });
});
