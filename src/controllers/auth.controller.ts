import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { AppError } from '../middlewares/error.middleware';
import { logAudit } from '../services/audit.service';

// [POST] /api/auth/login
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Validate thủ công, nhanh gọn lẹ ngay tại đây
    if (!email || !password) {
      return next(new AppError('Vui lòng cung cấp đầy đủ email và mật khẩu', 400));
    }

    // 1. Tìm User
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return next(new AppError('Tài khoản hoặc mật khẩu không chính xác', 401));
    }

    // 2. Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return next(new AppError('Tài khoản hoặc mật khẩu không chính xác', 401));
    }

    // 3. Tạo JWT Token
    const payload = { id: user.id, email: user.email, role: user.role };
    const secret = process.env.JWT_SECRET || 'test_secret';
    
    const signOptions: SignOptions = {
      expiresIn: (process.env.JWT_EXPIRES_IN as SignOptions['expiresIn']) || '24h'
    };
    const token = jwt.sign(payload, secret, signOptions);

    // 4. Ghi Audit Log tự động
    const ipAddress = (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;
    await logAudit(user.id, 'LOGIN', 'Auth', user.id, null, null, ipAddress);

    // 5. Trả về thông tin
    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        token,
        user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role }
      }
    });
  } catch (error) {
    next(error);
  }
};

// [POST] /api/auth/logout
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (userId) {
      const ipAddress = (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;
      await logAudit(userId, 'LOGOUT', 'Auth', userId, null, null, ipAddress);
    }

    res.status(200).json({
      success: true,
      message: 'Đăng xuất thành công',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

// [GET] /api/auth/me
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Không tìm thấy thông tin xác thực', 401));

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return next(new AppError('Người dùng không tồn tại', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Lấy thông tin thành công',
      data: user
    });
  } catch (error) {
    next(error);
  }
};