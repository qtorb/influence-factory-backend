import { Request, Response, NextFunction } from 'express';

export function errorHandler(error: any, _req: Request, res: Response, _next: NextFunction) {
  console.error('Unhandled error:', error);

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error?.message : 'An unexpected error occurred',
  });
}
