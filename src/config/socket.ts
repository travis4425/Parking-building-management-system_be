import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: Server;

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: { origin: process.env.CORS_ORIGIN ?? '*' }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 [Socket.io] Thiết bị/Trình duyệt kết nối: ${socket.id}`);
    
    socket.on('disconnect', () => {
      console.log(`🔌 [Socket.io] Đã ngắt kết nối: ${socket.id}`);
    });
  });

  return io;
};

// Hàm này dùng để lấy instance io ra xài ở các Controller khác
export const getIO = () => {
  if (!io) throw new Error('Socket.io chưa được khởi tạo!');
  return io;
};