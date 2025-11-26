import { describe, expect, it } from 'vitest';
import { createSaleSchema, saleSchema, updateSaleSchema } from './sale.schema';

describe('Sale Schema', () => {
  const validSale = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    vehicleId: '550e8400-e29b-41d4-a716-446655440001',
    buyerCpf: '12345678901',
    saleDate: new Date('2024-01-15'),
    totalAmount: 50000,
  };

  describe('saleSchema', () => {
    it('should validate a valid sale', () => {
      const result = saleSchema.safeParse(validSale);
      expect(result.success).toBe(true);
    });

    it('should validate a sale with optional fields', () => {
      const saleWithOptionals = {
        ...validSale,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = saleSchema.safeParse(saleWithOptionals);
      expect(result.success).toBe(true);
    });

    it('should coerce string dates to Date objects', () => {
      const saleWithStringDate = {
        ...validSale,
        saleDate: '2024-01-15T10:00:00.000Z',
      };
      const result = saleSchema.safeParse(saleWithStringDate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.saleDate).toBeInstanceOf(Date);
      }
    });

    it('should reject invalid sale ID format', () => {
      const invalidSale = { ...validSale, id: 'invalid-id' };
      const result = saleSchema.safeParse(invalidSale);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid sale ID format');
      }
    });

    it('should reject invalid vehicle ID format', () => {
      const invalidSale = { ...validSale, vehicleId: 'invalid-id' };
      const result = saleSchema.safeParse(invalidSale);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid vehicle ID format');
      }
    });

    it('should reject CPF with less than 11 characters', () => {
      const invalidSale = { ...validSale, buyerCpf: '1234567890' };
      const result = saleSchema.safeParse(invalidSale);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('CPF must have at least 11 characters');
      }
    });

    it('should reject CPF with more than 14 characters', () => {
      const invalidSale = { ...validSale, buyerCpf: '123456789012345' };
      const result = saleSchema.safeParse(invalidSale);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('CPF must have at most 14 characters');
      }
    });

    it('should accept CPF with 14 characters (formatted)', () => {
      const saleWithFormattedCpf = { ...validSale, buyerCpf: '123.456.789-01' };
      const result = saleSchema.safeParse(saleWithFormattedCpf);
      expect(result.success).toBe(true);
    });

    it('should reject negative total amount', () => {
      const invalidSale = { ...validSale, totalAmount: -100 };
      const result = saleSchema.safeParse(invalidSale);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Total amount must be positive');
      }
    });

    it('should reject zero total amount', () => {
      const invalidSale = { ...validSale, totalAmount: 0 };
      const result = saleSchema.safeParse(invalidSale);
      expect(result.success).toBe(false);
    });
  });

  describe('createSaleSchema', () => {
    it('should validate a valid create sale input', () => {
      const createInput = {
        vehicleId: '550e8400-e29b-41d4-a716-446655440001',
        buyerCpf: '12345678901',
        saleDate: new Date('2024-01-15'),
        totalAmount: 50000,
      };
      const result = createSaleSchema.safeParse(createInput);
      expect(result.success).toBe(true);
    });

    it('should not require id field', () => {
      const createInput = {
        vehicleId: '550e8400-e29b-41d4-a716-446655440001',
        buyerCpf: '12345678901',
        saleDate: new Date('2024-01-15'),
        totalAmount: 50000,
      };
      const result = createSaleSchema.safeParse(createInput);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const invalidInput = {
        vehicleId: '550e8400-e29b-41d4-a716-446655440001',
      };
      const result = createSaleSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('updateSaleSchema', () => {
    it('should validate a partial update', () => {
      const updateInput = {
        totalAmount: 55000,
      };
      const result = updateSaleSchema.safeParse(updateInput);
      expect(result.success).toBe(true);
    });

    it('should validate an empty update', () => {
      const result = updateSaleSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate a full update', () => {
      const fullUpdate = {
        vehicleId: '550e8400-e29b-41d4-a716-446655440001',
        buyerCpf: '12345678901',
        saleDate: new Date('2024-01-15'),
        totalAmount: 60000,
      };
      const result = updateSaleSchema.safeParse(fullUpdate);
      expect(result.success).toBe(true);
    });

    it('should reject invalid values in partial update', () => {
      const invalidUpdate = {
        totalAmount: -100,
      };
      const result = updateSaleSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });
});
