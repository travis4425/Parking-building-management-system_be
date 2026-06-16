import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: any, // 👉 CHÍNH LÀ CHỮ NÀY: Sửa Error thành any
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Lỗi do mình tạo ra (AppError)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // Lỗi Prisma — unique constraint
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const field = (err.meta?.target as string[])?.join(', ') ?? 'trường';
      return res.status(409).json({
        success: false,
        message: `Giá trị của ${field} đã tồn tại`,
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bản ghi',
      });
    }
    if (err.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu tham chiếu không hợp lệ (foreign key)',
      });
    }
  }

  // Lỗi Prisma — validation
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu đầu vào không hợp lệ',
    });
  }

  // Lỗi không xác định — không lộ chi tiết ra ngoài
  console.error('Unhandled error:', err);
  return res.status(500).json({
    success: false,
    message: 'Lỗi máy chủ nội bộ',
  });
};

export const notFoundHandler = (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint không tồn tại',
  });
};