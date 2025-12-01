import { z } from 'zod';

export const purchaseSchema = z
  .object({
    vehicleId: z.string().uuid('Invalid vehicle ID format'),
    buyerCpf: z.string().min(11, 'CPF must have at least 11 characters').max(14, 'CPF must have at most 14 characters'),
    saleDate: z.coerce.date(),
  })
  .transform((data) => {
    // Accept both saleDate and salesDate, normalize to saleDate
    return {
      vehicleId: data.vehicleId,
      buyerCpf: data.buyerCpf,
      saleDate: data.saleDate,
    };
  })
  .refine((data) => data.saleDate !== undefined, {
    message: 'Either saleDate or salesDate must be provided',
    path: ['saleDate'],
  });

export const paymentWebhookSchema = z.object({
  paymentCode: z.string().min(1, 'Payment code is required'),
  status: z.enum(['confirmed', 'cancelled']),
});

export type PurchaseInput = z.infer<typeof purchaseSchema>;
export type PaymentWebhookInput = z.infer<typeof paymentWebhookSchema>;
