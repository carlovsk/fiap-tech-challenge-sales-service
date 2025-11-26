import { syncVehicleSchema } from '@/schemas/vehicle.schema';
import { logger } from '@/utils/logger';
import { prisma } from '@/utils/prisma';
import { Prisma, VehicleStatus } from '@prisma/client';
import { Request, RequestHandler, Response } from 'express';

export class InternalController {
  private static logger = logger('controllers:internal');

  static syncVehicle: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const validatedData = syncVehicleSchema.parse(req.body);

      const vehicleData = {
        id: validatedData.id,
        brand: validatedData.brand,
        model: validatedData.model,
        year: validatedData.year,
        color: validatedData.color,
        price: new Prisma.Decimal(validatedData.price),
        status: validatedData.status as VehicleStatus,
        syncedAt: new Date(),
      };

      // Upsert: create if not exists, update if exists
      const vehicle = await prisma.vehicle.upsert({
        where: { id: validatedData.id },
        update: {
          brand: vehicleData.brand,
          model: vehicleData.model,
          year: vehicleData.year,
          color: vehicleData.color,
          price: vehicleData.price,
          status: vehicleData.status,
          syncedAt: vehicleData.syncedAt,
        },
        create: vehicleData,
      });

      InternalController.logger.info(`Vehicle synced: ${vehicle.id}`);
      res.status(200).json({ message: 'Vehicle synced successfully', vehicle });
    } catch (error) {
      InternalController.logger.error('Error syncing vehicle', error);
      if (error instanceof Error && error.name === 'ZodError') {
        res.status(400).json({ error: 'Validation error', details: error });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
