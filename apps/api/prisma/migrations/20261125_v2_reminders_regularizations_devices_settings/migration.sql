-- CreateEnum
CREATE TYPE "ReminderPriority" AS ENUM ('HIGH', 'MEDIUM', 'NORMAL');

-- CreateEnum
CREATE TYPE "RegularizationType" AS ENUM ('REGULARIZATION', 'LEAVE');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DeviceApprovalStatus" AS ENUM ('PENDING', 'TRUSTED', 'REVOKED');

-- CreateTable
CREATE TABLE "AdminReminder" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "projectId" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "priority" "ReminderPriority" NOT NULL DEFAULT 'NORMAL',
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRegularization" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attendanceId" TEXT,
    "requestType" "RegularizationType" NOT NULL DEFAULT 'REGULARIZATION',
    "targetDate" DATE NOT NULL,
    "requestedClockIn" TIMESTAMP(3),
    "requestedClockOut" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRegularization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "os" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "ipAddress" TEXT,
    "location" TEXT,
    "status" "DeviceApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioSetting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "firmName" TEXT NOT NULL DEFAULT 'A&F Design',
    "clientLeaderApprovalRequired" BOOLEAN NOT NULL DEFAULT true,
    "clientViewerApprovalRequired" BOOLEAN NOT NULL DEFAULT false,
    "maxFileSizeMb" INTEGER NOT NULL DEFAULT 50,
    "allowedExtensions" TEXT NOT NULL DEFAULT '.pdf,.dwg,.dxf,.dgn,.jpg,.jpeg,.png,.webp',
    "updateTriggerMode" TEXT NOT NULL DEFAULT 'FIXED_SLOTS',
    "updateIntervalHours" INTEGER NOT NULL DEFAULT 4,
    "fixedUpdateSlots" JSONB,
    "primaryColor" TEXT NOT NULL DEFAULT '#BF935A',
    "accentColor" TEXT NOT NULL DEFAULT '#352618',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeviceSession_userId_fingerprint_key" ON "DeviceSession"("userId", "fingerprint");

-- AddForeignKey
ALTER TABLE "AdminReminder" ADD CONSTRAINT "AdminReminder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminReminder" ADD CONSTRAINT "AdminReminder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRegularization" ADD CONSTRAINT "AttendanceRegularization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRegularization" ADD CONSTRAINT "AttendanceRegularization_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRegularization" ADD CONSTRAINT "AttendanceRegularization_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceSession" ADD CONSTRAINT "DeviceSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceSession" ADD CONSTRAINT "DeviceSession_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
