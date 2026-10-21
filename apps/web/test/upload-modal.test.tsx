import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { UploadModal } from '../src/components/vault/UploadModal';

describe('Vault Upload Modal & Interactive Rename Prompt', () => {
  it('shows interactive warning when file does not adhere to naming standard', async () => {
    const onUploadMock = vi.fn();
    render(
      <UploadModal
        projectCode="LAP"
        isOpen={true}
        onClose={() => {}}
        onUpload={onUploadMock}
      />
    );

    const fileInput = screen.getByLabelText(/select file/i);
    const unformattedFile = new File(['mock content'], 'unformatted_name.dwg', {
      type: 'image/vnd.dwg',
    });

    fireEvent.change(fileInput, { target: { files: [unformattedFile] } });

    // Warning message must appear
    expect(
      await screen.findByText(/does not match the standard naming format/i)
    ).toBeInTheDocument();

    // Warns that non-adhering files will route to 03_OTHER
    expect(screen.getAllByText(/03_OTHER/i).length).toBeGreaterThan(0);

    // Offers "Rename Now" action
    expect(screen.getByRole('button', { name: /rename now/i })).toBeInTheDocument();
  });

  it('allows user to rename inline to match naming convention and routes to designated folder', async () => {
    const onUploadMock = vi.fn();
    render(
      <UploadModal
        projectCode="LAP"
        isOpen={true}
        onClose={() => {}}
        onUpload={onUploadMock}
      />
    );

    const fileInput = screen.getByLabelText(/select file/i);
    const unformattedFile = new File(['mock content'], 'unformatted_name.dwg', {
      type: 'image/vnd.dwg',
    });

    fireEvent.change(fileInput, { target: { files: [unformattedFile] } });

    // Click "Rename Now"
    const renameBtn = await screen.findByRole('button', { name: /rename now/i });
    fireEvent.click(renameBtn);

    // Enter conforming name: LAP_ARCH_PLANS_GroundFloor_v1.dwg
    const renameInput = screen.getByPlaceholderText(/enter formatted filename/i);
    fireEvent.change(renameInput, { target: { value: 'LAP_ARCH_PLANS_GroundFloor_v1.dwg' } });

    const applyRenameBtn = screen.getByRole('button', { name: /apply rename/i });
    fireEvent.click(applyRenameBtn);

    // Warning should disappear
    await waitFor(() => {
      expect(screen.queryByText(/does not match the standard naming format/i)).not.toBeInTheDocument();
    });

    // Upload with renamed file
    const uploadBtn = screen.getByRole('button', { name: /upload document/i });
    fireEvent.click(uploadBtn);

    expect(onUploadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        finalFileName: 'LAP_ARCH_PLANS_GroundFloor_v1.dwg',
        routedCategory: expect.not.stringMatching(/^03_OTHER$/),
      })
    );
  });

  it('proceeds directly to 03_OTHER if user chooses not to rename non-conforming file', async () => {
    const onUploadMock = vi.fn();
    render(
      <UploadModal
        projectCode="LAP"
        isOpen={true}
        onClose={() => {}}
        onUpload={onUploadMock}
      />
    );

    const fileInput = screen.getByLabelText(/select file/i);
    const unformattedFile = new File(['mock content'], 'rough_sketch.png', {
      type: 'image/png',
    });

    fireEvent.change(fileInput, { target: { files: [unformattedFile] } });

    // Click "Proceed without Renaming"
    const proceedOtherBtn = await screen.findByRole('button', { name: /upload to 03_other/i });
    fireEvent.click(proceedOtherBtn);

    expect(onUploadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        finalFileName: 'rough_sketch.png',
        routedCategory: '03_OTHER',
      })
    );
  });
});
