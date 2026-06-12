import { Request, Response, NextFunction } from 'express';
import { vehicleTypeService } from '../services/vehicle-type.service';
import { createVehicleTypeSchema, updateVehicleTypeSchema, createZoneVehicleRuleSchema } from '../validators/vehicle-type.validator';
import { AppError } from '../middlewares/error.middleware';

export const vehicleTypeController = {
  /**
   * GET /api/vehicle-types
   * Danh sách loại xe
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = req.query;

      const result = await vehicleTypeService.getAll(
        page ? Number(page) : 1,
        limit ? Number(limit) : 20
      );

      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/vehicle-types/:id
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await vehicleTypeService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/vehicle-types
   * Thêm loại xe
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = createVehicleTypeSchema.validate(req.body);

      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      const data = await vehicleTypeService.create(value);

      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/vehicle-types/:id
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = updateVehicleTypeSchema.validate(req.body);

      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      const data = await vehicleTypeService.update(req.params.id, value);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/vehicle-types/:id
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await vehicleTypeService.delete(req.params.id);

      res.json({ success: true, data, message: 'Vehicle type deleted' });
    } catch (error) {
      next(error);
    }
  },

  // ─── ZONE VEHICLE RULES ──────────────────────────────────────────────────────
  /**
   * GET /api/zone-vehicle-rules
   * Quy tắc loại xe cho phép theo tầng
   */
  async getZoneVehicleRules(req: Request, res: Response, next: NextFunction) {
    try {
      const { zoneId, vehicleTypeId } = req.query;

      const data = await vehicleTypeService.getZoneVehicleRules(
        zoneId as string,
        vehicleTypeId as string
      );

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/zone-vehicle-rules
   * Thêm rule
   */
  async createZoneVehicleRule(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = createZoneVehicleRuleSchema.validate(req.body);

      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      const data = await vehicleTypeService.createZoneVehicleRule(value.zoneId, value.vehicleTypeId);

      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/zone-vehicle-rules/:ruleId
   * Or: DELETE /api/zone-vehicle-rules?zoneId=xxx&vehicleTypeId=yyy
   */
  async deleteZoneVehicleRule(req: Request, res: Response, next: NextFunction) {
    try {
      let zoneId: string;
      let vehicleTypeId: string;

      if (req.params.ruleId) {
        // TODO: For now, expecting zoneId and vehicleTypeId in body for composite key
        throw new AppError('Use query params: ?zoneId=xxx&vehicleTypeId=yyy', 400);
      } else {
        zoneId = req.query.zoneId as string;
        vehicleTypeId = req.query.vehicleTypeId as string;

        if (!zoneId || !vehicleTypeId) {
          throw new AppError('zoneId and vehicleTypeId are required', 400);
        }
      }

      const data = await vehicleTypeService.deleteZoneVehicleRule(zoneId, vehicleTypeId);

      res.json({ success: true, data, message: 'Zone vehicle rule deleted' });
    } catch (error) {
      next(error);
    }
  },
};
