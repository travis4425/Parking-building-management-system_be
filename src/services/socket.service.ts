import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: SocketIOServer;

export const socketService = {
  init(server: HttpServer) {
    io = new SocketIOServer(server, {
      cors: {
        origin: '*', // Tạm thời mở cho mọi FE kết nối
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
      }
    });

    io.on('connection', (socket) => {
      console.log(`🟢 FE Connected via Socket: ${socket.id}`);
      
      socket.on('disconnect', () => {
        console.log(`🔴 FE Disconnected: ${socket.id}`);
      });
    });

    return io;
  },

  getIO() {
    if (!io) {
      throw new Error('Socket.io chưa được khởi tạo!');
    }
    return io;
  }
};