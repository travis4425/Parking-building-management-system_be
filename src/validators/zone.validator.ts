import Joi from 'joi';

export const createZoneSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Tên khu vực không được để trống',
    'string.min': 'Tên khu vực phải có ít nhất 2 ký tự',
    'any.required': 'Tên khu vực là bắt buộc',
  }),
  description: Joi.string().trim().max(500).optional(),
  floor: Joi.number().integer().min(0).max(50).required().messages({
    'number.base': 'Tầng phải là số nguyên',
    'any.required': 'Số tầng là bắt buộc',
  }),
  capacity: Joi.number().integer().min(1).required().messages({
    'number.base': 'Sức chứa phải là số nguyên',
    'number.min': 'Sức chứa phải lớn hơn 0',
    'any.required': 'Sức chứa là bắt buộc',
  }),
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'MAINTENANCE').optional(),
});

export const updateZoneSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  description: Joi.string().trim().max(500).allow('').optional(),
  floor: Joi.number().integer().min(0).max(50).optional(),
  capacity: Joi.number().integer().min(1).optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'MAINTENANCE').optional(),
}).min(1).messages({
  'object.min': 'Cần ít nhất một trường để cập nhật',
});
