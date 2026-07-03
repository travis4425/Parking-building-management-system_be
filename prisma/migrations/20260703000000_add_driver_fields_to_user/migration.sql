-- AlterTable: thêm licensePlate, vehicleTypeId, qrToken vào bảng users
ALTER TABLE "users"
  ADD COLUMN "licensePlate" TEXT,
  ADD COLUMN "vehicleTypeId" TEXT,
  ADD COLUMN "qrToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_licensePlate_key" ON "users"("licensePlate");
CREATE UNIQUE INDEX IF NOT EXISTS "users_qrToken_key" ON "users"("qrToken");

-- AddForeignKey
ALTER TABLE "users"
  ADD CONSTRAINT "users_vehicleTypeId_fkey"
  FOREIGN KEY ("vehicleTypeId")
  REFERENCES "vehicle_types"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
