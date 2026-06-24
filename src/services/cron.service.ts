import cron from 'node-cron';
import { getIO } from '../config/socket';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const startCronJobs = () => {
  // ─────────────────────────────────────────────────────────────────
  // 1. CRONJOB: GIẢ LẬP TÍN HIỆU IoT (Chạy mỗi 30 giây)
  // ─────────────────────────────────────────────────────────────────
  cron.schedule('*/30 * * * * *', () => {
    const io = getIO();
    
    // Tỷ lệ 30% sẽ phát sinh lỗi giả lập
    const shouldAlert = Math.random() > 0.7; 

    if (shouldAlert) {
      const fakeErrors = ['Mất kết nối Sensor', 'Camera không nhận diện được biển số'];
      const randomError = fakeErrors[Math.floor(Math.random() * fakeErrors.length)];
      const fakeDeviceId = `SENSOR-A${Math.floor(Math.random() * 9) + 1}`; // Random thiết bị từ A1 đến A9

      io.emit('alert:new', {
        deviceId: fakeDeviceId,
        issue: randomError,
        timestamp: new Date()
      });

      console.log(`🚨 [IoT Sim] Đã phát cảnh báo: ${randomError} tại ${fakeDeviceId}`);
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // 2. CRONJOB: QUÉT XE ĐỖ QUÁ 24H (Chạy mỗi 1 giờ - 0 phút mỗi giờ)
  // ─────────────────────────────────────────────────────────────────
  cron.schedule('0 * * * *', async () => {
    console.log('⏳ [Cron] Đang kiểm tra xe đỗ quá 24h...');
    try {
      // Mốc thời gian: Hiện tại lùi về trước đúng 24 tiếng
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const overtimeSessions = await prisma.session.findMany({
        where: {
          status: 'ACTIVE',
          entryTime: { lt: twentyFourHoursAgo }
        },
        select: { licensePlate: true, entryTime: true, id: true }
      });

      if (overtimeSessions.length > 0) {
        const io = getIO();
        io.emit('alert:overtime', {
          message: `Cảnh báo: Có ${overtimeSessions.length} xe đỗ quá 24h`,
          timestamp: new Date(),
          data: overtimeSessions
        });
        console.log(`⚠️ [Cron] Đã cảnh báo ${overtimeSessions.length} xe đỗ quá giờ lên Frontend!`);
      } else {
        console.log('✅ [Cron] Bãi đỗ xe an toàn, không có xe ngâm quá giờ.');
      }
    } catch (error) {
      console.error('❌ [Cron] Lỗi khi quét xe quá giờ:', error);
    }
  });

  console.log('⏱️ [Cron] Hệ thống chạy ngầm (IoT Sim & Overtime Checker) đã khởi động toàn diện.');
};