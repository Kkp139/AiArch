import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider } from '../src/context/AuthContext';
import { LoginPage } from '../src/pages/Auth/LoginPage';

describe('LoginPage Component Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders Figma editorial panel and sign in form fields', () => {
    render(
      <AuthProvider initialUser={null}>
        <LoginPage />
      </AuthProvider>
    );

    expect(screen.getByText(/Great spaces./i)).toBeInTheDocument();
    expect(screen.getByText(/Built together./i)).toBeInTheDocument();
    expect(screen.getByText(/ARCHITECTURE & INTERIORS/i)).toBeInTheDocument();
    expect(screen.getByText(/PRIVATE WORKSPACE/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Sign In to Your Workspace/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Username$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign in/i })).toBeInTheDocument();
  });

  it('transitions to Confirm Your Details when non-admin credentials trigger OTP flow', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/auth/login')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              requireOtp: true,
              tempToken: 'temp_token_123',
              user: {
                id: 'usr-staff-1',
                username: 'staff',
                fullName: 'Raj Patel',
                role: 'STAFF',
                mobile: '+91 98251 99887',
              },
            }),
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    render(
      <AuthProvider initialUser={null}>
        <LoginPage />
      </AuthProvider>
    );

    const userInput = screen.getByLabelText(/^Username$/i);
    const passInput = screen.getByLabelText(/^Password$/i);
    const submitBtn = screen.getByRole('button', { name: /Sign in/i });

    fireEvent.change(userInput, { target: { value: 'staff' } });
    fireEvent.change(passInput, { target: { value: 'staff123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Confirm Your Details/i })).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue(/Raj Patel/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/\+91 98251 99887/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send OTP/i })).toBeInTheDocument();
  });
});
