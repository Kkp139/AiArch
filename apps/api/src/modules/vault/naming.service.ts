import path from 'path';

export interface ParseResult {
  matched: boolean;
  categoryCode: string;
  fallbackToOther: boolean;
  warningMessage?: string;
  suggestedRename?: string;
}

export const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.dwg',
  '.dxf',
  '.dgn',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
] as const;

const CATEGORY_MAP: Record<string, string> = {
  sitedrgs: '01_SITE_DRGS',
  site: '01_SITE_DRGS',
  zoningplanning: '02_ZONING_PLANNING',
  zoning: '02_ZONING_PLANNING',
  spaceobject: '03_SPACE_OBJECT_DESIGN',
  space: '03_SPACE_OBJECT_DESIGN',
  completeset: '04_COMPLETE_SET_DRGS',
  schematic: '04_COMPLETE_SET_DRGS',
  materialselection: '05_MATERIAL_SELECTION',
  materials: '05_MATERIAL_SELECTION',
  '3dimages': '06_3D_IMAGES',
  renders: '06_3D_IMAGES',
  civildrgs: '07_CIVIL_DRGS',
  civil: '07_CIVIL_DRGS',
  plumbingdrgs: '08_PLUMBING_DRGS',
  plumbing: '08_PLUMBING_DRGS',
  firedrgs: '09_FIRE_DRGS',
  fire: '09_FIRE_DRGS',
  hvacdrgs: '10_HVAC_DRGS',
  hvac: '10_HVAC_DRGS',
  flooringdrgs: '11_FLOORING_DRGS',
  flooring: '11_FLOORING_DRGS',
  ceilingdrgs: '12_CEILING_DRGS',
  ceiling: '12_CEILING_DRGS',
  electricaldrgs: '13_ELECTRICAL_DRGS',
  electrical: '13_ELECTRICAL_DRGS',
  wallelevation: '14_WALL_ELEVATION',
  elevation: '14_WALL_ELEVATION',
  elementdrgs: '15_ELEMENT_DRGS',
  elements: '15_ELEMENT_DRGS',
};

/**
 * Validates whether file extension is in the allowed whitelist
 */
export function isAllowedFileType(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext as any);
}

/**
 * Parses filename using standard format: [ProjectName]_[Category]_[SubCategory]_[FileName]
 * If invalid, outputs interactive warning and fallback to 03_OTHER.
 */
export function parseFileName(filename: string, projectCode: string): ParseResult {
  const nameWithoutExt = path.basename(filename, path.extname(filename));
  const parts = nameWithoutExt.split('_');

  // Format requires at least 4 parts: [Project]_[Category]_[SubCategory]_[FileName]
  if (parts.length >= 4) {
    const rawCategory = parts[1].toLowerCase().replace(/[^a-z0-9]/g, '');
    const mappedCategory = CATEGORY_MAP[rawCategory];

    if (mappedCategory) {
      return {
        matched: true,
        categoryCode: mappedCategory,
        fallbackToOther: false,
      };
    }
  }

  // Does not match standard naming format
  const sanitizedBase = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '');
  const suggested = `${projectCode}_General_Main_${sanitizedBase || 'Drawing'}${path.extname(filename)}`;

  return {
    matched: false,
    categoryCode: '16_OTHER',
    fallbackToOther: true,
    warningMessage: `The file name "${filename}" does not match the standard naming format: [ProjectName]_[Category]_[SubCategory]_[FileName]. Would you like to rename it now? If you proceed without renaming, this file will automatically be stored in 03_OTHER.`,
    suggestedRename: suggested,
  };
}

/**
 * Strips original file download URL if user permission is VIEW_ONLY
 */
export function sanitizeOriginalDownloadUrl(
  originalUrl: string,
  permission: 'VIEW_ONLY' | 'VIEW_AND_DOWNLOAD'
): string | null {
  if (permission === 'VIEW_ONLY') {
    return null;
  }
  return originalUrl;
}
