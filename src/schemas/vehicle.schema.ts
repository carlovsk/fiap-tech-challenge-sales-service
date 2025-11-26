import { z } from 'zod';

const currentYear = new Date().getFullYear();

export const vehicleStatusSchema = z.enum(['AVAILABLE', 'SOLD']);

export const syncVehicleSchema = z.object({
  id: z.string().uuid('Invalid vehicle ID format'),
  brand: z.string().min(1, 'Brand is required'),
  model: z.string().min(1, 'Model is required'),
  year: z
    .number()
    .int()
    .min(1900)
    .max(currentYear + 1, `Year must be between 1900 and ${currentYear + 1}`),
  color: z.string().min(1, 'Color is required'),
  price: z.number().positive('Price must be positive'),
  status: vehicleStatusSchema,
});

export type SyncVehicleInput = z.infer<typeof syncVehicleSchema>;
