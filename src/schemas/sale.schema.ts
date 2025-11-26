import { z } from 'zod';

export const saleSchema = z.object({
  id: z.string().uuid('Invalid sale ID format'),
  vehicleId: z.string().uuid('Invalid vehicle ID format'),
  buyerCpf: z.string().min(11, 'CPF must have at least 11 characters').max(14, 'CPF must have at most 14 characters'),
  saleDate: z.coerce.date(),
  totalAmount: z.number().positive('Total amount must be positive'),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export const createSaleSchema = saleSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateSaleSchema = createSaleSchema.partial();

export type Sale = z.infer<typeof saleSchema>;
export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type UpdateSaleInput = z.infer<typeof updateSaleSchema>;
