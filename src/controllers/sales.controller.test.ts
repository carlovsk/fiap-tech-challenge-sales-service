import { PaymentStatus, Prisma, VehicleStatus } from '@prisma/client';
import { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SalesController } from './sales.controller';

vi.mock('@/utils/prisma', () => ({
  prisma: {
    vehicle: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    sale: {
      create: vi.fn(),
    },
    payment: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

vi.mock('@/services/managementServiceSync', () => ({
  ManagementServiceSync: {
    notifySale: vi.fn(),
  },
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mocked-uuid-payment-code'),
}));

import { ManagementServiceSync } from '@/services/managementServiceSync';
import { prisma } from '@/utils/prisma';

describe('SalesController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockJson = vi.fn().mockReturnThis();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });

    mockRequest = {
      body: {},
    };

    mockResponse = {
      json: mockJson,
      status: mockStatus,
    } as Partial<Response>;

    vi.clearAllMocks();
  });

  describe('getAvailableVehicles', () => {
    it('should return available vehicles sorted by price', async () => {
      const mockVehicles = [
        {
          id: '1',
          brand: 'Toyota',
          model: 'Corolla',
          year: 2023,
          color: 'Blue',
          price: new Prisma.Decimal(30000),
          status: VehicleStatus.AVAILABLE,
          syncedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          brand: 'Honda',
          model: 'Civic',
          year: 2023,
          color: 'Red',
          price: new Prisma.Decimal(35000),
          status: VehicleStatus.AVAILABLE,
          syncedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.vehicle.findMany).mockResolvedValue(mockVehicles);

      await SalesController.getAvailableVehicles(mockRequest as Request, mockResponse as Response, () => {});

      expect(prisma.vehicle.findMany).toHaveBeenCalledWith({
        where: { status: VehicleStatus.AVAILABLE },
        orderBy: { price: 'asc' },
      });
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(mockVehicles);
    });

    it('should return empty array when no available vehicles', async () => {
      vi.mocked(prisma.vehicle.findMany).mockResolvedValue([]);

      await SalesController.getAvailableVehicles(mockRequest as Request, mockResponse as Response, () => {});

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith([]);
    });

    it('should return 500 on database error', async () => {
      vi.mocked(prisma.vehicle.findMany).mockRejectedValue(new Error('Database error'));

      await SalesController.getAvailableVehicles(mockRequest as Request, mockResponse as Response, () => {});

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  describe('getSoldVehicles', () => {
    it('should return sold vehicles sorted by price', async () => {
      const mockVehicles = [
        {
          id: '1',
          brand: 'Toyota',
          model: 'Corolla',
          year: 2023,
          color: 'Blue',
          price: new Prisma.Decimal(30000),
          status: VehicleStatus.SOLD,
          syncedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.vehicle.findMany).mockResolvedValue(mockVehicles);

      await SalesController.getSoldVehicles(mockRequest as Request, mockResponse as Response, () => {});

      expect(prisma.vehicle.findMany).toHaveBeenCalledWith({
        where: { status: VehicleStatus.SOLD },
        orderBy: { price: 'asc' },
      });
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(mockVehicles);
    });

    it('should return empty array when no sold vehicles', async () => {
      vi.mocked(prisma.vehicle.findMany).mockResolvedValue([]);

      await SalesController.getSoldVehicles(mockRequest as Request, mockResponse as Response, () => {});

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith([]);
    });

    it('should return 500 on database error', async () => {
      vi.mocked(prisma.vehicle.findMany).mockRejectedValue(new Error('Database error'));

      await SalesController.getSoldVehicles(mockRequest as Request, mockResponse as Response, () => {});

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  describe('purchase', () => {
    const validPurchaseBody = {
      vehicleId: '550e8400-e29b-41d4-a716-446655440000',
      buyerCpf: '12345678901',
      saleDate: '2024-01-15T10:00:00.000Z',
    };

    const mockVehicle = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      brand: 'Toyota',
      model: 'Corolla',
      year: 2023,
      color: 'Blue',
      price: new Prisma.Decimal(50000),
      status: VehicleStatus.AVAILABLE,
      syncedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create sale and payment successfully', async () => {
      mockRequest.body = validPurchaseBody;

      const mockSale = {
        id: 'sale-id',
        vehicleId: validPurchaseBody.vehicleId,
        buyerCpf: validPurchaseBody.buyerCpf,
        saleDate: new Date(validPurchaseBody.saleDate),
        totalAmount: mockVehicle.price,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPayment = {
        id: 'payment-id',
        saleId: 'sale-id',
        paymentCode: 'mocked-uuid-payment-code',
        status: PaymentStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue(mockVehicle);
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        const tx = {
          sale: {
            create: vi.fn().mockResolvedValue(mockSale),
          },
          payment: {
            create: vi.fn().mockResolvedValue(mockPayment),
          },
          vehicle: {
            update: vi.fn().mockResolvedValue({ ...mockVehicle, status: VehicleStatus.SOLD }),
          },
        };
        return callback(tx as any);
      });

      await SalesController.purchase(mockRequest as Request, mockResponse as Response, () => {});

      expect(prisma.vehicle.findUnique).toHaveBeenCalledWith({
        where: { id: validPurchaseBody.vehicleId },
      });
      expect(ManagementServiceSync.notifySale).toHaveBeenCalledWith(validPurchaseBody.vehicleId, {
        buyerCpf: validPurchaseBody.buyerCpf,
        saleDate: expect.any(Date),
      });
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          sale: expect.objectContaining({
            id: 'sale-id',
            vehicleId: validPurchaseBody.vehicleId,
          }),
          payment: expect.objectContaining({
            paymentCode: 'mocked-uuid-payment-code',
            status: PaymentStatus.PENDING,
          }),
        }),
      );
    });

    it('should return 404 when vehicle not found', async () => {
      mockRequest.body = validPurchaseBody;
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue(null);

      await SalesController.purchase(mockRequest as Request, mockResponse as Response, () => {});

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Vehicle not found' });
    });

    it('should return 400 when vehicle is not available', async () => {
      mockRequest.body = validPurchaseBody;
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue({
        ...mockVehicle,
        status: VehicleStatus.SOLD,
      });

      await SalesController.purchase(mockRequest as Request, mockResponse as Response, () => {});

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Vehicle is not available for purchase' });
    });

    it('should return 400 on validation error - invalid vehicleId', async () => {
      mockRequest.body = {
        ...validPurchaseBody,
        vehicleId: 'invalid-id',
      };

      await SalesController.purchase(mockRequest as Request, mockResponse as Response, () => {});

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation error',
        }),
      );
    });

    it('should return 400 on validation error - missing buyerCpf', async () => {
      mockRequest.body = {
        vehicleId: validPurchaseBody.vehicleId,
        saleDate: validPurchaseBody.saleDate,
      };

      await SalesController.purchase(mockRequest as Request, mockResponse as Response, () => {});

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation error',
        }),
      );
    });

    it('should return 400 on validation error - invalid CPF length', async () => {
      mockRequest.body = {
        ...validPurchaseBody,
        buyerCpf: '123', // Too short
      };

      await SalesController.purchase(mockRequest as Request, mockResponse as Response, () => {});

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation error',
        }),
      );
    });

    it('should return 500 on database error', async () => {
      mockRequest.body = validPurchaseBody;
      vi.mocked(prisma.vehicle.findUnique).mockRejectedValue(new Error('Database error'));

      await SalesController.purchase(mockRequest as Request, mockResponse as Response, () => {});

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  describe('paymentWebhook', () => {
    const mockPayment = {
      id: 'payment-id',
      saleId: 'sale-id',
      paymentCode: 'PAY-123456',
      status: PaymentStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should update payment status to CONFIRMED', async () => {
      mockRequest.body = {
        paymentCode: 'PAY-123456',
        status: 'confirmed',
      };

      vi.mocked(prisma.payment.findUnique).mockResolvedValue(mockPayment);
      vi.mocked(prisma.payment.update).mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.CONFIRMED,
      });

      await SalesController.paymentWebhook(mockRequest as Request, mockResponse as Response, () => {});

      expect(prisma.payment.findUnique).toHaveBeenCalledWith({
        where: { paymentCode: 'PAY-123456' },
      });
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-id' },
        data: { status: PaymentStatus.CONFIRMED },
      });
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Payment status updated successfully' });
    });

    it('should update payment status to CANCELLED', async () => {
      mockRequest.body = {
        paymentCode: 'PAY-123456',
        status: 'cancelled',
      };

      vi.mocked(prisma.payment.findUnique).mockResolvedValue(mockPayment);
      vi.mocked(prisma.payment.update).mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.CANCELLED,
      });

      await SalesController.paymentWebhook(mockRequest as Request, mockResponse as Response, () => {});

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-id' },
        data: { status: PaymentStatus.CANCELLED },
      });
      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should return 404 when payment not found', async () => {
      mockRequest.body = {
        paymentCode: 'UNKNOWN-CODE',
        status: 'confirmed',
      };

      vi.mocked(prisma.payment.findUnique).mockResolvedValue(null);

      await SalesController.paymentWebhook(mockRequest as Request, mockResponse as Response, () => {});

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Payment not found' });
    });

    it('should return 400 on validation error - invalid status', async () => {
      mockRequest.body = {
        paymentCode: 'PAY-123456',
        status: 'invalid_status',
      };

      await SalesController.paymentWebhook(mockRequest as Request, mockResponse as Response, () => {});

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation error',
        }),
      );
    });

    it('should return 400 on validation error - missing paymentCode', async () => {
      mockRequest.body = {
        status: 'confirmed',
      };

      await SalesController.paymentWebhook(mockRequest as Request, mockResponse as Response, () => {});

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation error',
        }),
      );
    });

    it('should return 400 on validation error - empty paymentCode', async () => {
      mockRequest.body = {
        paymentCode: '',
        status: 'confirmed',
      };

      await SalesController.paymentWebhook(mockRequest as Request, mockResponse as Response, () => {});

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation error',
        }),
      );
    });

    it('should return 500 on database error', async () => {
      mockRequest.body = {
        paymentCode: 'PAY-123456',
        status: 'confirmed',
      };

      vi.mocked(prisma.payment.findUnique).mockRejectedValue(new Error('Database error'));

      await SalesController.paymentWebhook(mockRequest as Request, mockResponse as Response, () => {});

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });
});
