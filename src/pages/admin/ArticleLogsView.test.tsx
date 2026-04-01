import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ArticleLogsView from './ArticleLogsView';

const { mockSupabase } = vi.hoisted(() => {
  const mock = {
    from: vi.fn((table: string) => {
      if (table === 'teams') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 't1',
                    city: 'Seattle',
                    name: 'Seahawks',
                    abbreviation: 'SEA',
                  },
                ],
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'pipeline_runs') {
        return {
          select: vi.fn((cols: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.head) {
              return Promise.resolve({ count: 0, error: null });
            }
            return {
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lte: vi.fn().mockReturnValue({
                    order: vi.fn().mockReturnValue({
                      limit: vi.fn().mockReturnValue({
                        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                      }),
                    }),
                  }),
                }),
              }),
            };
          }),
        };
      }
      if (table === 'sources') {
        return {
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      }
      if (table === 'article_scores_log') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    }),
  };
  return { mockSupabase: mock };
});

vi.mock('../../lib/supabase', () => ({
  supabase: mockSupabase,
}));

describe('ArticleLogsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no pipeline runs exist', async () => {
    render(
      <MemoryRouter>
        <ArticleLogsView />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/No pipeline runs recorded yet/i)).toBeInTheDocument();
  });
});
