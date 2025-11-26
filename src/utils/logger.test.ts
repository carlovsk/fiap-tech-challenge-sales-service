import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from './logger';
import { Logger } from 'tslog';

// Mock tslog
vi.mock('tslog', () => ({
  Logger: vi.fn().mockImplementation((config) => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    ...config,
  })),
}));

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a logger instance', () => {
    const log = logger('test');
    
    expect(log).toBeDefined();
    expect(Logger).toHaveBeenCalled();
  });

  it('should create logger with correct name prefix', () => {
    logger('test');
    
    expect(Logger).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'videos:test',
      })
    );
  });

  it('should create logger with different names', () => {
    const names = ['server', 'controller', 'service', 'utils'];
    
    names.forEach((name) => {
      logger(name);
      expect(Logger).toHaveBeenCalledWith(
        expect.objectContaining({
          name: `videos:${name}`,
        })
      );
    });
  });

  it('should return logger instance with logging methods', () => {
    const log = logger('test');
    
    expect(log).toHaveProperty('info');
    expect(log).toHaveProperty('error');
    expect(log).toHaveProperty('warn');
    expect(log).toHaveProperty('debug');
    expect(typeof log.info).toBe('function');
    expect(typeof log.error).toBe('function');
    expect(typeof log.warn).toBe('function');
    expect(typeof log.debug).toBe('function');
  });

  it('should allow chaining logger creation', () => {
    const log1 = logger('test1');
    const log2 = logger('test2');
    
    expect(log1).toBeDefined();
    expect(log2).toBeDefined();
    expect(Logger).toHaveBeenCalledTimes(2);
  });
});


