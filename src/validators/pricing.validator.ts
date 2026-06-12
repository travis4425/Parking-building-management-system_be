import Joi from 'joi';

export const createPricingSchema = Joi.object({
  vehicleTypeId: Joi.string().required(),
  name: Joi.string().required().max(100),
  basePrice: Joi.number().required().min(0),
  pricePerHour: Joi.number().required().min(0),
  peakMultiplier: Joi.number().optional().default(1.5).min(1),
  effectiveFrom: Joi.date().required(),
  effectiveTo: Joi.date().optional(),
});

export const updatePricingSchema = Joi.object({
  name: Joi.string().optional().max(100),
  basePrice: Joi.number().optional().min(0),
  pricePerHour: Joi.number().optional().min(0),
  peakMultiplier: Joi.number().optional().min(1),
  effectiveFrom: Joi.date().optional(),
  effectiveTo: Joi.date().optional(),
  isActive: Joi.boolean().optional(),
});

export const calculatePricingSchema = Joi.object({
  vehicleTypeId: Joi.string().required(),
  entryTime: Joi.date().required(),
  exitTime: Joi.date().required(),
  isPeakHour: Joi.boolean().optional().default(false),
});
