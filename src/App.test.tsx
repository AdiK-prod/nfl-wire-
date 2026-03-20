import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

const { mockSupabase } = vi.hoisted(() => {
  const teamsResult = { data: [] as unknown[], error: null };
  const teamsBuilder = {
    order: vi.fn(function (this: unknown) {
      return this;
    }),
    then(onFulfilled?: (value: typeof teamsResult) => unknown, onRejected?: (reason: unknown) => unknown) {
      return Promise.resolve(teamsResult).then(onFulfilled, onRejected);
    },
  };
  const mock = {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signInWithOtp: vi.fn(() => Promise.resolve({ error: null })),
      signOut: vi.fn(() => Promise.resolve()),
    },
    from: vi.fn((table: string) => {
      if (table === 'teams') {
        return { select: vi.fn().mockReturnValue(teamsBuilder) };
      }
      if (table === 'admin_users') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    }),
  };
  return { mockSupabase: mock };
});

vi.mock('./lib/supabase', () => ({
  supabase: mockSupabase,
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders landing masthead on /', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(await screen.findByText('NFL WIRE')).toBeInTheDocument();
  });
});
