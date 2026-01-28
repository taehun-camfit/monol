/**
 * Validation Middleware
 *
 * Express middleware for validating requests using Zod schemas.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

type ValidationTarget = 'body' | 'query' | 'params';

interface ValidationOptions {
  stripUnknown?: boolean;
}

/**
 * Creates a validation middleware for the specified target and schema
 */
export function validate<T>(
  schema: ZodSchema<T>,
  target: ValidationTarget = 'body',
  options: ValidationOptions = {}
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = req[target];
      const result = schema.parse(data);

      // Replace the target with validated/transformed data
      if (target === 'body') {
        req.body = result;
      } else if (target === 'query') {
        req.query = result as Record<string, string | string[]>;
      } else if (target === 'params') {
        req.params = result as Record<string, string>;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = formatZodError(error);
        res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: formattedErrors,
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Validates multiple targets at once
 */
export function validateRequest(schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const errors: Array<{ target: string; errors: Array<{ path: string; message: string }> }> = [];

    for (const [target, schema] of Object.entries(schemas)) {
      if (!schema) continue;

      try {
        const data = req[target as ValidationTarget];
        const result = schema.parse(data);

        // Replace with validated data
        if (target === 'body') {
          req.body = result;
        } else if (target === 'query') {
          req.query = result as Record<string, string | string[]>;
        } else if (target === 'params') {
          req.params = result as Record<string, string>;
        }
      } catch (error) {
        if (error instanceof ZodError) {
          errors.push({
            target,
            errors: formatZodError(error),
          });
        } else {
          throw error;
        }
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors,
      });
      return;
    }

    next();
  };
}

/**
 * Formats Zod errors into a user-friendly format
 */
function formatZodError(error: ZodError): Array<{ path: string; message: string }> {
  return error.errors.map((err) => ({
    path: err.path.join('.'),
    message: err.message,
  }));
}

/**
 * Async validation wrapper for complex validations
 */
export function validateAsync<T>(
  validator: (data: unknown, req: Request) => Promise<T>,
  target: ValidationTarget = 'body'
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req[target];
      const result = await validator(data, req);

      if (target === 'body') {
        req.body = result;
      } else if (target === 'query') {
        req.query = result as Record<string, string | string[]>;
      } else if (target === 'params') {
        req.params = result as Record<string, string>;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = formatZodError(error);
        res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: formattedErrors,
        });
        return;
      }
      // Pass other errors to error handler
      next(error);
    }
  };
}

/**
 * File validation middleware
 */
export function validateFile(options: {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  required?: boolean;
}) {
  const { maxSize = 5 * 1024 * 1024, allowedTypes = [], required = false } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const file = req.file;

    if (!file) {
      if (required) {
        res.status(400).json({
          error: 'File is required',
          code: 'FILE_REQUIRED',
        });
        return;
      }
      next();
      return;
    }

    // Check file size
    if (file.size > maxSize) {
      res.status(400).json({
        error: `File size exceeds maximum allowed size of ${maxSize} bytes`,
        code: 'FILE_TOO_LARGE',
      });
      return;
    }

    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      res.status(400).json({
        error: `File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
        code: 'INVALID_FILE_TYPE',
      });
      return;
    }

    next();
  };
}

/**
 * Sanitize string input
 */
export function sanitizeString(value: string): string {
  return value
    .trim()
    .replace(/[<>]/g, '') // Basic XSS prevention
    .slice(0, 10000); // Prevent extremely long strings
}

/**
 * Validate and sanitize HTML content (for rich text fields)
 */
export function sanitizeHtml(html: string): string {
  // Remove script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}
