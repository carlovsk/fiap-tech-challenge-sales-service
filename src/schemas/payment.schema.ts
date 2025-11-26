import { z } from 'zod';

export const paymentStatusSchema = z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']);

export const paymentSchema = z.object({
  id: z.string().uuid('Invalid payment ID format'),
  saleId: z.string().uuid('Invalid sale ID format'),
  paymentCode: z.string().min(1, 'Payment code is required'),
  status: paymentStatusSchema,
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export const createPaymentSchema = paymentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updatePaymentSchema = z.object({
  status: paymentStatusSchema.optional(),
  paymentCode: z.string().min(1, 'Payment code is required').optional(),
});

export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type Payment = z.infer<typeof paymentSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
