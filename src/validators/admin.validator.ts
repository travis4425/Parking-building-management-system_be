import Joi from 'joi';

export const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  fullName: Joi.string().required().max(100),
  phone: Joi.string().optional().max(20),
  role: Joi.string().valid('MANAGER', 'STAFF', 'DRIVER', 'ADMIN').default('DRIVER'),
});

export const updateUserSchema = Joi.object({
  email: Joi.string().email().optional(),
  fullName: Joi.string().optional().max(100),
  phone: Joi.string().optional().max(20),
});

export const updateUserRoleSchema = Joi.object({
  role: Joi.string().valid('MANAGER', 'STAFF', 'DRIVER', 'ADMIN').required(),
});

export const updateUserStatusSchema = Joi.object({
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'BLOCKED').required(),
});

export const systemConfigSchema = Joi.object({
  key: Joi.string().required().max(100),
  value: Joi.string().required(),
  description: Joi.string().optional().max(500),
  type: Joi.string().valid('string', 'number', 'boolean', 'json').default('string'),
});
