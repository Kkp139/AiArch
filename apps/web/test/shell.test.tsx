import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Shell } from '../src/components/layout/Shell';

describe('App Shell Layout', () => {
  it('renders user Full Name without role label in parentheses', () => {
    const mockUser = { fullName: 'Kamal Patel', role: 'ADMIN' as const };
    render(
      <Shell user={mockUser}>
        <div>Content Area</div>
      </Shell>
    );

    // Shows Full Name
    expect(screen.getByText('Kamal Patel')).toBeInTheDocument();

    // MUST NOT display role in parentheses (explicit client requirement)
    expect(screen.queryByText('(Admin)')).not.toBeInTheDocument();
    expect(screen.queryByText('(ADMIN)')).not.toBeInTheDocument();
  });

  it('renders role-appropriate navigation tabs (Payments hidden for Staff)', () => {
    const staffUser = { fullName: 'Staff Architect', role: 'STAFF' as const };
    render(
      <Shell user={staffUser}>
        <div>Content Area</div>
      </Shell>
    );

    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Document Vault')).toBeInTheDocument();
    expect(screen.getByText('Attendance')).toBeInTheDocument();

    // Payments tab strictly hidden for Staff
    expect(screen.queryByText('Payments')).not.toBeInTheDocument();
  });

  it('renders Payments tab for Admin users', () => {
    const adminUser = { fullName: 'Kamal Patel', role: 'ADMIN' as const };
    render(
      <Shell user={adminUser}>
        <div>Content Area</div>
      </Shell>
    );

    expect(screen.getByText('Payments')).toBeInTheDocument();
  });
});
