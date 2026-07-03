import Joi from 'joi';

export const createReservationSchema = Joi.object({
  userId: Joi.string().optional(),
  vehicleTypeId: Joi.string().required(),
  zoneId: Joi.string().required(),
  startTime: Joi.date().required().min('now'),
  duration: Joi.number().required().min(1).max(720), // minutes: 1 to 12 hours
});

export const cancelReservationSchema = Joi.object({
  reason: Joi.string().optional().max(500),
});

export const updateReservationSchema = Joi.object({
  startTime: Joi.date().optional(),
  endTime: Joi.date().optional(),
  status: Joi.string().optional().valid('ACTIVE', 'CANCELLED', 'COMPLETED'),
});
