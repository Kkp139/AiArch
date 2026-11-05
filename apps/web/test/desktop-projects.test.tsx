import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DesktopProjectsView, OFFICIAL_16_FOLDERS } from '../src/components/desktop/DesktopProjectsView';
import { DesktopBlueprintViewer } from '../src/components/desktop/DesktopBlueprintViewer';

describe('Task 4: Desktop Projects & 16-Folder Vault', () => {
  it('renders all 16 canonical folders in high-density grid by default', () => {
    render(<DesktopProjectsView userRole="ADMIN" />);

    expect(screen.getByText('Courtyard Villa Luxury Residence')).toBeInTheDocument();
    expect(screen.getByTestId('folder-grid')).toBeInTheDocument();

    // Check all 16 folders count
    expect(OFFICIAL_16_FOLDERS).toHaveLength(16);

    // Verify key folders from Concept and Construction
    expect(screen.getByText('Site Drawings & Topography')).toBeInTheDocument();
    expect(screen.getByText('Zoning & Space Planning')).toBeInTheDocument();
    expect(screen.getByText('3D Photorealistic CGI Renders')).toBeInTheDocument();
    expect(screen.getByText('Civil Footing & Columns')).toBeInTheDocument();
    expect(screen.getByText('Plumbing & Drainage')).toBeInTheDocument();
    expect(screen.getByText('Flooring & Finishes')).toBeInTheDocument();
    expect(screen.getByText('Electrical SLD & Conduit')).toBeInTheDocument();
    expect(screen.getByText('Other Reference & Handover')).toBeInTheDocument();
  });

  it('toggles seamlessly between Grid View and Table View', () => {
    render(<DesktopProjectsView userRole="ADMIN" />);

    expect(screen.getByTestId('folder-grid')).toBeInTheDocument();
    expect(screen.queryByTestId('folder-table')).not.toBeInTheDocument();

    // Toggle to Table view
    const tableBtn = screen.getByTestId('view-toggle-table');
    fireEvent.click(tableBtn);

    expect(screen.getByTestId('folder-table')).toBeInTheDocument();
    expect(screen.queryByTestId('folder-grid')).not.toBeInTheDocument();

    // Toggle back to Grid view
    const gridBtn = screen.getByTestId('view-toggle-grid');
    fireEvent.click(gridBtn);

    expect(screen.getByTestId('folder-grid')).toBeInTheDocument();
  });

  it('filters folders strictly by Phase tabs (Concept 6, Construction 9, Other 1)', () => {
    render(<DesktopProjectsView userRole="ADMIN" />);

    // Click Concept Design tab
    const conceptTab = screen.getByTestId('phase-tab-concept');
    fireEvent.click(conceptTab);
    expect(screen.getByText('Site Drawings & Topography')).toBeInTheDocument();
    expect(screen.queryByText('Civil Footing & Columns')).not.toBeInTheDocument();

    // Click Construction Design tab
    const constructionTab = screen.getByTestId('phase-tab-construction');
    fireEvent.click(constructionTab);
    expect(screen.getByText('Civil Footing & Columns')).toBeInTheDocument();
    expect(screen.getByText('Flooring & Finishes')).toBeInTheDocument();
    expect(screen.queryByText('Site Drawings & Topography')).not.toBeInTheDocument();

    // Click Other tab
    const otherTab = screen.getByTestId('phase-tab-other');
    fireEvent.click(otherTab);
    expect(screen.getByText('Other Reference & Handover')).toBeInTheDocument();
    expect(screen.queryByText('Civil Footing & Columns')).not.toBeInTheDocument();

    // Click All Folders tab
    const allTab = screen.getByTestId('phase-tab-all');
    fireEvent.click(allTab);
    expect(screen.getByText('Site Drawings & Topography')).toBeInTheDocument();
    expect(screen.getByText('Civil Footing & Columns')).toBeInTheDocument();
  });

  it('filters folders using the search input', () => {
    render(<DesktopProjectsView userRole="ADMIN" />);

    const searchInput = screen.getByTestId('folder-search-input');
    fireEvent.change(searchInput, { target: { value: 'Marble' } });

    // Flooring folder description contains "marble"
    expect(screen.getByText('Flooring & Finishes')).toBeInTheDocument();
    expect(screen.queryByText('Civil Footing & Columns')).not.toBeInTheDocument();
  });

  it('navigates into a folder and opens the embedded DesktopBlueprintViewer', () => {
    render(<DesktopProjectsView userRole="ADMIN" />);

    // Click on Site Drawings folder
    const siteFolder = screen.getByTestId('folder-card-01_SITE_DRGS');
    fireEvent.click(siteFolder);

    // Displays sheets list
    expect(screen.getByTestId('folder-sheets-view')).toBeInTheDocument();
    expect(screen.getByText(/General Setting Out Geometry/)).toBeInTheDocument();

    // Click "Inspect CAD" button
    const inspectBtn = screen.getByTestId('inspect-blueprint-01_SITE_DRGS-001');
    fireEvent.click(inspectBtn);

    // DesktopBlueprintViewer modal opens
    expect(screen.getByTestId('desktop-blueprint-viewer')).toBeInTheDocument();
    expect(screen.getByTestId('blueprint-canvas-area')).toBeInTheDocument();
    expect(screen.getByTestId('blueprint-inspector')).toBeInTheDocument();
    expect(screen.getByText('Sheet Details')).toBeInTheDocument();

    // Close button returns to folder sheets view
    const closeBtn = screen.getByTestId('blueprint-close-btn');
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId('desktop-blueprint-viewer')).not.toBeInTheDocument();
  });

  describe('DesktopBlueprintViewer standalone controls', () => {
    const mockSheet = {
      id: 'sheet-1',
      title: 'Ground Floor Setting Out Geometry',
      code: 'AF-VIL-ARC-01-002',
      revision: 'Rev 02',
      category: '01 Site Drawings',
      scale: '1:100',
      sheetSize: 'A1',
      status: 'Approved' as const,
      date: '2026-11-04',
      uploadedBy: 'Rajesh Patel',
    };

    it('handles pan/zoom toolbar and layer visibility controls', () => {
      const onClose = vi.fn();
      render(<DesktopBlueprintViewer sheet={mockSheet} onClose={onClose} />);

      // Zoom level starts at 100%
      expect(screen.getByTestId('zoom-level-text')).toHaveTextContent('100%');

      // Zoom in
      fireEvent.click(screen.getByTestId('zoom-in-btn'));
      expect(screen.getByTestId('zoom-level-text')).toHaveTextContent('125%');

      // Zoom out
      fireEvent.click(screen.getByTestId('zoom-out-btn'));
      expect(screen.getByTestId('zoom-level-text')).toHaveTextContent('100%');

      // Zoom reset
      fireEvent.click(screen.getByTestId('zoom-in-btn'));
      expect(screen.getByTestId('zoom-level-text')).toHaveTextContent('125%');
      fireEvent.click(screen.getByTestId('zoom-reset-btn'));
      expect(screen.getByTestId('zoom-level-text')).toHaveTextContent('100%');

      // Switch to Layers tab and toggle layer
      fireEvent.click(screen.getByTestId('tab-layers'));
      expect(screen.getByTestId('inspector-layers-content')).toBeInTheDocument();

      const dimLayerToggle = screen.getByTestId('layer-toggle-dim');
      expect(dimLayerToggle).toHaveClass('visible');
      fireEvent.click(dimLayerToggle);
      expect(dimLayerToggle).not.toHaveClass('visible');
    });
  });
});
