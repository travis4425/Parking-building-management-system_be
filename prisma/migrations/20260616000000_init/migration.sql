-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MANAGER', 'STAFF', 'DRIVER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE', 'LOCKED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'QR', 'CARD');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'PAYMENT_PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExceptionType" AS ENUM ('LOST_TICKET', 'WRONG_PLATE', 'WRONG_ZONE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'DRIVER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "floor" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "zoneId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "maxHeight" DOUBLE PRECISION,
    "maxWidth" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zone_vehicle_rules" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "vehicleTypeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zone_vehicle_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_policies" (
    "id" TEXT NOT NULL,
    "vehicleTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "basePrice" DOUBLE PRECISION NOT NULL,
    "pricePerHour" DOUBLE PRECISION NOT NULL,
    "peakMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleTypeId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slots" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "vehicleTypeId" TEXT,
    "status" "SlotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "vehicleTypeId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "slotId" TEXT,
    "gateInId" TEXT,
    "gateOutId" TEXT,
    "reservationId" TEXT,
    "licensePlate" TEXT NOT NULL,
    "qrToken" TEXT NOT NULL,
    "entryTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitTime" TIMESTAMP(3),
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "totalFee" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'SUCCESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exceptions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" "ExceptionType" NOT NULL,
    "description" TEXT,
    "extraFee" DOUBLE PRECISION,
    "oldLicensePlate" TEXT,
    "newLicensePlate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "oldData" TEXT,
    "newData" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'string',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "gates_code_key" ON "gates"("code");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_types_name_key" ON "vehicle_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_types_code_key" ON "vehicle_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "zone_vehicle_rules_zoneId_vehicleTypeId_key" ON "zone_vehicle_rules"("zoneId", "vehicleTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "slots_code_key" ON "slots"("code");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_qrToken_key" ON "sessions"("qrToken");

-- CreateIndex
CREATE UNIQUE INDEX "payments_sessionId_key" ON "payments"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "system_configs_key_key" ON "system_configs"("key");

-- AddForeignKey
ALTER TABLE "gates" ADD CONSTRAINT "gates_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_vehicle_rules" ADD CONSTRAINT "zone_vehicle_rules_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_vehicle_rules" ADD CONSTRAINT "zone_vehicle_rules_vehicleTypeId_fkey" FOREIGN KEY ("vehicleTypeId") REFERENCES "vehicle_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_policies" ADD CONSTRAINT "price_policies_vehicleTypeId_fkey" FOREIGN KEY ("vehicleTypeId") REFERENCES "vehicle_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_vehicleTypeId_fkey" FOREIGN KEY ("vehicleTypeId") REFERENCES "vehicle_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slots" ADD CONSTRAINT "slots_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slots" ADD CONSTRAINT "slots_vehicleTypeId_fkey" FOREIGN KEY ("vehicleTypeId") REFERENCES "vehicle_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_vehicleTypeId_fkey" FOREIGN KEY ("vehicleTypeId") REFERENCES "vehicle_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_gateInId_fkey" FOREIGN KEY ("gateInId") REFERENCES "gates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_gateOutId_fkey" FOREIGN KEY ("gateOutId") REFERENCES "gates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exceptions" ADD CONSTRAINT "exceptions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
