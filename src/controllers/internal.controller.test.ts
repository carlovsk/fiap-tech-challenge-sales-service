import { Prisma, VehicleStatus } from '@prisma/client';
import { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InternalController } from './internal.controller';

vi.mock('@/utils/prisma', () => ({
  prisma: {
    vehicle: {
      upsert: vi.fn(),
    },
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

import { prisma } from '@/utils/prisma';

describe('InternalController', () => {
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

  describe('syncVehicle', () => {
    it('should create a new vehicle when it does not exist', async () => {
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

      mockRequest.body = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2023,
        color: 'Blue',
        price: 50000,
        status: 'AVAILABLE',
      };

      vi.mocked(prisma.vehicle.upsert).mockResolvedValue(mockVehicle);

      await InternalController.syncVehicle(mockRequest as Request, mockResponse as Response, () => {});

      expect(prisma.vehicle.upsert).toHaveBeenCalledWith({
        where: { id: '550e8400-e29b-41d4-a716-446655440000' },
        update: {
          brand: 'Toyota',
          model: 'Corolla',
          year: 2023,
          color: 'Blue',
          price: new Prisma.Decimal(50000),
          status: VehicleStatus.AVAILABLE,
          syncedAt: expect.any(Date),
        },
        create: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          brand: 'Toyota',
          model: 'Corolla',
          year: 2023,
          color: 'Blue',
          price: new Prisma.Decimal(50000),
          status: VehicleStatus.AVAILABLE,
          syncedAt: expect.any(Date),
        },
      });

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Vehicle synced successfully',
        vehicle: mockVehicle,
      });
    });

    it('should update an existing vehicle when it exists', async () => {
      const mockVehicle = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        brand: 'Toyota',
        model: 'Camry',
        year: 2024,
        color: 'Red',
        price: new Prisma.Decimal(60000),
        status: VehicleStatus.SOLD,
        syncedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.body = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        brand: 'Toyota',
        model: 'Camry',
        year: 2024,
        color: 'Red',
        price: 60000,
        status: 'SOLD',
      };

      vi.mocked(prisma.vehicle.upsert).mockResolvedValue(mockVehicle);

      await InternalController.syncVehicle(mockRequest as Request, mockResponse as Response, () => {});

      expect(prisma.vehicle.upsert).toHaveBeenCalledWith({
        where: { id: '550e8400-e29b-41d4-a716-446655440000' },
        update: {
          brand: 'Toyota',
          model: 'Camry',
          year: 2024,
          color: 'Red',
          price: new Prisma.Decimal(60000),
          status: VehicleStatus.SOLD,
          syncedAt: expect.any(Date),
        },
        create: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          brand: 'Toyota',
          model: 'Camry',
          year: 2024,
          color: 'Red',
          price: new Prisma.Decimal(60000),
          status: VehicleStatus.SOLD,
          syncedAt: expect.any(Date),
        },
      });

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Vehicle synced successfully',
        vehicle: mockVehicle,
      });
    });

    it('should return 400 on validation error - missing required field', async () => {
      mockRequest.body = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        model: 'Corolla',
        year: 2023,
        color: 'Blue',
        price: 50000,
        status: 'AVAILABLE',
        // brand is missing
      };

      await InternalController.syncVehicle(mockRequest as Request, mockResponse as Response, () => {});

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation error',
          details: expect.any(Object),
        }),
      );
    });

    it('should return 400 on validation error - invalid UUID', async () => {
      mockRequest.body = {
        id: 'invalid-id',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2023,
        color: 'Blue',
        price: 50000,
        status: 'AVAILABLE',
      };

      await InternalController.syncVehicle(mockRequest as Request, mockResponse as Response, () => {});

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation error',
          details: expect.any(Object),
        }),
      );
    });

    it('should return 400 on validation error - invalid status', async () => {
      mockRequest.body = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2023,
        color: 'Blue',
        price: 50000,
        status: 'INVALID_STATUS',
      };

      await InternalController.syncVehicle(mockRequest as Request, mockResponse as Response, () => {});

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation error',
          details: expect.any(Object),
        }),
      );
    });

    it('should return 400 on validation error - negative price', async () => {
      mockRequest.body = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2023,
        color: 'Blue',
        price: -1000,
        status: 'AVAILABLE',
      };

      await InternalController.syncVehicle(mockRequest as Request, mockResponse as Response, () => {});

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation error',
          details: expect.any(Object),
        }),
      );
    });

    it('should return 500 on database error', async () => {
      mockRequest.body = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2023,
        color: 'Blue',
        price: 50000,
        status: 'AVAILABLE',
      };

      vi.mocked(prisma.vehicle.upsert).mockRejectedValue(new Error('Database error'));

      await InternalController.syncVehicle(mockRequest as Request, mockResponse as Response, () => {});

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Internal server error' });
    });

    it('should update syncedAt timestamp on upsert', async () => {
      const mockVehicle = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2023,
        color: 'Blue',
        price: new Prisma.Decimal(50000),
        status: VehicleStatus.AVAILABLE,
        syncedAt: new Date('2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.body = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2023,
        color: 'Blue',
        price: 50000,
        status: 'AVAILABLE',
      };

      vi.mocked(prisma.vehicle.upsert).mockResolvedValue(mockVehicle);

      await InternalController.syncVehicle(mockRequest as Request, mockResponse as Response, () => {});

      const upsertCall = vi.mocked(prisma.vehicle.upsert).mock.calls[0][0];
      expect(upsertCall.update.syncedAt).toBeInstanceOf(Date);
      expect(upsertCall.create.syncedAt).toBeInstanceOf(Date);
    });
  });
});
