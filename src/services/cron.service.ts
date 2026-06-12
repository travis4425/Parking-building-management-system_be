import cron from 'node-cron';
import { getIO } from '../config/socket';

export const startCronJobs = () => {
  // Biểu thức cron: Chạy mỗi 30 giây
  cron.schedule('*/30 * * * * *', () => {
    const io = getIO();
    
    // Tỷ lệ 30% sẽ phát sinh lỗi giả lập
    const shouldAlert = Math.random() > 0.7; 

    if (shouldAlert) {
      const fakeErrors = ['Mất kết nối Sensor', 'Xe đỗ vượt quá thời gian đăng ký', 'Camera không nhận diện được biển số'];
      const randomError = fakeErrors[Math.floor(Math.random() * fakeErrors.length)];
      const fakeDeviceId = `SENSOR-A${Math.floor(Math.random() * 9) + 1}`; // Random tên thiết bị từ SENSOR-A1 đến A9

      io.emit('alert:new', {
        deviceId: fakeDeviceId,
        issue: randomError,
        timestamp: new Date()
      });

      console.log(`🚨 [IoT Sim] Đã phát cảnh báo: ${randomError} tại ${fakeDeviceId}`);
    }
  });

  console.log('⏱️ [Cron] Hệ thống giả lập tín hiệu IoT đã khởi động.');
};