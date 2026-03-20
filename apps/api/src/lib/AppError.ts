export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly metadata?: Record<string, unknown>;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', metadata?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    if (metadata) {
      this.metadata = metadata;
    }
    
    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
