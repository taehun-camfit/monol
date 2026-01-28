/**
 * Security Middleware
 *
 * Provides comprehensive security measures for the API:
 * - Input validation and sanitization
 * - Security headers
 * - Request logging
 * - Attack detection
 */

import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Security headers middleware using Helmet
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

// Rate limiting configurations
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health check
    return req.path === '/api/health';
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login attempts per windowMs
  message: {
    error: 'Too many login attempts, please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const strictRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Very strict - 5 requests per minute
  message: {
    error: 'Rate limit exceeded for this action.',
    code: 'STRICT_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Input sanitization patterns
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/gi,
  /(--|\/\*|\*\/|;)/g,
  /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/gi,
];

const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
];

const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//g,
  /\.\.\\/,
  /%2e%2e%2f/gi,
  /%252e%252e%252f/gi,
];

/**
 * Checks for potential SQL injection attempts
 */
function detectSqlInjection(value: string): boolean {
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Checks for potential XSS attempts
 */
function detectXss(value: string): boolean {
  return XSS_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Checks for path traversal attempts
 */
function detectPathTraversal(value: string): boolean {
  return PATH_TRAVERSAL_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Recursively sanitizes an object's string values
 */
function sanitizeObject(obj: unknown, path: string = ''): { sanitized: unknown; threats: string[] } {
  const threats: string[] = [];

  if (typeof obj === 'string') {
    if (detectSqlInjection(obj)) {
      threats.push(`SQL injection attempt detected at ${path}`);
    }
    if (detectXss(obj)) {
      threats.push(`XSS attempt detected at ${path}`);
    }
    if (detectPathTraversal(obj)) {
      threats.push(`Path traversal attempt detected at ${path}`);
    }
    return { sanitized: obj, threats };
  }

  if (Array.isArray(obj)) {
    const result: unknown[] = [];
    obj.forEach((item, index) => {
      const { sanitized, threats: itemThreats } = sanitizeObject(item, `${path}[${index}]`);
      result.push(sanitized);
      threats.push(...itemThreats);
    });
    return { sanitized: result, threats };
  }

  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const { sanitized, threats: valueThreats } = sanitizeObject(value, path ? `${path}.${key}` : key);
      result[key] = sanitized;
      threats.push(...valueThreats);
    }
    return { sanitized: result, threats };
  }

  return { sanitized: obj, threats };
}

/**
 * Request validation and sanitization middleware
 */
export function inputValidation(req: Request, res: Response, next: NextFunction): void {
  const threats: string[] = [];

  // Check body
  if (req.body) {
    const { threats: bodyThreats } = sanitizeObject(req.body, 'body');
    threats.push(...bodyThreats);
  }

  // Check query params
  if (req.query) {
    const { threats: queryThreats } = sanitizeObject(req.query, 'query');
    threats.push(...queryThreats);
  }

  // Check URL params
  if (req.params) {
    const { threats: paramThreats } = sanitizeObject(req.params, 'params');
    threats.push(...paramThreats);
  }

  // If threats detected, log and reject
  if (threats.length > 0) {
    console.warn('[Security] Threats detected:', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      threats,
      timestamp: new Date().toISOString(),
    });

    res.status(400).json({
      error: 'Invalid request',
      code: 'INVALID_INPUT',
    });
    return;
  }

  next();
}

/**
 * Request logging middleware for security audit
 */
export function securityLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Log request
  const requestLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    referer: req.get('referer'),
    contentLength: req.get('content-length'),
  };

  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const responseLog = {
      ...requestLog,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    };

    // Log warnings for suspicious activity
    if (res.statusCode === 401 || res.statusCode === 403) {
      console.warn('[Security] Auth failure:', responseLog);
    } else if (res.statusCode === 429) {
      console.warn('[Security] Rate limit hit:', responseLog);
    } else if (res.statusCode >= 500) {
      console.error('[Security] Server error:', responseLog);
    }
  });

  next();
}

/**
 * CORS configuration
 */
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      console.warn('[Security] CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
  maxAge: 86400, // 24 hours
};

/**
 * Prevent parameter pollution
 */
export function preventParameterPollution(req: Request, res: Response, next: NextFunction): void {
  // For query params, if array is received, take the last value
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (Array.isArray(value)) {
        req.query[key] = value[value.length - 1];
      }
    }
  }
  next();
}

/**
 * Content type validation
 */
export function validateContentType(req: Request, res: Response, next: NextFunction): void {
  // Only check for requests with body
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('content-type');

    if (contentType && !contentType.includes('application/json') && !contentType.includes('multipart/form-data')) {
      res.status(415).json({
        error: 'Unsupported Media Type',
        code: 'UNSUPPORTED_CONTENT_TYPE',
      });
      return;
    }
  }
  next();
}

/**
 * Request size limiter
 */
export function requestSizeLimit(maxSize: string = '10mb') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('content-length') || '0', 10);
    const maxBytes = parseSize(maxSize);

    if (contentLength > maxBytes) {
      res.status(413).json({
        error: 'Request entity too large',
        code: 'PAYLOAD_TOO_LARGE',
      });
      return;
    }
    next();
  };
}

function parseSize(size: string): number {
  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const match = size.toLowerCase().match(/^(\d+)(b|kb|mb|gb)?$/);
  if (!match) return 10 * 1024 * 1024; // Default 10MB

  const num = parseInt(match[1], 10);
  const unit = match[2] || 'b';

  return num * units[unit];
}
