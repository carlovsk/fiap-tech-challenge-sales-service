import { describe, expect, it } from 'vitest';
import { createPaymentSchema, paymentSchema, paymentStatusSchema, updatePaymentSchema } from './payment.schema';

describe('Payment Schema', () => {
  const validPayment = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    saleId: '550e8400-e29b-41d4-a716-446655440001',
    paymentCode: 'PAY-123456',
    status: 'PENDING' as const,
  };

  describe('paymentStatusSchema', () => {
    it('should validate PENDING status', () => {
      const result = paymentStatusSchema.safeParse('PENDING');
      expect(result.success).toBe(true);
    });

    it('should validate CONFIRMED status', () => {
      const result = paymentStatusSchema.safeParse('CONFIRMED');
      expect(result.success).toBe(true);
    });

    it('should validate CANCELLED status', () => {
      const result = paymentStatusSchema.safeParse('CANCELLED');
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = paymentStatusSchema.safeParse('INVALID');
      expect(result.success).toBe(false);
    });
  });

  describe('paymentSchema', () => {
    it('should validate a valid payment', () => {
      const result = paymentSchema.safeParse(validPayment);
      expect(result.success).toBe(true);
    });

    it('should validate a payment with optional fields', () => {
      const paymentWithOptionals = {
        ...validPayment,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = paymentSchema.safeParse(paymentWithOptionals);
      expect(result.success).toBe(true);
    });

    it('should coerce string dates to Date objects', () => {
      const paymentWithStringDate = {
        ...validPayment,
        createdAt: '2024-01-15T10:00:00.000Z',
      };
      const result = paymentSchema.safeParse(paymentWithStringDate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.createdAt).toBeInstanceOf(Date);
      }
    });

    it('should reject invalid payment ID format', () => {
      const invalidPayment = { ...validPayment, id: 'invalid-id' };
      const result = paymentSchema.safeParse(invalidPayment);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid payment ID format');
      }
    });

    it('should reject invalid sale ID format', () => {
      const invalidPayment = { ...validPayment, saleId: 'invalid-id' };
      const result = paymentSchema.safeParse(invalidPayment);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid sale ID format');
      }
    });

    it('should reject empty payment code', () => {
      const invalidPayment = { ...validPayment, paymentCode: '' };
      const result = paymentSchema.safeParse(invalidPayment);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Payment code is required');
      }
    });

    it('should reject invalid status', () => {
      const invalidPayment = { ...validPayment, status: 'INVALID' };
      const result = paymentSchema.safeParse(invalidPayment);
      expect(result.success).toBe(false);
    });

    it('should validate all valid statuses', () => {
      const statuses = ['PENDING', 'CONFIRMED', 'CANCELLED'] as const;
      for (const status of statuses) {
        const payment = { ...validPayment, status };
        const result = paymentSchema.safeParse(payment);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('createPaymentSchema', () => {
    it('should validate a valid create payment input', () => {
      const createInput = {
        saleId: '550e8400-e29b-41d4-a716-446655440001',
        paymentCode: 'PAY-123456',
        status: 'PENDING' as const,
      };
      const result = createPaymentSchema.safeParse(createInput);
      expect(result.success).toBe(true);
    });

    it('should not require id field', () => {
      const createInput = {
        saleId: '550e8400-e29b-41d4-a716-446655440001',
        paymentCode: 'PAY-123456',
        status: 'PENDING' as const,
      };
      const result = createPaymentSchema.safeParse(createInput);
      expect(result.success).toBe(true);
    });

    it('should reject missing saleId', () => {
      const invalidInput = {
        paymentCode: 'PAY-123456',
        status: 'PENDING' as const,
      };
      const result = createPaymentSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject missing paymentCode', () => {
      const invalidInput = {
        saleId: '550e8400-e29b-41d4-a716-446655440001',
        status: 'PENDING' as const,
      };
      const result = createPaymentSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject missing status', () => {
      const invalidInput = {
        saleId: '550e8400-e29b-41d4-a716-446655440001',
        paymentCode: 'PAY-123456',
      };
      const result = createPaymentSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('updatePaymentSchema', () => {
    it('should validate a partial update with status only', () => {
      const updateInput = {
        status: 'CONFIRMED' as const,
      };
      const result = updatePaymentSchema.safeParse(updateInput);
      expect(result.success).toBe(true);
    });

    it('should validate a partial update with paymentCode only', () => {
      const updateInput = {
        paymentCode: 'PAY-654321',
      };
      const result = updatePaymentSchema.safeParse(updateInput);
      expect(result.success).toBe(true);
    });

    it('should validate an empty update', () => {
      const result = updatePaymentSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate a full update', () => {
      const fullUpdate = {
        status: 'CANCELLED' as const,
        paymentCode: 'PAY-NEW-CODE',
      };
      const result = updatePaymentSchema.safeParse(fullUpdate);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status in update', () => {
      const invalidUpdate = {
        status: 'INVALID',
      };
      const result = updatePaymentSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });

    it('should reject empty paymentCode in update', () => {
      const invalidUpdate = {
        paymentCode: '',
      };
      const result = updatePaymentSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });
});
