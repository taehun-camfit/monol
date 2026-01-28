/**
 * Error Handling Middleware
 */

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';

// ============================================================================
// Error Classes
// ============================================================================

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request') {
    super(message, 400, 'BAD_REQUEST');
    this.name = 'BadRequestError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

export class InternalError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, 'INTERNAL_ERROR');
    this.name = 'InternalError';
  }
}

export class ValidationError extends AppError {
  readonly errors: Array<{ field: string; message: string }>;

  constructor(errors: Array<{ field: string; message: string }>) {
    super('Validation failed', 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

// ============================================================================
// Error Response Format
// ============================================================================

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    errors?: Array<{ field: string; message: string }>;
  };
}

// ============================================================================
// Error Handlers
// ============================================================================

/**
 * 404 Not Found Handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}

/**
 * Global Error Handler
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error
  if (err instanceof AppError && err.isOperational) {
    logger.warn({ err, path: req.path, method: req.method }, 'Operational error');
  } else {
    logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    const response: ErrorResponse = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors,
      },
    };

    res.status(400).json(response);
    return;
  }

  // Custom validation errors
  if (err instanceof ValidationError) {
    const response: ErrorResponse = {
      error: {
        code: err.code,
        message: err.message,
        errors: err.errors,
      },
    };

    res.status(err.statusCode).json(response);
    return;
  }

  // App errors
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      error: {
        code: err.code,
        message: err.message,
      },
    };

    res.status(err.statusCode).json(response);
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const response: ErrorResponse = {
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid token',
      },
    };
    res.status(401).json(response);
    return;
  }

  if (err.name === 'TokenExpiredError') {
    const response: ErrorResponse = {
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Token expired',
      },
    };
    res.status(401).json(response);
    return;
  }

  // Prisma errors
  if (isPrismaError(err)) {
    const { statusCode, code, message } = handlePrismaError(err);
    const response: ErrorResponse = {
      error: {
        code,
        message,
      },
    };
    res.status(statusCode).json(response);
    return;
  }

  // Unknown errors
  const response: ErrorResponse = {
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
    },
  };

  res.status(500).json(response);
}

// ============================================================================
// Prisma Error Handling
// ============================================================================

interface PrismaError {
  code: string;
  meta?: {
    target?: string[];
    cause?: string;
  };
}

function isPrismaError(error: unknown): error is PrismaError {
  return typeof error === 'object' && error !== null && 'code' in error && typeof (error as PrismaError).code === 'string' && (error as PrismaError).code.startsWith('P');
}

function handlePrismaError(error: PrismaError): {
  statusCode: number;
  code: string;
  message: string;
} {
  switch (error.code) {
    case 'P2002':
      return {
        statusCode: 409,
        code: 'UNIQUE_CONSTRAINT_VIOLATION',
        message: `Unique constraint violation${error.meta?.target ? ` on ${error.meta.target.join(', ')}` : ''}`,
      };
    case 'P2025':
      return {
        statusCode: 404,
        code: 'RECORD_NOT_FOUND',
        message: 'Record not found',
      };
    case 'P2003':
      return {
        statusCode: 400,
        code: 'FOREIGN_KEY_VIOLATION',
        message: 'Foreign key constraint violation',
      };
    case 'P2014':
      return {
        statusCode: 400,
        code: 'REQUIRED_RELATION_VIOLATION',
        message: 'Required relation violation',
      };
    default:
      return {
        statusCode: 500,
        code: 'DATABASE_ERROR',
        message: 'Database error occurred',
      };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Async handler wrapper to catch errors in async routes
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default { notFoundHandler, errorHandler, asyncHandler };
