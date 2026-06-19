import Joi from 'joi';

export const createAlertSchema = Joi.object({
  type: Joi.string().valid('SENSOR_ERROR', 'SESSION_OVERTIME', 'WRONG_ZONE').required(),
  slotId: Joi.string().optional(),
  message: Joi.string().required().max(500),
});
