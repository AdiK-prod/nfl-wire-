import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Unsubscribe from './Unsubscribe';

const { mockEq, mockUpdate } = vi.hoisted(() => {
  const mockEq = vi.fn().mockResolvedValue({ error: null });
  const mockUpdate = vi.fn(() => ({ eq: mockEq }));
  return { mockEq, mockUpdate };
});

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: mockUpdate,
    })),
  },
}));

describe('Unsubscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows success after confirm with subscriber_id', async () => {
    render(
      <MemoryRouter initialEntries={['/unsubscribe?subscriber_id=test-uuid-123']}>
        <Routes>
          <Route path="/unsubscribe" element={<Unsubscribe />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /confirm unsubscribe/i }));
    expect(await screen.findByText(/unsubscribed successfully/i)).toBeInTheDocument();
    expect(mockUpdate).toHaveBeenCalledWith({ is_active: false });
    expect(mockEq).toHaveBeenCalledWith('id', 'test-uuid-123');
  });
});
