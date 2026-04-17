import { Request, Response, NextFunction } from 'express';
import { searchTopics } from '../services/themeService.js';

export function getTopics(req: Request, res: Response, next: NextFunction) {
  try {
    const query = String(req.query.q || '');
    const results = searchTopics(query);
    res.status(200).json({ success: true, query, topics: results });
  } catch (error) {
    next(error);
  }
}
