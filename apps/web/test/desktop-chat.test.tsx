import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DesktopChatView, ProjectThread } from '../src/components/desktop/DesktopChatView';

describe('Task 8: DesktopChatView (2-Pane Real-Time Chat)', () => {
  const mockThreads: ProjectThread[] = [
    {
      id: 'thread-1',
      projectCode: 'AF-VILLA',
      projectName: 'Courtyard Villa',
      clientName: 'Dr. Sameer Mehta',
      lastMessage: 'The cantilever structural drawing package has been reviewed and stamped.',
      lastMessageTime: '10:30 AM',
      unreadCount: 2,
    },
    {
      id: 'thread-2',
      projectCode: 'AF-INN',
      projectName: 'Artilla Inn',
      clientName: 'Vikram Singhania',
      lastMessage: 'Facade lighting samples delivered to site.',
      lastMessageTime: 'Yesterday',
      unreadCount: 0,
    },
  ];

  it('renders 2-pane layout with thread list and active conversation for ADMIN', () => {
    const adminUser = { fullName: 'Farhaz Patel', role: 'ADMIN' as const };
    const onSendMessage = vi.fn();

    render(
      <DesktopChatView
        user={adminUser}
        threads={mockThreads}
        activeProjectCode="AF-VILLA"
        onSendMessage={onSendMessage}
      />
    );

    // Left Pane: Thread list & search
    expect(screen.getByTestId('chat-threads-pane')).toBeInTheDocument();
    expect(screen.getByTestId('chat-thread-AF-VILLA')).toBeInTheDocument();
    expect(screen.getByTestId('chat-thread-AF-INN')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search project threads/i)).toBeInTheDocument();

    // Right Pane: Active conversation
    expect(screen.getByTestId('chat-conversation-pane')).toBeInTheDocument();
    expect(screen.getByText('Courtyard Villa (AF-VILLA)')).toBeInTheDocument();
    expect(screen.getByTestId('chat-messages-container')).toBeInTheDocument();
    expect(screen.getByTestId('chat-input-textarea')).toBeInTheDocument();
    expect(screen.getByTestId('chat-send-btn')).toBeInTheDocument();
  });

  it('allows sending a text message and clears input', () => {
    const adminUser = { fullName: 'Farhaz Patel', role: 'ADMIN' as const };
    const onSendMessage = vi.fn();

    render(
      <DesktopChatView
        user={adminUser}
        threads={mockThreads}
        activeProjectCode="AF-VILLA"
        onSendMessage={onSendMessage}
      />
    );

    const input = screen.getByTestId('chat-input-textarea');
    fireEvent.change(input, { target: { value: 'Please review the travertine sample.' } });
    expect(input).toHaveValue('Please review the travertine sample.');

    const sendBtn = screen.getByTestId('chat-send-btn');
    fireEvent.click(sendBtn);

    expect(onSendMessage).toHaveBeenCalledTimes(1);
    expect(onSendMessage).toHaveBeenCalledWith('Please review the travertine sample.', undefined);
    expect(input).toHaveValue('');
  });

  it('switches active thread when user clicks a different project', () => {
    const adminUser = { fullName: 'Farhaz Patel', role: 'ADMIN' as const };
    const onSelectThread = vi.fn();

    render(
      <DesktopChatView
        user={adminUser}
        threads={mockThreads}
        activeProjectCode="AF-VILLA"
        onSelectThread={onSelectThread}
      />
    );

    const innThread = screen.getByTestId('chat-thread-AF-INN');
    fireEvent.click(innThread);
    expect(onSelectThread).toHaveBeenCalledWith('AF-INN');
  });

  it('renders for CLIENT_LEADER role with client perspective', () => {
    const clientUser = { fullName: 'Dr. Sameer Mehta', role: 'CLIENT_LEADER' as const };

    render(
      <DesktopChatView
        user={clientUser}
        threads={mockThreads}
        activeProjectCode="AF-VILLA"
      />
    );

    expect(screen.getByTestId('chat-conversation-pane')).toBeInTheDocument();
    expect(screen.getByText('Courtyard Villa (AF-VILLA)')).toBeInTheDocument();
  });

  it('STAFF role is strictly forbidden from accessing real-time chat', () => {
    const staffUser = { fullName: 'Priya Mehta', role: 'STAFF' as const };

    render(
      <DesktopChatView
        user={staffUser}
        threads={mockThreads}
        activeProjectCode="AF-VILLA"
      />
    );

    expect(screen.getByTestId('chat-restricted-card')).toBeInTheDocument();
    expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    expect(screen.queryByTestId('chat-threads-pane')).not.toBeInTheDocument();
    expect(screen.queryByTestId('chat-conversation-pane')).not.toBeInTheDocument();
  });
});

