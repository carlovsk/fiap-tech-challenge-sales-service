import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('env', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Clear module cache to re-import with new env vars
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  it('should parse valid environment variables', async () => {
    process.env = {
      ...originalEnv,
      PORT: '3000',
      NODE_ENV: 'development',
      MANAGEMENT_SERVICE_URL: 'http://localhost:3001',
    };

    const { env } = await import('./env.ts');

    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.MANAGEMENT_SERVICE_URL).toBe('http://localhost:3001');
  });

  it('should default NODE_ENV to development when not provided', async () => {
    process.env = {
      ...originalEnv,
      PORT: '3000',
      MANAGEMENT_SERVICE_URL: 'http://localhost:3001',
    };
    delete process.env.NODE_ENV;

    const { env } = await import('./env.ts');

    expect(env.NODE_ENV).toBe('development');
  });

  it('should coerce PORT string to number', async () => {
    process.env = {
      ...originalEnv,
      PORT: '8080',
      NODE_ENV: 'test',
      MANAGEMENT_SERVICE_URL: 'http://localhost:3001',
    };

    const { env } = await import('./env.ts');

    expect(env.PORT).toBe(8080);
    expect(typeof env.PORT).toBe('number');
  });

  it('should throw error when PORT is missing or invalid', async () => {
    // Test with undefined (simulated by not setting PORT after reset)
    // Note: test-setup.ts sets PORT, so we test with an invalid value instead
    // which covers the validation logic
    const originalPort = process.env.PORT;
    process.env.PORT = undefined as any;

    await expect(async () => {
      vi.resetModules();
      await import('./env.ts');
    }).rejects.toThrow();

    // Restore env
    process.env.PORT = originalPort;
  });

  it('should throw error when PORT is invalid', async () => {
    process.env = {
      ...originalEnv,
      PORT: 'invalid',
      NODE_ENV: 'test',
      MANAGEMENT_SERVICE_URL: 'http://localhost:3001',
    };

    await expect(async () => {
      await import('./env.ts');
    }).rejects.toThrow();
  });

  it('should handle different NODE_ENV values', async () => {
    const environments = ['development', 'production', 'test', 'staging'];

    for (const envValue of environments) {
      process.env = {
        ...originalEnv,
        PORT: '3000',
        NODE_ENV: envValue,
        MANAGEMENT_SERVICE_URL: 'http://localhost:3001',
      };

      vi.resetModules();
      const { env } = await import('./env.ts');
      expect(env.NODE_ENV).toBe(envValue);
    }
  });

  it('should throw error when MANAGEMENT_SERVICE_URL is invalid', async () => {
    process.env = {
      ...originalEnv,
      PORT: '3000',
      NODE_ENV: 'test',
      MANAGEMENT_SERVICE_URL: 'invalid-url',
    };

    await expect(async () => {
      await import('./env.ts');
    }).rejects.toThrow();
  });
});
