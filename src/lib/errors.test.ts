import { describe, it, expect } from 'vitest';
import { AppError } from './errors';

describe('AppError', () => {
  it('should create an error with custom properties', () => {
    const error = new AppError('Test Message', 404, 'NOT_FOUND');
    expect(error.message).toBe('Test Message');
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.name).toBe('AppError');
    expect(error.isOperational).toBe(true);
  });

  it('should default to 500 and INTERNAL_ERROR', () => {
    const error = new AppError('Generic Error');
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('INTERNAL_ERROR');
  });
});
