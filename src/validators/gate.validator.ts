import Joi from 'joi';

export const createGateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Tên cổng không được để trống',
    'any.required': 'Tên cổng là bắt buộc',
  }),
  code: Joi.string().trim().uppercase().min(2).max(20).required().messages({
    'any.required': 'Mã cổng là bắt buộc',
  }),
  type: Joi.string().valid('ENTRY', 'EXIT', 'BOTH').required().messages({
    'any.only': 'Loại cổng phải là ENTRY, EXIT hoặc BOTH',
    'any.required': 'Loại cổng là bắt buộc',
  }),
  zoneId: Joi.string().required().messages({
    'any.required': 'zoneId là bắt buộc',
  }),
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'MAINTENANCE').optional(),
});

export const updateGateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  type: Joi.string().valid('ENTRY', 'EXIT', 'BOTH').optional(),
  zoneId: Joi.string().optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'MAINTENANCE').optional(),
}).min(1).messages({
  'object.min': 'Cần ít nhất một trường để cập nhật',
});