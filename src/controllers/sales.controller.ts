import { paymentWebhookSchema, purchaseSchema } from '@/schemas/purchase.schema';
import { ManagementServiceSync } from '@/services/managementServiceSync';
import { logger } from '@/utils/logger';
import { prisma } from '@/utils/prisma';
import { PaymentStatus, VehicleStatus } from '@prisma/client';
import { Request, RequestHandler, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export class SalesController {
  private static logger = logger('controllers:sales');

  static getAvailableVehicles: RequestHandler = async (_req: Request, res: Response): Promise<void> => {
    try {
      const vehicles = await prisma.vehicle.findMany({
        where: { status: VehicleStatus.AVAILABLE },
        orderBy: { price: 'asc' },
      });

      res.status(200).json(vehicles);
    } catch (error) {
      SalesController.logger.error('Error fetching available vehicles', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  static getSoldVehicles: RequestHandler = async (_req: Request, res: Response): Promise<void> => {
    try {
      const vehicles = await prisma.vehicle.findMany({
        where: { status: VehicleStatus.SOLD },
        orderBy: { price: 'asc' },
      });

      res.status(200).json(vehicles);
    } catch (error) {
      SalesController.logger.error('Error fetching sold vehicles', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  static purchase: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const validatedData = purchaseSchema.parse(req.body);

      // Check if vehicle exists and is available
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: validatedData.vehicleId },
      });

      if (!vehicle) {
        res.status(404).json({ error: 'Vehicle not found' });
        return;
      }

      if (vehicle.status !== VehicleStatus.AVAILABLE) {
        res.status(400).json({ error: 'Vehicle is not available for purchase' });
        return;
      }

      // Create sale and payment in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create sale record
        const sale = await tx.sale.create({
          data: {
            vehicleId: validatedData.vehicleId,
            buyerCpf: validatedData.buyerCpf,
            saleDate: validatedData.saleDate,
            totalAmount: vehicle.price,
          },
        });

        // Create payment record with PENDING status
        const payment = await tx.payment.create({
          data: {
            saleId: sale.id,
            paymentCode: uuidv4(),
            status: PaymentStatus.PENDING,
          },
        });

        // Update vehicle status to SOLD
        await tx.vehicle.update({
          where: { id: validatedData.vehicleId },
          data: { status: VehicleStatus.SOLD },
        });

        return { sale, payment };
      });

      // Fire-and-forget: notify management service
      ManagementServiceSync.notifySale(validatedData.vehicleId, {
        buyerCpf: validatedData.buyerCpf,
        saleDate: validatedData.saleDate,
      });

      SalesController.logger.info(`Purchase completed: Sale ${result.sale.id}, Payment ${result.payment.paymentCode}`);

      res.status(201).json({
        sale: {
          id: result.sale.id,
          vehicleId: result.sale.vehicleId,
          buyerCpf: result.sale.buyerCpf,
          saleDate: result.sale.saleDate,
          totalAmount: result.sale.totalAmount,
          createdAt: result.sale.createdAt,
          updatedAt: result.sale.updatedAt,
        },
        payment: {
          id: result.payment.id,
          paymentCode: result.payment.paymentCode,
          status: result.payment.status,
          createdAt: result.payment.createdAt,
          updatedAt: result.payment.updatedAt,
        },
      });
    } catch (error) {
      SalesController.logger.error('Error processing purchase', error);
      if (error instanceof Error && error.name === 'ZodError') {
        res.status(400).json({ error: 'Validation error', details: error });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  static paymentWebhook: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const validatedData = paymentWebhookSchema.parse(req.body);

      // Find payment by paymentCode
      const payment = await prisma.payment.findUnique({
        where: { paymentCode: validatedData.paymentCode },
      });

      if (!payment) {
        res.status(404).json({ error: 'Payment not found' });
        return;
      }

      // Map webhook status to PaymentStatus enum
      const newStatus = validatedData.status === 'confirmed' ? PaymentStatus.CONFIRMED : PaymentStatus.CANCELLED;

      // Update payment status
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: newStatus },
      });

      SalesController.logger.info(`Payment ${validatedData.paymentCode} updated to ${newStatus}`);

      res.status(200).json({ message: 'Payment status updated successfully' });
    } catch (error) {
      SalesController.logger.error('Error processing payment webhook', error);
      if (error instanceof Error && error.name === 'ZodError') {
        res.status(400).json({ error: 'Validation error', details: error });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
