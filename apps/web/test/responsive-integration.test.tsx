import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResponsiveShell } from '../src/components/layout/ResponsiveShell';

describe('Task 10: ResponsiveShell Integration & Universal Switching', () => {
  beforeEach(() => {
    // Default desktop resolution
    window.innerWidth = 1440;
    window.innerHeight = 900;
  });

  it('renders DesktopShell and desktop content when viewport >= 1024px', () => {
    window.innerWidth = 1440;
    const adminUser = { fullName: 'Farhaz Patel', role: 'ADMIN' as const };

    render(
      <ResponsiveShell
        user={adminUser}
        desktopContent={<div data-testid="desktop-test-content">Desktop Portfolio View</div>}
        mobileContent={<div data-testid="mobile-test-content">Mobile Home Feed</div>}
      />
    );

    expect(screen.getByTestId('desktop-shell-root')).toBeInTheDocument();
    expect(screen.getByTestId('desktop-test-content')).toBeInTheDocument();
    expect(screen.queryByTestId('mobile-test-content')).not.toBeInTheDocument();
  });

  it('renders MobileShell and mobile content when viewport < 1024px', () => {
    window.innerWidth = 768; // Tablet breakpoint
    const adminUser = { fullName: 'Farhaz Patel', role: 'ADMIN' as const };

    render(
      <ResponsiveShell
        user={adminUser}
        desktopContent={<div data-testid="desktop-test-content">Desktop Portfolio View</div>}
        mobileContent={<div data-testid="mobile-test-content">Mobile Home Feed</div>}
      />
    );

    expect(screen.getByTestId('mobile-test-content')).toBeInTheDocument();
    expect(screen.queryByTestId('desktop-shell-root')).not.toBeInTheDocument();
  });

  it('honors forceView="desktop" even on narrow viewport', () => {
    window.innerWidth = 390; // iPhone screen
    const adminUser = { fullName: 'Farhaz Patel', role: 'ADMIN' as const };

    render(
      <ResponsiveShell
        user={adminUser}
        forceView="desktop"
        desktopContent={<div data-testid="forced-desktop-content">Forced Desktop View</div>}
        mobileContent={<div data-testid="mobile-test-content">Mobile Home Feed</div>}
      />
    );

    expect(screen.getByTestId('desktop-shell-root')).toBeInTheDocument();
    expect(screen.getByTestId('forced-desktop-content')).toBeInTheDocument();
    expect(screen.queryByTestId('mobile-test-content')).not.toBeInTheDocument();
  });

  it('honors forceView="mobile" even on large 4K monitor', () => {
    window.innerWidth = 2560; // Ultrawide 4K monitor
    const adminUser = { fullName: 'Farhaz Patel', role: 'ADMIN' as const };

    render(
      <ResponsiveShell
        user={adminUser}
        forceView="mobile"
        desktopContent={<div data-testid="desktop-test-content">Desktop View</div>}
        mobileContent={<div data-testid="forced-mobile-content">Forced Mobile View</div>}
      />
    );

    expect(screen.getByTestId('forced-mobile-content')).toBeInTheDocument();
    expect(screen.queryByTestId('desktop-shell-root')).not.toBeInTheDocument();
  });

  it('preserves studio name "A&F Design" across desktop and mobile shells', () => {
    const adminUser = { fullName: 'Farhaz Patel', role: 'ADMIN' as const };

    // Desktop
    window.innerWidth = 1440;
    const { unmount } = render(
      <ResponsiveShell
        user={adminUser}
        studioName="A&F Design"
        desktopContent={<div>Desktop</div>}
        mobileContent={<div>Mobile</div>}
      />
    );
    // Desktop renders studio name text
    expect(screen.getAllByText('A&F Design').length).toBeGreaterThan(0);
    unmount();

    // Mobile
    window.innerWidth = 390;
    render(
      <ResponsiveShell
        user={adminUser}
        studioName="A&F Design"
        desktopContent={<div>Desktop</div>}
        mobileContent={<div>Mobile</div>}
      />
    );
    // Mobile renders studio logo with alt text
    expect(screen.getByAltText(/asf design/i)).toBeInTheDocument();
  });
});
