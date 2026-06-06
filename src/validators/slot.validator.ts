import Joi from 'joi';

const slotStatuses = [
  'AVAILABLE',
  'OCCUPIED',
  'RESERVED',
  'MAINTENANCE',
  'LOCKED',
] as const;

export const createSlotSchema = Joi.object({
  code: Joi.string().trim().uppercase().min(2).max(20).required().messages({
    'string.empty': 'Mã slot không được để trống',
    'any.required': 'Mã slot là bắt buộc',
  }),
  zoneId: Joi.string().required().messages({
    'any.required': 'zoneId là bắt buộc',
  }),
  vehicleTypeId: Joi.string().optional(),
  status: Joi.string().valid(...slotStatuses).optional().messages({
    'any.only': 'Trạng thái slot không hợp lệ',
  }),
});

export const updateSlotSchema = Joi.object({
  code: Joi.string().trim().uppercase().min(2).max(20).optional(),
  zoneId: Joi.string().optional(),
  vehicleTypeId: Joi.string().allow(null).optional(),
}).min(1).messages({
  'object.min': 'Cần ít nhất một trường để cập nhật',
});

export const updateSlotStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...slotStatuses)
    .required()
    .messages({
      'any.only': 'Trạng thái slot không hợp lệ',
      'any.required': 'status là bắt buộc',
    }),
});
