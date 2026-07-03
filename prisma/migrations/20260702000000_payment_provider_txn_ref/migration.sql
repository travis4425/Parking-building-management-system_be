-- AlterTable: thêm providerTxnRef vào bảng payments (VNPay transaction reference)
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "providerTxnRef" TEXT;
