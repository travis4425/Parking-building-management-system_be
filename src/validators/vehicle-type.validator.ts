import Joi from 'joi';

export const createVehicleTypeSchema = Joi.object({
  name: Joi.string().required().max(100),
  code: Joi.string().required().max(20).uppercase(),
  description: Joi.string().optional().max(500),
  maxHeight: Joi.number().optional().positive(),
  maxWidth: Joi.number().optional().positive(),
});

export const updateVehicleTypeSchema = Joi.object({
  name: Joi.string().optional().max(100),
  code: Joi.string().optional().max(20).uppercase(),
  description: Joi.string().optional().max(500),
  maxHeight: Joi.number().optional().positive(),
  maxWidth: Joi.number().optional().positive(),
});

export const createZoneVehicleRuleSchema = Joi.object({
  zoneId: Joi.string().required(),
  vehicleTypeId: Joi.string().required(),
});

export const deleteZoneVehicleRuleSchema = Joi.object({
  zoneId: Joi.string().optional(),
  vehicleTypeId: Joi.string().optional(),
});
