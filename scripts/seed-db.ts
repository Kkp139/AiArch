import { PrismaClient, UserRole, ProjectStatus, DownloadPermission } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

const STANDARD_FOLDERS = [
  // Phase 1: Concept Design (6)
  { categoryCode: '01_SITE_DRGS', folderName: '01 Site Drawings & Topographic Layout', phaseGroup: 'CONCEPT', displayOrder: 1 },
  { categoryCode: '02_ZONING_PLANNING', folderName: '02 Zoning & Space Planning', phaseGroup: 'CONCEPT', displayOrder: 2 },
  { categoryCode: '03_SPACE_OBJECT_DESIGN', folderName: '03 Space & Object Studies', phaseGroup: 'CONCEPT', displayOrder: 3 },
  { categoryCode: '04_COMPLETE_SET_DRGS', folderName: '04 Complete Architectural Schematic Package', phaseGroup: 'CONCEPT', displayOrder: 4 },
  { categoryCode: '05_MATERIAL_SELECTION', folderName: '05 Material Selection & Moodboards', phaseGroup: 'CONCEPT', displayOrder: 5 },
  { categoryCode: '06_3D_IMAGES', folderName: '06 3D Photorealistic CGI Renders', phaseGroup: 'CONCEPT', displayOrder: 6 },

  // Phase 2: Construction Design (9)
  { categoryCode: '07_CIVIL_DRGS', folderName: '07 Civil Footing & Column Layouts', phaseGroup: 'CONSTRUCTION', displayOrder: 7 },
  { categoryCode: '08_PLUMBING_DRGS', folderName: '08 Plumbing & Drainage Schematics', phaseGroup: 'CONSTRUCTION', displayOrder: 8 },
  { categoryCode: '09_FIRE_DRGS', folderName: '09 Fire Hydrant & Life Safety Plans', phaseGroup: 'CONSTRUCTION', displayOrder: 9 },
  { categoryCode: '10_HVAC_DRGS', folderName: '10 HVAC Chilled Water & Ducting', phaseGroup: 'CONSTRUCTION', displayOrder: 10 },
  { categoryCode: '11_FLOORING_DRGS', folderName: '11 Marble & Tile Flooring Layouts', phaseGroup: 'CONSTRUCTION', displayOrder: 11 },
  { categoryCode: '12_CEILING_DRGS', folderName: '12 Reflected Ceiling & Lighting Drops', phaseGroup: 'CONSTRUCTION', displayOrder: 12 },
  { categoryCode: '13_ELECTRICAL_DRGS', folderName: '13 Electrical SLD & Power Conduit Routes', phaseGroup: 'CONSTRUCTION', displayOrder: 13 },
  { categoryCode: '14_WALL_ELEVATION', folderName: '14 Internal & External Wall Elevations', phaseGroup: 'CONSTRUCTION', displayOrder: 14 },
  { categoryCode: '15_ELEMENT_DRGS', folderName: '15 Architectural Joinery & Element Details', phaseGroup: 'CONSTRUCTION', displayOrder: 15 },

  // Catch-all (1)
  { categoryCode: '16_OTHER', folderName: '03 Other / Miscellaneous Reference', phaseGroup: 'OTHER', displayOrder: 16 },
];

