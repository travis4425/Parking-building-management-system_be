import Joi from 'joi';

export const createSessionSchema = Joi.object({
  slotId: Joi.string().required().messages({
    'string.empty': 'Slot ID không được để trống',
    'any.required': 'Slot ID là bắt buộc',
  }),
  licensePlate: Joi.string().required().messages({
    'string.empty': 'Biển số xe không được để trống',
    'any.required': 'Biển số xe là bắt buộc',
  }),
  vehicleTypeId: Joi.string().required().messages({
    'string.empty': 'Loại xe không được để trống',
    'any.required': 'Loại xe là bắt buộc',
  }),
  gateInId: Joi.string().optional().allow('').messages({
    'string.empty': 'Cổng vào không được để trống',
  }),
});

export const checkoutSessionSchema = Joi.object({
  qrToken: Joi.string().required().messages({
    'string.empty': 'Mã QR không được để trống',
    'any.required': 'Mã QR là bắt buộc',
  }),
  gateOutId: Joi.string().optional().allow(''),
  lostTicket: Joi.boolean().optional(),
});
