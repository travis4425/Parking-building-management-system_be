import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Truyền thêm req.ip vào hàm register
    const newUser = await authService.register(req.body, req.ip);
    res.status(201).json({ success: true, message: 'Đăng ký thành công', data: newUser });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Truyền thêm req.ip vào hàm login
    const result = await authService.login(req.body, req.ip);
    res.status(200).json({ success: true, message: 'Đăng nhập thành công', data: result });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Để logout được, user phải gửi token lên, middleware sẽ giải mã ra req.user
    const userId = (req as any).user?.id || (req as any).user?.userId; 

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Không tìm thấy thông tin xác thực' });
    }

    const result = await authService.logout(userId, req.ip);
    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
};

// ─── HÀM ĐỔI MẬT KHẨU ────────────────────────────────────────────────────────
export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Lấy ID của người dùng từ Token (đã đi qua middleware bảo vệ)
    const userId = (req as any).user?.id || (req as any).user?.userId; 
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Chưa xác thực người dùng' });
    }

    // Truyền ID người dùng, dữ liệu mật khẩu cũ/mới và IP xuống Service
    const result = await authService.changePassword(userId, req.body, req.ip);
    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    next(error); // Đẩy ra cho Error Middleware xử lý (báo lỗi sai pass cũ, v.v.)
  }
};

// ─── THÊM HÀM REFRESH TOKEN VÀO ĐÂY ──────────────────────────────────────────
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Thường Frontend sẽ gửi refreshToken trong body
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp Refresh Token' });
    }

    // Gọi xuống Service để đổi token mới
    const result = await authService.refreshToken(refreshToken);
    res.status(200).json({ success: true, message: 'Làm mới phiên đăng nhập thành công', data: result });
  } catch (error) {
    next(error);
  }
};
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getMe((req as any).user.id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};