async function main() {
  console.log('Seeding Supabase PostgreSQL database...');

  // 1. Clean existing records safely
  await prisma.chatMessage.deleteMany();
  await prisma.dailyWorkUpdate.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.designVerification.deleteMany();
  await prisma.projectDocument.deleteMany();
  await prisma.projectFolderPermission.deleteMany();
  await prisma.projectFolder.deleteMany();
  await prisma.projectAssignment.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  console.log('Cleaned old records.');

  // 2. Hash default passwords
  const adminHash = await bcrypt.hash('admin123', 10);
  const staffHash = await bcrypt.hash('staff123', 10);
  const clientHash = await bcrypt.hash('client123', 10);
  const viewerHash = await bcrypt.hash('viewer123', 10);

  // 3. Create Users
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      fullName: 'Kamal Patel',
      mobile: '+91 98251 00001',
      email: 'admin@afdesign.com',
      passwordHash: adminHash,
      role: UserRole.ADMIN,
      status: 'ACTIVE',
    },
  });

  const staff = await prisma.user.create({
    data: {
      username: 'staff',
      fullName: 'Ronak Shah',
      mobile: '+91 98251 00002',
      email: 'ronak@afdesign.com',
      passwordHash: staffHash,
      role: UserRole.STAFF,
      status: 'ACTIVE',
    },
  });

  const clientLeader = await prisma.user.create({
    data: {
      username: 'client_leader',
      fullName: 'Rajesh Mehta',
      mobile: '+91 98251 00003',
      email: 'rajesh@mehtagroup.com',
      passwordHash: clientHash,
      role: UserRole.CLIENT_LEADER,
      status: 'ACTIVE',
    },
  });

  const clientViewer = await prisma.user.create({
    data: {
      username: 'client_viewer',
      fullName: 'Pooja Mehta',
      mobile: '+91 98251 00004',
      email: 'pooja@mehtagroup.com',
      passwordHash: viewerHash,
      role: UserRole.CLIENT_VIEWER,
      status: 'ACTIVE',
    },
  });

  console.log('Seeded Users:', { admin: admin.username, staff: staff.username, clientLeader: clientLeader.username, clientViewer: clientViewer.username });

  // 4. Create Standard Projects
  const project1 = await prisma.project.create({
    data: {
      projectCode: 'AF-VILLA',
      name: 'Villa Horizon Luxury Residence',
      category: 'Luxury Villa',
      siteLocation: 'Ambli-Bopal Road, Ahmedabad',
      status: ProjectStatus.ACTIVE,
      totalAgreedFee: 5000000.00,
      advancePaymentReceived: 1750000.00,
      allowClientDownloads: DownloadPermission.VIEW_AND_DOWNLOAD,
      showPricingClientLeader: true,
      showPricingClientViewer: false,
      allowClientMeetings: true,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      projectCode: 'AF-TOWER',
      name: 'Skyline Commercial Tower',
      category: 'Commercial',
      siteLocation: 'SG Highway, Ahmedabad',
      status: ProjectStatus.ACTIVE,
      totalAgreedFee: 12000000.00,
      advancePaymentReceived: 3000000.00,
      allowClientDownloads: DownloadPermission.VIEW_AND_DOWNLOAD,
      showPricingClientLeader: true,
      showPricingClientViewer: false,
      allowClientMeetings: true,
    },
  });

  console.log('Seeded Projects:', [project1.projectCode, project2.projectCode]);

  // 5. Seed the 16 Standard Folders for both projects
  for (const proj of [project1, project2]) {
    for (const f of STANDARD_FOLDERS) {
      const folder = await prisma.projectFolder.create({
        data: {
          projectId: proj.id,
          categoryCode: f.categoryCode,
          folderName: f.folderName,
          phaseGroup: f.phaseGroup,
          displayOrder: f.displayOrder,
          isCounted: true,
        },
      });

      // Default folder permissions for client roles
      await prisma.projectFolderPermission.createMany({
        data: [
          {
            projectId: proj.id,
            folderId: folder.id,
            role: UserRole.CLIENT_LEADER,
            accessLevel: DownloadPermission.VIEW_AND_DOWNLOAD,
          },
          {
            projectId: proj.id,
            folderId: folder.id,
            role: UserRole.CLIENT_VIEWER,
            accessLevel: DownloadPermission.VIEW_ONLY,
          },
        ],
      });
    }

    // 6. Project Assignments
    await prisma.projectAssignment.createMany({
      data: [
        { userId: staff.id, projectId: proj.id },
        { userId: clientLeader.id, projectId: proj.id },
        { userId: clientViewer.id, projectId: proj.id },
      ],
    });
  }

  // 7. Seed Sample Verified Drawings & Verifications
  const p1Folders = await prisma.projectFolder.findMany({ where: { projectId: project1.id } });
  const archFolder = p1Folders.find(f => f.categoryCode === '04_COMPLETE_SET_DRGS') || p1Folders[0];
  const civilFolder = p1Folders.find(f => f.categoryCode === '07_CIVIL_DRGS') || p1Folders[1];

  await prisma.projectDocument.createMany({
    data: [
      {
        projectId: project1.id,
        folderId: archFolder.id,
        fileName: 'AF-VILLA_completeset_SchematicPackage_v1.pdf',
        originalKey: `projects/AF-VILLA/AF-VILLA_completeset_SchematicPackage_v1.pdf`,
        fileSizeBytes: BigInt(4800000),
        mimeType: 'application/pdf',
        isApprovedDrawing: true,
        uploadedBy: admin.id,
      },
      {
        projectId: project1.id,
        folderId: civilFolder.id,
        fileName: 'AF-VILLA_civildrgs_RCCFooting_v2.dwg',
        originalKey: `projects/AF-VILLA/AF-VILLA_civildrgs_RCCFooting_v2.dwg`,
        previewKey: `previews/AF-VILLA_civildrgs_RCCFooting_v2.pdf`,
        fileSizeBytes: BigInt(6200000),
        mimeType: 'image/vnd.dwg',
        isDwg: true,
        isApprovedDrawing: true,
        uploadedBy: staff.id,
      },
    ],
  });

  // Design Verification entries
  await prisma.designVerification.createMany({
    data: [
      {
        projectId: project1.id,
        folderId: archFolder.id,
        drawingTitle: 'Ground Floor Master Plan & FSI Layout',
        fileKey: 'projects/AF-VILLA/submissions/ground_floor_v3.dwg',
        previewKey: 'previews/ground_floor_v3.pdf',
        submittedBy: staff.id,
        revisionNumber: 3,
        status: 'PENDING_REVIEW',
      },
      {
        projectId: project1.id,
        folderId: civilFolder.id,
        drawingTitle: 'Raft Foundation & Column Schedule',
        fileKey: 'projects/AF-VILLA/submissions/raft_col_v2.dwg',
        submittedBy: staff.id,
        revisionNumber: 2,
        status: 'APPROVED',
        reviewedBy: admin.id,
        reviewedAt: new Date(),
      },
    ],
  });

  // 8. Seed Sample Payments
  await prisma.payment.createMany({
    data: [
      {
        projectId: project1.id,
        amount: 500000.00,
        paymentMode: 'NEFT_RTGS',
        referenceNumber: 'NEFT-99887711',
        bankName: 'HDFC Bank',
        status: 'CONFIRMED',
        recordedBy: admin.id,
      },
      {
        projectId: project1.id,
        amount: 1250000.00,
        paymentMode: 'CHEQUE',
        referenceNumber: 'CHQ-445566',
        bankName: 'ICICI Bank',
        status: 'CONFIRMED',
        recordedBy: admin.id,
      },
      {
        projectId: project1.id,
        amount: 1250000.00,
        paymentMode: 'NEFT_RTGS',
        referenceNumber: 'UTR-20261019-8822',
        bankName: 'Axis Bank',
        status: 'PENDING_CLEARANCE',
        recordedBy: admin.id,
      },
    ],
  });

  // 9. Seed Sample Project Chat Messages
  await prisma.chatMessage.createMany({
    data: [
      {
        projectId: project1.id,
        senderId: admin.id,
        messageText: 'Good morning Rajesh bhai. We have updated the ground floor electrical layout with the Italian marble island lighting.',
      },
      {
        projectId: project1.id,
        senderId: clientLeader.id,
        messageText: 'Thank you Kamal. Can we review the lighting switchboards in our 4:00 PM consultation slot today?',
      },
    ],
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
