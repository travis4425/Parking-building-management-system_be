import 'dotenv/config'; // 1. Đảm bảo nạp file .env để kết nối DB
import prisma from '../src/config/db'; // 2. LẤY PRISMA ĐÃ CẤU HÌNH SẴN TỪ APP (Hết báo lỗi!)
import bcrypt from 'bcrypt';

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Users (1 tài khoản demo cho mỗi role: ADMIN, MANAGER, STAFF, DRIVER) ──
  const adminFixedPassword = await bcrypt.hash('Admin@1234', 10);
  const demoFixedPassword  = await bcrypt.hash('123456', 10); // khớp với hint ở màn hình đăng nhập FE

  const DEMO_USERS = [
    { email: 'admin@gmail.com',     password: adminFixedPassword, fullName: 'Quản trị viên Hệ thống', role: 'ADMIN' as const },
    { email: 'manager01@parking.vn', password: demoFixedPassword, fullName: 'Nguyễn Quản Lý',          role: 'MANAGER' as const },
    { email: 'staff01@parking.vn',   password: demoFixedPassword, fullName: 'Trần Nhân Viên',          role: 'STAFF' as const },
    { email: 'driver01@parking.vn',  password: demoFixedPassword, fullName: 'Lê Tài Xế',               role: 'DRIVER' as const },
  ];

  const users = await Promise.all(
    DEMO_USERS.map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: { password: u.password, fullName: u.fullName, role: u.role },
        create: u,
      })
    )
  );

  console.log(`✅ Created ${users.length} users.`);
  console.log(`🔑 ADMIN:   admin@gmail.com      | Pass: Admin@1234`);
  console.log(`🔑 MANAGER: manager01@parking.vn | Pass: 123456`);
  console.log(`🔑 STAFF:   staff01@parking.vn   | Pass: 123456`);
  console.log(`🔑 DRIVER:  driver01@parking.vn  | Pass: 123456`);
  console.log('--------------------------------------------------');

  // ─── Vehicle Types (3 loại theo chốt của team: xe máy / xe đạp / ô tô) ───────
  const vehicleTypes = await Promise.all([
    prisma.vehicleType.upsert({
      where: { code: 'MOTORBIKE' },
      update: {},
      create: {
        name: 'Xe máy',
        code: 'MOTORBIKE',
        description: 'Xe máy, xe gắn máy',
        maxHeight: 1.5,
        maxWidth: 0.9,
      },
    }),
    prisma.vehicleType.upsert({
      where: { code: 'BICYCLE' },
      update: {},
      create: {
        name: 'Xe đạp',
        code: 'BICYCLE',
        description: 'Xe đạp, xe đạp điện',
        maxHeight: 1.2,
        maxWidth: 0.6,
      },
    }),
    prisma.vehicleType.upsert({
      where: { code: 'CAR' },
      update: {},
      create: {
        name: 'Ô tô',
        code: 'CAR',
        description: 'Ô tô các loại (sedan, SUV, bán tải...)',
        maxHeight: 2.0,
        maxWidth: 2.2,
      },
    }),
  ]);

  console.log(`✅ Created ${vehicleTypes.length} vehicle types`);

  // ─── Zones ─────────────────────────────────────────────────────────────────
  const zones = await Promise.all([
    prisma.zone.upsert({
      where: { id: 'zone-b1' },
      update: {},
      create: {
        id: 'zone-b1',
        name: 'Tầng Hầm B1',
        description: 'Dành cho xe máy',
        floor: -1,
        capacity: 200,
        status: 'ACTIVE',
      },
    }),
    prisma.zone.upsert({
      where: { id: 'zone-1' },
      update: {},
      create: {
        id: 'zone-1',
        name: 'Tầng 1',
        description: 'Tầng trệt — ô tô',
        floor: 1,
        capacity: 50,
        status: 'ACTIVE',
      },
    }),
    prisma.zone.upsert({
      where: { id: 'zone-2' },
      update: {},
      create: {
        id: 'zone-2',
        name: 'Tầng 2',
        description: 'Ô tô',
        floor: 2,
        capacity: 60,
        status: 'ACTIVE',
      },
    }),
    prisma.zone.upsert({
      where: { id: 'zone-3' },
      update: {},
      create: {
        id: 'zone-3',
        name: 'Tầng 3',
        description: 'Ô tô',
        floor: 3,
        capacity: 40,
        status: 'ACTIVE',
      },
    }),
  ]);

  console.log(`✅ Created ${zones.length} zones`);

  // ─── Zone Vehicle Rules ────────────────────────────────────────────────────
  const motorbike = vehicleTypes.find((v) => v.code === 'MOTORBIKE')!;
  const bicycle = vehicleTypes.find((v) => v.code === 'BICYCLE')!;
  const car = vehicleTypes.find((v) => v.code === 'CAR')!;

  const rules = [
    { zoneId: 'zone-b1', vehicleTypeId: motorbike.id },
    { zoneId: 'zone-b1', vehicleTypeId: bicycle.id },
    { zoneId: 'zone-1', vehicleTypeId: car.id },
    { zoneId: 'zone-2', vehicleTypeId: car.id },
    { zoneId: 'zone-3', vehicleTypeId: car.id },
  ];

  for (const rule of rules) {
    await prisma.zoneVehicleRule.upsert({
      where: {
        zoneId_vehicleTypeId: {
          zoneId: rule.zoneId,
          vehicleTypeId: rule.vehicleTypeId,
        },
      },
      update: {},
      create: rule,
    });
  }

  console.log(`✅ Created ${rules.length} zone vehicle rules`);

  // ─── Gates ─────────────────────────────────────────────────────────────────
  const gates = await Promise.all([
    prisma.gate.upsert({
      where: { code: 'GATE-A-IN' },
      update: {},
      create: {
        name: 'Cổng A — Vào',
        code: 'GATE-A-IN',
        type: 'ENTRY',
        zoneId: 'zone-b1',
        status: 'ACTIVE',
      },
    }),
    prisma.gate.upsert({
      where: { code: 'GATE-A-OUT' },
      update: {},
      create: {
        name: 'Cổng A — Ra',
        code: 'GATE-A-OUT',
        type: 'EXIT',
        zoneId: 'zone-b1',
        status: 'ACTIVE',
      },
    }),
    prisma.gate.upsert({
      where: { code: 'GATE-B-BOTH' },
      update: {},
      create: {
        name: 'Cổng B — Vào/Ra',
        code: 'GATE-B-BOTH',
        type: 'BOTH',
        zoneId: 'zone-1',
        status: 'ACTIVE',
      },
    }),
    prisma.gate.upsert({
      where: { code: 'GATE-C-IN' },
      update: {},
      create: {
        name: 'Cổng C — Vào (Tầng 2)',
        code: 'GATE-C-IN',
        type: 'ENTRY',
        zoneId: 'zone-2',
        status: 'ACTIVE',
      },
    }),
    prisma.gate.upsert({
      where: { code: 'GATE-C-OUT' },
      update: {},
      create: {
        name: 'Cổng C — Ra (Tầng 2)',
        code: 'GATE-C-OUT',
        type: 'EXIT',
        zoneId: 'zone-2',
        status: 'ACTIVE',
      },
    }),
  ]);

  console.log(`✅ Created ${gates.length} gates`);
  console.log('🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });