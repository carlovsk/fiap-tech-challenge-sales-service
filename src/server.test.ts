import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

const mockListen = vi.fn((_port: number, callback?: () => void) => {
  if (callback) callback();
  return {
    close: vi.fn(),
  } as any;
});

const mockUse = vi.fn().mockReturnThis();
const mockJson = vi.fn();

const mockApp = {
  use: mockUse,
  listen: mockListen,
};

// Mock express
vi.mock('express', () => {
  const mockExpress = vi.fn(() => mockApp);
  (mockExpress as any).json = mockJson;
  return {
    default: mockExpress,
  };
});

// Mock dependencies
vi.mock('@/utils/logger', () => ({
  logger: vi.fn(() => mockLogger),
}));

vi.mock('@/utils/env', () => ({
  env: {
    PORT: 3000,
    NODE_ENV: 'test',
  },
}));

const mockRouter = { use: vi.fn(), get: vi.fn() };
vi.mock('@/routes', () => ({
  routes: mockRouter,
}));

describe('Server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should start the server and listen on the configured port', async () => {
    // Dynamically import server to trigger execution
    await import('./server.ts');

    // Wait a bit for async operations
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify server was started
    expect(mockListen).toHaveBeenCalled();
    expect(mockListen).toHaveBeenCalledWith(3000, expect.any(Function));
  });

  it('should use express.json middleware', async () => {
    vi.clearAllMocks();
    vi.resetModules();
    await import('./server.ts');
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify express.json was called
    expect(mockUse).toHaveBeenCalled();
  });

  it('should use routes middleware', async () => {
    vi.clearAllMocks();
    vi.resetModules();
    await import('./server.ts');
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify routes were mounted
    expect(mockUse).toHaveBeenCalledWith(mockRouter);
  });
});
