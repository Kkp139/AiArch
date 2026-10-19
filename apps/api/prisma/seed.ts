import { PrismaClient } from '@prisma/client';

export const FIXED_16_CATEGORIES = [
  { code: '01_SITE_DRGS', name: 'SITE DRGS', phase: 'CONCEPT_DESIGN', order: 1 },
  { code: '02_ZONING_PLANNING', name: 'ZONING / PLANNING', phase: 'CONCEPT_DESIGN', order: 2 },
  { code: '03_SPACE_OBJECT_DESIGN', name: 'SPACE / OBJECT DESIGN', phase: 'CONCEPT_DESIGN', order: 3 },
  { code: '04_COMPLETE_SET_DRGS', name: 'COMPLETE SET OF DRGS', phase: 'CONCEPT_DESIGN', order: 4 },
  { code: '05_MATERIAL_SELECTION', name: 'MATERIAL SELECTION', phase: 'CONCEPT_DESIGN', order: 5 },
  { code: '06_3D_IMAGES', name: '3D IMAGES', phase: 'CONCEPT_DESIGN', order: 6 },
  { code: '07_CIVIL_DRGS', name: 'CIVIL DRGS', phase: 'CONSTRUCTION_DESIGN', order: 7 },
  { code: '08_PLUMBING_DRGS', name: 'PLUMBING DRGS', phase: 'CONSTRUCTION_DESIGN', order: 8 },
  { code: '09_FIRE_DRGS', name: 'FIRE DRGS', phase: 'CONSTRUCTION_DESIGN', order: 9 },
  { code: '10_HVAC_DRGS', name: 'HVAC DRGS', phase: 'CONSTRUCTION_DESIGN', order: 10 },
  { code: '11_FLOORING_DRGS', name: 'FLOORING DRGS', phase: 'CONSTRUCTION_DESIGN', order: 11 },
  { code: '12_CEILING_DRGS', name: 'CEILING DRGS', phase: 'CONSTRUCTION_DESIGN', order: 12 },
  { code: '13_ELECTRICAL_DRGS', name: 'ELECTRICAL DRGS', phase: 'CONSTRUCTION_DESIGN', order: 13 },
  { code: '14_WALL_ELEVATION', name: 'WALL ELEVATION', phase: 'CONSTRUCTION_DESIGN', order: 14 },
  { code: '15_ELEMENT_DRGS', name: 'ELEMENT DRGS', phase: 'CONSTRUCTION_DESIGN', order: 15 },
  { code: '16_OTHER', name: '03_OTHER', phase: 'OTHER', order: 16 },
] as const;

export async function seedProjectFolders(prisma: PrismaClient, projectId: string) {
  return prisma.projectFolder.createMany({
    data: FIXED_16_CATEGORIES.map(cat => ({
      projectId,
      categoryCode: cat.code,
      folderName: cat.name,
      phaseGroup: cat.phase,
      displayOrder: cat.order,
      isCounted: true,
    })),
  });
}

async function main() {
  const prisma = new PrismaClient();
  console.log('Seeding baseline constants completed.');
  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
