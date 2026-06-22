-- 1) PricePolicy: thêm overnightRate (giá gửi qua đêm cố định)
ALTER TABLE "price_policies" ADD COLUMN "overnightRate" DOUBLE PRECISION NOT NULL DEFAULT 20000;

-- 2) Enums cho Alert
CREATE TYPE "AlertType" AS ENUM ('SENSOR_ERROR', 'SESSION_OVERTIME', 'WRONG_ZONE');
CREATE TYPE "AlertStatus" AS ENUM ('PENDING', 'RESOLVED');

-- 3) Bảng alerts
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "slotId" TEXT,
    "message" TEXT NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "alerts" ADD CONSTRAINT "alerts_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4) Chuẩn hoá VehicleType về đúng 3 loại: MOTORBIKE, BICYCLE, CAR
-- Đổi mọi CAR_4 / CAR_7 / ELECTRIC hiện có thành 1 loại CAR chung trước khi xoá,
-- để không mất dữ liệu slots/sessions/price_policies/reservations đang tham chiếu các code cũ.

-- 4a. Đảm bảo có đúng 1 dòng "CAR" để gộp vào
INSERT INTO "vehicle_types" ("id", "name", "code", "description", "maxHeight", "maxWidth", "createdAt", "updatedAt")
SELECT 'car-canonical-id', 'Ô tô', 'CAR', 'Ô tô', 2.0, 2.2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "vehicle_types" WHERE "code" = 'CAR');

-- 4b. Trỏ lại mọi FK từ CAR_4 / CAR_7 / ELECTRIC sang dòng CAR canonical
DO $$
DECLARE
    canonical_id TEXT;
    old_id TEXT;
BEGIN
    SELECT "id" INTO canonical_id FROM "vehicle_types" WHERE "code" = 'CAR' LIMIT 1;

    FOR old_id IN
        SELECT "id" FROM "vehicle_types" WHERE "code" IN ('CAR_4', 'CAR_7', 'ELECTRIC') AND "id" != canonical_id
    LOOP
        UPDATE "slots" SET "vehicleTypeId" = canonical_id WHERE "vehicleTypeId" = old_id;
        UPDATE "sessions" SET "vehicleTypeId" = canonical_id WHERE "vehicleTypeId" = old_id;
        UPDATE "reservations" SET "vehicleTypeId" = canonical_id WHERE "vehicleTypeId" = old_id;
        UPDATE "price_policies" SET "vehicleTypeId" = canonical_id WHERE "vehicleTypeId" = old_id;
        -- zone_vehicle_rules có unique(zoneId, vehicleTypeId) nên bỏ qua dòng trùng để tránh lỗi
        UPDATE "zone_vehicle_rules" zvr SET "vehicleTypeId" = canonical_id
            WHERE zvr."vehicleTypeId" = old_id
            AND NOT EXISTS (
                SELECT 1 FROM "zone_vehicle_rules" zvr2
                WHERE zvr2."zoneId" = zvr."zoneId" AND zvr2."vehicleTypeId" = canonical_id
            );
        DELETE FROM "zone_vehicle_rules" WHERE "vehicleTypeId" = old_id;
    END LOOP;
END $$;

-- 4c. Xoá các vehicle_types cũ không còn dùng
DELETE FROM "vehicle_types" WHERE "code" IN ('CAR_4', 'CAR_7', 'ELECTRIC');

-- 4d. Thêm loại BICYCLE (Xe đạp) nếu chưa có
INSERT INTO "vehicle_types" ("id", "name", "code", "description", "maxHeight", "maxWidth", "createdAt", "updatedAt")
SELECT 'bicycle-canonical-id', 'Xe đạp', 'BICYCLE', 'Xe đạp', 1.2, 0.6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "vehicle_types" WHERE "code" = 'BICYCLE');
