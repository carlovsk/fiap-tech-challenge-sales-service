import axios, { AxiosError } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('axios');

vi.mock('@/utils/logger', () => ({
  logger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

vi.mock('@/utils/env', () => ({
  env: {
    MANAGEMENT_SERVICE_URL: 'http://localhost:3001',
  },
}));

import { ManagementServiceSync } from './managementServiceSync';

describe('ManagementServiceSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('notifySale', () => {
    it('should send sale notification to management service', async () => {
      vi.mocked(axios.post).mockResolvedValue({ status: 200 });

      const vehicleId = '550e8400-e29b-41d4-a716-446655440000';
      const saleDate = new Date('2024-01-15T10:00:00.000Z');
      const data = {
        buyerCpf: '12345678901',
        saleDate,
      };

      ManagementServiceSync.notifySale(vehicleId, data);

      // Wait for the async operation to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(axios.post).toHaveBeenCalledWith(
        `http://localhost:3001/api/vehicles/${vehicleId}/sell`,
        {
          buyerCpf: '12345678901',
          saleDate: saleDate.toISOString(),
        },
        {
          timeout: 5000,
        },
      );
    });

    it('should not throw on axios error (fire-and-forget)', async () => {
      const axiosError = new Error('Network error') as AxiosError;
      axiosError.isAxiosError = true;
      axiosError.response = {
        status: 500,
        statusText: 'Internal Server Error',
        data: {},
        headers: {},
        config: {} as any,
      };

      vi.mocked(axios.post).mockRejectedValue(axiosError);
      vi.mocked(axios.isAxiosError).mockReturnValue(true);

      const vehicleId = '550e8400-e29b-41d4-a716-446655440000';
      const data = {
        buyerCpf: '12345678901',
        saleDate: new Date('2024-01-15'),
      };

      // Should not throw
      expect(() => ManagementServiceSync.notifySale(vehicleId, data)).not.toThrow();

      // Wait for the async operation to complete
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    it('should not throw on non-axios error (fire-and-forget)', async () => {
      const genericError = new Error('Unknown error');

      vi.mocked(axios.post).mockRejectedValue(genericError);
      vi.mocked(axios.isAxiosError).mockReturnValue(false);

      const vehicleId = '550e8400-e29b-41d4-a716-446655440000';
      const data = {
        buyerCpf: '12345678901',
        saleDate: new Date('2024-01-15'),
      };

      // Should not throw
      expect(() => ManagementServiceSync.notifySale(vehicleId, data)).not.toThrow();

      // Wait for the async operation to complete
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  });
});
