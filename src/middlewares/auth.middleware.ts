import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

// 1. Ông bảo vệ 1: Kiểm tra xem vé (Token) có thật hay làm giả
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để truy cập' });
    }

    const token = authHeader.split(' ')[1];
    const secretKey = process.env.ACCESS_TOKEN_SECRET || 'access_secret_tam_thoi';
    
    const decoded = jwt.verify(token, secretKey);
    (req as any).user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
};

// 2. Ông bảo vệ 2: Kiểm tra chức vụ (Role) xem có đủ thẩm quyền không
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    // Nếu không có user hoặc role của user không nằm trong danh sách cho phép
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Bạn không có đủ quyền để thực hiện hành động này!' 
      });
    }

    next();
  };
};