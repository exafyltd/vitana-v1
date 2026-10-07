// VTID-04959 — group chat avatars showed "?" because legacy group threads put
// display_name/avatar_url at the top level, not in `profile`.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import GroupAvatarStack from './GroupAvatarStack';

describe('GroupAvatarStack (VTID-04959)', () => {
  it('shows initials from top-level display_name (legacy group threads)', () => {
    render(
      <GroupAvatarStack
        participants={[
          { user_id: 'a', display_name: 'Husam Katiela' },
          { user_id: 'b', display_name: 'Stefan Ehlke' },
          { user_id: 'c', display_name: 'Mariia Maksina' },
          { user_id: 'd', display_name: 'Jovana Tadić' },
        ]}
        maxVisible={3}
      />,
    );
    expect(screen.getByText('H')).toBeTruthy();
    expect(screen.getByText('S')).toBeTruthy();
    expect(screen.getByText('M')).toBeTruthy();
    expect(screen.getByText('+1')).toBeTruthy();
    expect(screen.queryByText('?')).toBeNull();
  });

  it('still reads the nested profile shape', () => {
    render(<GroupAvatarStack participants={[{ user_id: 'a', profile: { display_name: 'Ana' } }, { user_id: 'b', profile: { full_name: 'Ben B' } }]} />);
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByText('B')).toBeTruthy();
  });

  it('overlaps with a logical spacing that flips in RTL, no physical margins', () => {
    document.documentElement.dir = 'rtl';
    render(<GroupAvatarStack participants={[{ user_id: 'a', display_name: 'A' }, { user_id: 'b', display_name: 'B' }]} />);
    const stack = screen.getByTestId('group-avatar-stack');
    expect(stack.className).toContain('rtl:space-x-reverse');
    expect(stack.innerHTML).not.toMatch(/\b(ml|mr|pl|pr)-\d/);
    document.documentElement.dir = 'ltr';
  });
});
