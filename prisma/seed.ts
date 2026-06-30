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
  // 🐞 SỬA: cấu hình lại thành đúng 3 tầng, mỗi tầng 30 slot, tách rõ khu xe máy/
  // xe đạp và khu ô tô (DB lưu capacity theo từng zone nên 1 tầng = 2 zone con):
  //   Tầng 1: 20 xe máy/xe đạp + 10 ô tô  = 30
  //   Tầng 2: 15 xe máy/xe đạp + 15 ô tô  = 30
  //   Tầng 3: 15 xe máy/xe đạp + 15 ô tô  = 30
  // Giữ lại id cũ 'zone-1'/'zone-2'/'zone-3' cho khu ô tô (đã có Gate B, Gate C
  // gắn vào) để không phải dò lại các tham chiếu — chỉ đổi tên + giảm capacity.
  const zones = await Promise.all([
    // ── Tầng 1 ──
    prisma.zone.upsert({
      where: { id: 'zone-1-bike' },
      update: { name: 'Tầng 1 - Xe máy/Xe đạp', floor: 1, capacity: 20 },
      create: {
        id: 'zone-1-bike',
        name: 'Tầng 1 - Xe máy/Xe đạp',
        description: 'Khu vực xe máy và xe đạp',
        floor: 1,
        capacity: 20,
        status: 'ACTIVE',
      },
    }),
    prisma.zone.upsert({
      where: { id: 'zone-1' },
      update: { name: 'Tầng 1 - Ô tô', capacity: 10 },
      create: {
        id: 'zone-1',
        name: 'Tầng 1 - Ô tô',
        description: 'Khu vực ô tô',
        floor: 1,
        capacity: 10,
        status: 'ACTIVE',
      },
    }),
    // ── Tầng 2 ──
    prisma.zone.upsert({
      where: { id: 'zone-2-bike' },
      update: { name: 'Tầng 2 - Xe máy/Xe đạp', floor: 2, capacity: 15 },
      create: {
        id: 'zone-2-bike',
        name: 'Tầng 2 - Xe máy/Xe đạp',
        description: 'Khu vực xe máy và xe đạp',
        floor: 2,
        capacity: 15,
        status: 'ACTIVE',
      },
    }),
    prisma.zone.upsert({
      where: { id: 'zone-2' },
      update: { name: 'Tầng 2 - Ô tô', capacity: 15 },
      create: {
        id: 'zone-2',
        name: 'Tầng 2 - Ô tô',
        description: 'Khu vực ô tô',
        floor: 2,
        capacity: 15,
        status: 'ACTIVE',
      },
    }),
    // ── Tầng 3 ──
    prisma.zone.upsert({
      where: { id: 'zone-3-bike' },
      update: { name: 'Tầng 3 - Xe máy/Xe đạp', floor: 3, capacity: 15 },
      create: {
        id: 'zone-3-bike',
        name: 'Tầng 3 - Xe máy/Xe đạp',
        description: 'Khu vực xe máy và xe đạp',
        floor: 3,
        capacity: 15,
        status: 'ACTIVE',
      },
    }),
    prisma.zone.upsert({
      where: { id: 'zone-3' },
      update: { name: 'Tầng 3 - Ô tô', capacity: 15 },
      create: {
        id: 'zone-3',
        name: 'Tầng 3 - Ô tô',
        description: 'Khu vực ô tô',
        floor: 3,
        capacity: 15,
        status: 'ACTIVE',
      },
    }),
  ]);

  console.log(`✅ Created/updated ${zones.length} zones`);

  // ─── Zone Vehicle Rules ────────────────────────────────────────────────────
  const motorbike = vehicleTypes.find((v) => v.code === 'MOTORBIKE')!;
  const bicycle = vehicleTypes.find((v) => v.code === 'BICYCLE')!;
  const car = vehicleTypes.find((v) => v.code === 'CAR')!;

  const rules = [
    { zoneId: 'zone-1-bike', vehicleTypeId: motorbike.id },
    { zoneId: 'zone-1-bike', vehicleTypeId: bicycle.id },
    { zoneId: 'zone-1', vehicleTypeId: car.id },
    { zoneId: 'zone-2-bike', vehicleTypeId: motorbike.id },
    { zoneId: 'zone-2-bike', vehicleTypeId: bicycle.id },
    { zoneId: 'zone-2', vehicleTypeId: car.id },
    { zoneId: 'zone-3-bike', vehicleTypeId: motorbike.id },
    { zoneId: 'zone-3-bike', vehicleTypeId: bicycle.id },
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

  // ─── Slots ─────────────────────────────────────────────────────────────────
  // Sinh sẵn từng slot cụ thể cho mỗi zone, đúng số lượng theo yêu cầu:
  //   Tầng 1: 10 xe máy + 10 xe đạp + 10 ô tô = 30
  //   Tầng 2: 8 xe máy + 7 xe đạp + 15 ô tô   = 30
  //   Tầng 3: 8 xe máy + 7 xe đạp + 15 ô tô   = 30
  // 🐞 Lưu ý: đề bài chỉ cho tổng "xe máy + xe đạp" mỗi tầng (20/15/15), không
  // nói rõ tỉ lệ giữa 2 loại — tạm chia gần đều (ưu tiên xe máy hơn 1 chút).
  // Muốn đổi tỉ lệ thì chỉ cần sửa 2 số trong SLOT_PLAN dưới đây rồi chạy lại seed.
  const SLOT_PLAN: { zoneId: string; prefix: string; vehicleTypeId: string; count: number }[] = [
    { zoneId: 'zone-1-bike', prefix: 'T1-XM', vehicleTypeId: motorbike.id, count: 10 },
    { zoneId: 'zone-1-bike', prefix: 'T1-XD', vehicleTypeId: bicycle.id,   count: 10 },
    { zoneId: 'zone-1',      prefix: 'T1-OT', vehicleTypeId: car.id,       count: 10 },
    { zoneId: 'zone-2-bike', prefix: 'T2-XM', vehicleTypeId: motorbike.id, count: 8 },
    { zoneId: 'zone-2-bike', prefix: 'T2-XD', vehicleTypeId: bicycle.id,   count: 7 },
    { zoneId: 'zone-2',      prefix: 'T2-OT', vehicleTypeId: car.id,       count: 15 },
    { zoneId: 'zone-3-bike', prefix: 'T3-XM', vehicleTypeId: motorbike.id, count: 8 },
    { zoneId: 'zone-3-bike', prefix: 'T3-XD', vehicleTypeId: bicycle.id,   count: 7 },
    { zoneId: 'zone-3',      prefix: 'T3-OT', vehicleTypeId: car.id,       count: 15 },
  ];

  let slotCreated = 0;
  for (const plan of SLOT_PLAN) {
    for (let i = 1; i <= plan.count; i++) {
      const code = `${plan.prefix}-${String(i).padStart(2, '0')}`;
      await prisma.slot.upsert({
        where: { code },
        update: { zoneId: plan.zoneId, vehicleTypeId: plan.vehicleTypeId },
        create: {
          code,
          zoneId: plan.zoneId,
          vehicleTypeId: plan.vehicleTypeId,
          status: 'AVAILABLE',
        },
      });
      slotCreated++;
    }
  }

  console.log(`✅ Created/updated ${slotCreated} slots (90 slot — 3 tầng × 30 slot)`);

  // ─── Gates ─────────────────────────────────────────────────────────────────
  // 🐞 SỬA: Cổng A trước đây gắn vào 'zone-b1' (tầng hầm, đã bỏ vì hệ thống chỉ
  // còn 3 tầng) — chuyển sang khu xe máy/xe đạp của Tầng 1.
  const gates = await Promise.all([
    prisma.gate.upsert({
      where: { code: 'GATE-A-IN' },
      update: { zoneId: 'zone-1-bike' },
      create: {
        name: 'Cổng A — Vào',
        code: 'GATE-A-IN',
        type: 'ENTRY',
        zoneId: 'zone-1-bike',
        status: 'ACTIVE',
      },
    }),
    prisma.gate.upsert({
      where: { code: 'GATE-A-OUT' },
      update: { zoneId: 'zone-1-bike' },
      create: {
        name: 'Cổng A — Ra',
        code: 'GATE-A-OUT',
        type: 'EXIT',
        zoneId: 'zone-1-bike',
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

  // ─── Xóa Tầng Hầm B1 (zone-b1) ───────────────────────────────────────────────
  // Hệ thống giờ chỉ còn đúng 3 tầng (1, 2, 3) — bỏ hẳn tầng hầm cũ. Cổng A đã
  // được chuyển sang 'zone-1-bike' ở trên. Chỉ xóa nếu zone-b1 KHÔNG còn slot/
  // session/reservation thật nào tham chiếu tới (tránh xóa mất dữ liệu lịch sử
  // thật — Zone có onDelete: Cascade nên xóa nhầm sẽ mất luôn session liên quan).
  const oldBasement = await prisma.zone.findUnique({ where: { id: 'zone-b1' } });
  if (oldBasement) {
    const [slotCount, sessionCount, reservationCount] = await Promise.all([
      prisma.slot.count({ where: { zoneId: 'zone-b1' } }),
      prisma.session.count({ where: { zoneId: 'zone-b1' } }),
      prisma.reservation.count({ where: { zoneId: 'zone-b1' } }),
    ]);

    if (slotCount === 0 && sessionCount === 0 && reservationCount === 0) {
      await prisma.zone.delete({ where: { id: 'zone-b1' } });
      console.log('🗑️  Đã xóa Tầng Hầm B1 (zone-b1) — không còn slot/session nào tham chiếu.');
    } else {
      console.warn(
        `⚠️  KHÔNG xóa zone-b1 vì còn dữ liệu thật: ${slotCount} slot, ${sessionCount} session, ` +
        `${reservationCount} reservation. Hãy xử lý/di chuyển dữ liệu này trước, rồi chạy lại seed.`
      );
    }
  } else {
    console.log('ℹ️  zone-b1 không tồn tại (đã xóa từ trước) — bỏ qua.');
  }

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