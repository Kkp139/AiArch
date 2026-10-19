import { describe, it, expect } from 'vitest';
import { parseFileName, isAllowedFileType, sanitizeOriginalDownloadUrl } from '../src/modules/vault/naming.service';

describe('Vault Naming Parser & Warning Router', () => {
  it('correctly matches standard naming format [ProjectName]_[Category]_[SubCategory]_[FileName]', () => {
    const result = parseFileName('LAP_CivilDrgs_Footing_FoundationLayout.pdf', 'LAP');
    expect(result.matched).toBe(true);
    expect(result.categoryCode).toBe('07_CIVIL_DRGS');
    expect(result.fallbackToOther).toBe(false);
    expect(result.warningMessage).toBeUndefined();
  });

  it('matches other architectural categories accurately', () => {
    const r1 = parseFileName('ART_SiteDrgs_Survey_TopographicMap.dwg', 'ART');
    expect(r1.matched).toBe(true);
    expect(r1.categoryCode).toBe('01_SITE_DRGS');

    const r2 = parseFileName('VILLA_ElectricalDrgs_Power_SingleLineDiagram.pdf', 'VILLA');
    expect(r2.matched).toBe(true);
    expect(r2.categoryCode).toBe('13_ELECTRICAL_DRGS');
  });

  it('flags non-conforming filename with interactive warning message and routes to 03_OTHER', () => {
    const result = parseFileName('random_drawing_final.dwg', 'LAP');
    expect(result.matched).toBe(false);
    expect(result.fallbackToOther).toBe(true);
    expect(result.categoryCode).toBe('16_OTHER');
    expect(result.warningMessage).toContain('does not match the standard naming format');
    expect(result.suggestedRename).toBeDefined();
  });

  it('enforces allowed file type whitelist (.pdf, .dwg, .dxf, .dgn, .jpg, .jpeg, .png, .webp)', () => {
    expect(isAllowedFileType('plan.dwg')).toBe(true);
    expect(isAllowedFileType('document.pdf')).toBe(true);
    expect(isAllowedFileType('render.jpg')).toBe(true);
    expect(isAllowedFileType('render.webp')).toBe(true);
    expect(isAllowedFileType('model.dxf')).toBe(true);

    // Rejected formats
    expect(isAllowedFileType('script.exe')).toBe(false);
    expect(isAllowedFileType('archive.zip')).toBe(false);
    expect(isAllowedFileType('document.docx')).toBe(false);
  });

  it('strips original download URL when access is VIEW_ONLY', () => {
    const downloadAllowed = sanitizeOriginalDownloadUrl('https://s3.aws.com/file.dwg', 'VIEW_AND_DOWNLOAD');
    expect(downloadAllowed).toBe('https://s3.aws.com/file.dwg');

    const downloadBlocked = sanitizeOriginalDownloadUrl('https://s3.aws.com/file.dwg', 'VIEW_ONLY');
    expect(downloadBlocked).toBeNull();
  });
});
