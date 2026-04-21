/**
 * Custom App Error Class based on project standards
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    // Ensure the prototype is set correctly for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Global utility to format errors for display or logging
 */
export function formatError(err: unknown): { message: string, code: string } {
  if (err instanceof AppError) {
    return { message: err.message, code: err.code };
  }
  
  if (err instanceof Error) {
    return { message: err.message, code: 'UNEXPECTED_ERROR' };
  }
  
  return { message: String(err), code: 'UNKNOWN_ERROR' };
}
