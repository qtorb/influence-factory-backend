import { Request, Response } from 'express';

export function getStatus(_req: Request, res: Response) {
  res.status(200).json({
    success: true,
    service: 'influence-factory-backend',
    status: 'operational',
    timestamp: new Date().toISOString(),
  });
}
