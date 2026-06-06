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
  gateInId: Joi.string().required().messages({
    'string.empty': 'Cổng vào không được để trống',
    'any.required': 'Cổng vào là bắt buộc',
  }),
});

export const checkoutSessionSchema = Joi.object({
  qrToken: Joi.string().required().messages({
    'string.empty': 'Mã QR không được để trống',
    'any.required': 'Mã QR là bắt buộc',
  }),
  gateOutId: Joi.string().required().messages({
    'string.empty': 'Cổng ra không được để trống',
    'any.required': 'Cổng ra là bắt buộc',
  }),
});