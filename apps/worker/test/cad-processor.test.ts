import { describe, it, expect } from 'vitest';
import { processCadFile, isCadFile, generatePreviewKey } from '../src/processors/cad.processor';

describe('CAD Preview Generator Job (DWG Pipeline)', () => {
  it('correctly identifies CAD file formats (.dwg, .dxf, .dgn)', () => {
    expect(isCadFile('drawing.dwg')).toBe(true);
    expect(isCadFile('layout.dxf')).toBe(true);
    expect(isCadFile('elevation.dgn')).toBe(true);
    expect(isCadFile('document.pdf')).toBe(false);
    expect(isCadFile('render.jpg')).toBe(false);
  });

  it('generates consistent and isolated preview keys', () => {
    const key = generatePreviewKey('doc-uuid-1234');
    expect(key).toBe('previews/doc-uuid-1234.pdf');
  });

  it('processes a .dwg job and outputs a web-optimized preview key while preserving original', async () => {
    const mockJob = {
      data: {
        documentId: 'doc-cad-999',
        fileKey: 'projects/LAP/1729330000_Civil_Foundation.dwg',
        filename: 'Civil_Foundation.dwg',
        mimeType: 'image/vnd.dwg',
      },
    };

    const result = await processCadFile(mockJob as any);
    expect(result.status).toBe('COMPLETED');
    expect(result.documentId).toBe('doc-cad-999');
    expect(result.previewKey).toBe('previews/doc-cad-999.pdf');
    expect(result.originalPreserved).toBe(true);
  });
});
