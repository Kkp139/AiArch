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
  site_ctx: '01_SITE_DRGS',
  sitectx: '01_SITE_DRGS',
  arch_plans: '01_SITE_DRGS',
  archplans: '01_SITE_DRGS',
  '01': '01_SITE_DRGS',
  '01_site_drgs': '01_SITE_DRGS',

  zoningplanning: '02_ZONING_PLANNING',
  zoning: '02_ZONING_PLANNING',
  zon_diag: '02_ZONING_PLANNING',
  zondiag: '02_ZONING_PLANNING',
  '02': '02_ZONING_PLANNING',
  '02_zoning_planning': '02_ZONING_PLANNING',

  spaceobject: '03_SPACE_OBJECT_DESIGN',
  space: '03_SPACE_OBJECT_DESIGN',
  sketch: '03_SPACE_OBJECT_DESIGN',
  mass_std: '03_SPACE_OBJECT_DESIGN',
  massstd: '03_SPACE_OBJECT_DESIGN',
  '03': '03_SPACE_OBJECT_DESIGN',
  '03_space_object_design': '03_SPACE_OBJECT_DESIGN',

  completeset: '04_COMPLETE_SET_DRGS',
  schematic: '04_COMPLETE_SET_DRGS',
  pres_dck: '04_COMPLETE_SET_DRGS',
  presdck: '04_COMPLETE_SET_DRGS',
  '04': '04_COMPLETE_SET_DRGS',
  '04_complete_set_drgs': '04_COMPLETE_SET_DRGS',

  materialselection: '05_MATERIAL_SELECTION',
  materials: '05_MATERIAL_SELECTION',
  mood_brd: '05_MATERIAL_SELECTION',
  moodbrd: '05_MATERIAL_SELECTION',
  '05': '05_MATERIAL_SELECTION',
  '05_material_selection': '05_MATERIAL_SELECTION',

  '3dimages': '06_3D_IMAGES',
  renders: '06_3D_IMAGES',
  '06': '06_3D_IMAGES',
  '06_3d_images': '06_3D_IMAGES',

  civildrgs: '07_CIVIL_DRGS',
  civil: '07_CIVIL_DRGS',
  struct_dwg: '07_CIVIL_DRGS',
  structdwg: '07_CIVIL_DRGS',
  land_civ: '07_CIVIL_DRGS',
  landciv: '07_CIVIL_DRGS',
  '07': '07_CIVIL_DRGS',
  '07_civil_drgs': '07_CIVIL_DRGS',

  plumbingdrgs: '08_PLUMBING_DRGS',
  plumbing: '08_PLUMBING_DRGS',
  plumb_san: '08_PLUMBING_DRGS',
  plumbsan: '08_PLUMBING_DRGS',
  '08': '08_PLUMBING_DRGS',
  '08_plumbing_drgs': '08_PLUMBING_DRGS',

  firedrgs: '09_FIRE_DRGS',
  fire: '09_FIRE_DRGS',
  permits: '09_FIRE_DRGS',
  '09': '09_FIRE_DRGS',
  '09_fire_drgs': '09_FIRE_DRGS',

  hvacdrgs: '10_HVAC_DRGS',
  hvac: '10_HVAC_DRGS',
  hvac_duct: '10_HVAC_DRGS',
  hvacduct: '10_HVAC_DRGS',
  '10': '10_HVAC_DRGS',
  '10_hvac_drgs': '10_HVAC_DRGS',

  flooringdrgs: '11_FLOORING_DRGS',
  flooring: '11_FLOORING_DRGS',
  '11': '11_FLOORING_DRGS',
  '11_flooring_drgs': '11_FLOORING_DRGS',

  ceilingdrgs: '12_CEILING_DRGS',
  ceiling: '12_CEILING_DRGS',
  '12': '12_CEILING_DRGS',
  '12_ceiling_drgs': '12_CEILING_DRGS',

  electricaldrgs: '13_ELECTRICAL_DRGS',
  electrical: '13_ELECTRICAL_DRGS',
  elec_lay: '13_ELECTRICAL_DRGS',
  eleclay: '13_ELECTRICAL_DRGS',
  '13': '13_ELECTRICAL_DRGS',
  '13_electrical_drgs': '13_ELECTRICAL_DRGS',

  wallelevation: '14_WALL_ELEVATION',
  elevation: '14_WALL_ELEVATION',
  int_det: '14_WALL_ELEVATION',
  intdet: '14_WALL_ELEVATION',
  '14': '14_WALL_ELEVATION',
  '14_wall_elevation': '14_WALL_ELEVATION',

  elementdrgs: '15_ELEMENT_DRGS',
  elements: '15_ELEMENT_DRGS',
  boq: '15_ELEMENT_DRGS',
  '15': '15_ELEMENT_DRGS',
  '15_element_drgs': '15_ELEMENT_DRGS',

  other: '16_OTHER',
  '16': '16_OTHER',
  '16_other': '16_OTHER',
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
