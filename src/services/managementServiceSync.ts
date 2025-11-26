import { env } from '@/utils/env';
import { logger } from '@/utils/logger';
import axios, { AxiosError } from 'axios';

const syncLogger = logger('services:managementServiceSync');

interface SaleNotificationData {
  buyerCpf: string;
  saleDate: Date;
}

export class ManagementServiceSync {
  private static managementServiceUrl = env.MANAGEMENT_SERVICE_URL;

  /**
   * Fire-and-forget notification to management service about a sale.
   * Does not block and logs errors without throwing.
   */
  static notifySale(vehicleId: string, data: SaleNotificationData): void {
    // Fire-and-forget: don't await
    ManagementServiceSync.sendSaleNotification(vehicleId, data);
  }

  private static async sendSaleNotification(vehicleId: string, data: SaleNotificationData): Promise<void> {
    try {
      await axios.post(
        `${ManagementServiceSync.managementServiceUrl}/api/vehicles/${vehicleId}/sell`,
        {
          buyerCpf: data.buyerCpf,
          saleDate: data.saleDate.toISOString(),
        },
        {
          timeout: 5000,
        },
      );

      syncLogger.info(`Sale notification sent successfully for vehicle: ${vehicleId}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        syncLogger.error(`Failed to notify management service about sale for vehicle ${vehicleId}`, {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          message: axiosError.message,
        });
      } else {
        syncLogger.error(`Failed to notify management service about sale for vehicle ${vehicleId}`, error);
      }
      // Don't throw - fire-and-forget pattern
    }
  }
}
