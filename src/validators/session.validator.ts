import Joi from 'joi';

export const createSessionSchema = Joi.object({
  slotId: Joi.string().required().messages({
    'string.empty': 'Slot ID không được để trống',
    'any.required': 'Slot ID là bắt buộc',
  }),
  gateInId: Joi.string().optional().allow(''),

  // --- Luồng mới: staff quét QR account driver ---
  driverQrToken: Joi.string().optional(),

  // --- Luồng cũ: staff nhập tay ---
  licensePlate: Joi.string().trim().optional().allow(''),
  vehicleTypeId: Joi.string().optional(),
}).or('driverQrToken', 'vehicleTypeId').messages({
  'object.missing': 'Vui lòng cung cấp driverQrToken hoặc vehicleTypeId',
});

export const checkoutSessionSchema = Joi.object({
  // Một trong hai: QR session (luồng cũ) hoặc QR account driver (luồng mới)
  qrToken: Joi.string().optional(),
  driverQrToken: Joi.string().optional(),
  gateOutId: Joi.string().optional().allow(''),
  lostTicket: Joi.boolean().optional(),
}).or('qrToken', 'driverQrToken').messages({
  'object.missing': 'Vui lòng cung cấp qrToken hoặc driverQrToken',
});
