/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, expect, it } from 'vitest';
import { paymentWebhookSchema, purchaseSchema } from './purchase.schema';

describe('Purchase Schema', () => {
  describe('purchaseSchema', () => {
    const validPurchase = {
      vehicleId: '550e8400-e29b-41d4-a716-446655440000',
      buyerCpf: '12345678901',
      saleDate: new Date('2024-01-15'),
    };

    it('should validate a valid purchase', () => {
      const result = purchaseSchema.safeParse(validPurchase);
      expect(result.success).toBe(true);
    });

    it('should coerce string dates to Date objects', () => {
      const purchaseWithStringDate = {
        ...validPurchase,
        saleDate: '2024-01-15T10:00:00.000Z',
      };
      const result = purchaseSchema.safeParse(purchaseWithStringDate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.saleDate).toBeInstanceOf(Date);
      }
    });

    it('should accept salesDate field name (alternative to saleDate)', () => {
      const purchaseWithSalesDate = {
        vehicleId: '550e8400-e29b-41d4-a716-446655440000',
        buyerCpf: '12345678901',
        salesDate: '2024-01-15',
      };
      const result = purchaseSchema.safeParse(purchaseWithSalesDate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.saleDate).toBeInstanceOf(Date);
      }
    });

    it('should accept YYYY-MM-DD date format', () => {
      const purchaseWithSimpleDate = {
        vehicleId: '550e8400-e29b-41d4-a716-446655440000',
        buyerCpf: '12345678901',
        salesDate: '2025-12-01',
      };
      const result = purchaseSchema.safeParse(purchaseWithSimpleDate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.saleDate).toBeInstanceOf(Date);
      }
    });

    it('should reject invalid vehicle ID format', () => {
      const invalidPurchase = { ...validPurchase, vehicleId: 'invalid-id' };
      const result = purchaseSchema.safeParse(invalidPurchase);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid vehicle ID format');
      }
    });

    it('should reject CPF with less than 11 characters', () => {
      const invalidPurchase = { ...validPurchase, buyerCpf: '1234567890' };
      const result = purchaseSchema.safeParse(invalidPurchase);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('CPF must have at least 11 characters');
      }
    });

    it('should reject CPF with more than 14 characters', () => {
      const invalidPurchase = { ...validPurchase, buyerCpf: '123456789012345' };
      const result = purchaseSchema.safeParse(invalidPurchase);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('CPF must have at most 14 characters');
      }
    });

    it('should accept CPF with 14 characters (formatted)', () => {
      const purchaseWithFormattedCpf = { ...validPurchase, buyerCpf: '123.456.789-01' };
      const result = purchaseSchema.safeParse(purchaseWithFormattedCpf);
      expect(result.success).toBe(true);
    });

    it('should reject missing vehicleId', () => {
      const { vehicleId, ...invalidPurchase } = validPurchase;
      const result = purchaseSchema.safeParse(invalidPurchase);
      expect(result.success).toBe(false);
    });

    it('should reject missing buyerCpf', () => {
      const { buyerCpf, ...invalidPurchase } = validPurchase;
      const result = purchaseSchema.safeParse(invalidPurchase);
      expect(result.success).toBe(false);
    });

    it('should reject missing saleDate', () => {
      const { saleDate, ...invalidPurchase } = validPurchase;
      const result = purchaseSchema.safeParse(invalidPurchase);
      expect(result.success).toBe(false);
    });
  });

  describe('paymentWebhookSchema', () => {
    it('should validate confirmed status', () => {
      const result = paymentWebhookSchema.safeParse({
        paymentCode: 'PAY-123456',
        status: 'confirmed',
      });
      expect(result.success).toBe(true);
    });

    it('should validate cancelled status', () => {
      const result = paymentWebhookSchema.safeParse({
        paymentCode: 'PAY-123456',
        status: 'cancelled',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = paymentWebhookSchema.safeParse({
        paymentCode: 'PAY-123456',
        status: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty payment code', () => {
      const result = paymentWebhookSchema.safeParse({
        paymentCode: '',
        status: 'confirmed',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Payment code is required');
      }
    });

    it('should reject missing payment code', () => {
      const result = paymentWebhookSchema.safeParse({
        status: 'confirmed',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing status', () => {
      const result = paymentWebhookSchema.safeParse({
        paymentCode: 'PAY-123456',
      });
      expect(result.success).toBe(false);
    });
  });
});
