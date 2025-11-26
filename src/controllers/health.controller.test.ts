import { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HealthController } from './health.controller';

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe('HealthController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockJson = vi.fn().mockReturnThis();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });

    mockRequest = {};
    mockResponse = {
      json: mockJson,
      status: mockStatus,
    } as Partial<Response>;
  });

  it('should return healthy status with service name and timestamp', async () => {
    await HealthController.healthCheck(mockRequest as Request, mockResponse as Response, () => {});

    expect(mockJson).toHaveBeenCalledTimes(1);
    const responseData = mockJson.mock.calls[0][0];

    expect(responseData).toHaveProperty('healthy', true);
    expect(responseData).toHaveProperty('service', 'video');
    expect(responseData).toHaveProperty('timestamp');
    expect(typeof responseData.timestamp).toBe('string');
    expect(() => new Date(responseData.timestamp)).not.toThrow();
  });

  it('should be a static method', () => {
    expect(HealthController.healthCheck).toBeDefined();
    expect(typeof HealthController.healthCheck).toBe('function');
  });

  it('should handle request without throwing errors', async () => {
    await expect(
      HealthController.healthCheck(mockRequest as Request, mockResponse as Response, () => {}),
    ).resolves.not.toThrow();
  });
});
