import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './error.middleware';

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// Middleware: Verify JWT Token
export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Vui lòng đăng nhập để truy cập', 401);
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'test_secret';

    const payload = jwt.verify(token, secret) as JwtPayload;
    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(new AppError('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại', 401));
    } else if (err instanceof jwt.JsonWebTokenError) {
      next(new AppError('Token không hợp lệ', 401));
    } else {
      next(err);
    }
  }
};

// Middleware: Check Role
export const authorize = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Yêu cầu đăng nhập', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(`Chỉ các quyền [${roles.join(', ')}] mới được phép thực hiện thao tác này`, 403)
      );
    }

    next();
  };
};