/**
 * VTID-04907 (LR-C) — the Events "+" offers a third option, Live Room, which
 * hands off to the Go Live popup.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/hooks/useTranslation', async () => {
  const { lookup } = await import('@/lib/i18n-toast');
  return { useTranslation: () => ({ translate: (key: string) => lookup(key) }) };
});

import { CreateSelectionDialog } from './CreateSelectionDialog';

describe('CreateSelectionDialog — Live Room option', () => {
  it('offers Live Room and calls its handler', () => {
    const onSelectLiveRoom = vi.fn();
    render(
      <CreateSelectionDialog open onOpenChange={() => {}} onSelectEvent={() => {}} onSelectMeetup={() => {}} onSelectLiveRoom={onSelectLiveRoom} />,
    );
    const option = screen.getByTestId('create-option-live-room');
    expect(option.textContent).toContain('Live-Raum');
    fireEvent.click(option);
    expect(onSelectLiveRoom).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(option, { key: 'Enter' });
    expect(onSelectLiveRoom).toHaveBeenCalledTimes(2);
  });

  it('shows only Event and MeetUp when no Live Room handler is given', () => {
    render(<CreateSelectionDialog open onOpenChange={() => {}} onSelectEvent={() => {}} onSelectMeetup={() => {}} />);
    expect(screen.queryByTestId('create-option-live-room')).not.toBeInTheDocument();
  });
});
