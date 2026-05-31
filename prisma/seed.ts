import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Vehicle Types ─────────────────────────────────────────────────────────
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
      where: { code: 'CAR_4' },
      update: {},
      create: {
        name: 'Ô tô 4 chỗ',
        code: 'CAR_4',
        description: 'Sedan, hatchback dưới 4 chỗ',
        maxHeight: 1.8,
        maxWidth: 2.0,
      },
    }),
    prisma.vehicleType.upsert({
      where: { code: 'CAR_7' },
      update: {},
      create: {
        name: 'Ô tô 7 chỗ',
        code: 'CAR_7',
        description: 'SUV, MPV, bán tải',
        maxHeight: 2.0,
        maxWidth: 2.2,
      },
    }),
    prisma.vehicleType.upsert({
      where: { code: 'ELECTRIC' },
      update: {},
      create: {
        name: 'Xe điện',
        code: 'ELECTRIC',
        description: 'Xe điện các loại, ưu tiên vị trí gần trạm sạc',
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
        description: 'Tầng trệt — ô tô 4 chỗ và 7 chỗ',
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
        description: 'Ô tô 4 chỗ và xe điện',
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
        description: 'Ô tô 7 chỗ và xe điện (gần trạm sạc)',
        floor: 3,
        capacity: 40,
        status: 'ACTIVE',
      },
    }),
  ]);

  console.log(`✅ Created ${zones.length} zones`);

  // ─── Zone Vehicle Rules ────────────────────────────────────────────────────
  const motorbike = vehicleTypes.find((v) => v.code === 'MOTORBIKE')!;
  const car4 = vehicleTypes.find((v) => v.code === 'CAR_4')!;
  const car7 = vehicleTypes.find((v) => v.code === 'CAR_7')!;
  const electric = vehicleTypes.find((v) => v.code === 'ELECTRIC')!;

  const rules = [
    { zoneId: 'zone-b1', vehicleTypeId: motorbike.id },
    { zoneId: 'zone-1', vehicleTypeId: car4.id },
    { zoneId: 'zone-1', vehicleTypeId: car7.id },
    { zoneId: 'zone-2', vehicleTypeId: car4.id },
    { zoneId: 'zone-2', vehicleTypeId: electric.id },
    { zoneId: 'zone-3', vehicleTypeId: car7.id },
    { zoneId: 'zone-3', vehicleTypeId: electric.id },
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
