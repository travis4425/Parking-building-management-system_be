import cron from 'node-cron';
import { getIO } from '../config/socket';
import prisma from '../config/db';

export const startCronJobs = () => {
  // ─────────────────────────────────────────────────────────────────
  // ⚠️ ĐÃ TẮT: Cronjob giả lập tín hiệu IoT (cứ 30s lại random phát cảnh báo giả
  // "Mất kết nối Sensor"/"Camera không nhận diện được biển số" qua alert:new).
  // Theo quyết định mới của nhóm: KHÔNG dùng IoT/sensor (không có kinh phí), hệ thống
  // chỉ thống kê số chỗ trống theo zone (xem GET /api/zones/summary). Cronjob này phát
  // cảnh báo giả liên tục cho staff là sai lệch thực tế, gây nhiễu — đã tắt hẳn.
  // Không xoá code để tránh mất lịch sử, nhưng không được gọi nữa.
  //
  // cron.schedule('*/30 * * * * *', () => {
  //   const io = getIO();
  //   const shouldAlert = Math.random() > 0.7;
  //   if (shouldAlert) {
  //     const fakeErrors = ['Mất kết nối Sensor', 'Camera không nhận diện được biển số'];
  //     const randomError = fakeErrors[Math.floor(Math.random() * fakeErrors.length)];
  //     const fakeDeviceId = `SENSOR-A${Math.floor(Math.random() * 9) + 1}`;
  //     io.emit('alert:new', {
  //       deviceId: fakeDeviceId,
  //       issue: randomError,
  //       timestamp: new Date()
  //     });
  //     console.log(`🚨 [IoT Sim] Đã phát cảnh báo: ${randomError} tại ${fakeDeviceId}`);
  //   }
  // });

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