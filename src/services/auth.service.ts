import prisma from '../config/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppError } from '../middlewares/error.middleware';

export const authService = {
  // ─── 1. ĐĂNG KÝ ────────────────────────────────────────────────────────────
  async register(data: any, ipAddress?: string) {
    const { email, password, fullName } = data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new AppError('Email này đã được sử dụng', 400);

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName: fullName || 'Tài xế mới',
        role: 'DRIVER',
      },
    });

    // 🎯 GHI AUDIT LOG: Đăng ký
    await prisma.auditLog.create({
      data: {
        userId: newUser.id, 
        action: 'REGISTER',
        resource: 'Auth',
        ipAddress: ipAddress || 'Unknown',
      },
    });

    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  },

  // ─── 2. ĐĂNG NHẬP (2 LỚP TOKEN) ────────────────────────────────────────────
  async login(data: any, ipAddress?: string) {
    const { email, password } = data;

    // 1. Tìm user trong Database và check mật khẩu
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new AppError('Email hoặc mật khẩu không chính xác', 401);
    }

    // 2. 🎯 GHI AUDIT LOG: Đăng nhập
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        resource: 'Auth',
        ipAddress: ipAddress || 'Unknown',
      },
    });

    // 3. TẠO CẶP TOKEN CHUẨN BẢO MẬT
    // 🔑 Access Token: Tuổi thọ cực ngắn (15 phút)
    const accessToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.ACCESS_TOKEN_SECRET || 'access_secret_tam_thoi',
      { expiresIn: '15m' } 
    );

    // 🔄 Refresh Token: Tuổi thọ dài (7 ngày)
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.REFRESH_TOKEN_SECRET || 'refresh_secret_tam_thoi',
      { expiresIn: '7d' } 
    );

    // 4. Trả về kết quả
    const { password: _, ...userWithoutPassword } = user;
    return { 
      user: userWithoutPassword, 
      accessToken,
      refreshToken
    };
  },

  // ─── 3. ĐĂNG XUẤT ──────────────────────────────────────────────────────────
  async logout(userId: string, ipAddress?: string) {
    // 🎯 GHI AUDIT LOG: Đăng xuất
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: 'LOGOUT',
        resource: 'Auth',
        ipAddress: ipAddress || 'Unknown',
      },
    });

    return { message: 'Đăng xuất thành công, đã lưu lịch sử' };
  },

  // ─── 4. ĐỔI MẬT KHẨU ───────────────────────────────────────────────────────
  async changePassword(userId: string, data: any, ipAddress?: string) {
    const { oldPassword, newPassword } = data;

    // 1. Tìm user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('Không tìm thấy thông tin người dùng', 404);

    // 2. Kiểm tra mật khẩu cũ
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) throw new AppError('Mật khẩu cũ không chính xác', 400);

    // 3. Mã hóa mật khẩu mới và lưu DB
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    // 4. 🎯 GHI AUDIT LOG
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: 'CHANGE_PASSWORD',
        resource: 'Auth',
        ipAddress: ipAddress || 'Unknown',
      },
    });

    return { message: 'Đổi mật khẩu thành công' };
  }
};