import { Request, Response, NextFunction } from 'express';
import { publishPostToWordPress } from '../services/wordpressService.js';
import { PublishRequestBody } from '../types/index.js';

export async function publishToWordPress(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as PublishRequestBody;

    if (!body.title || !body.content) {
      return res.status(400).json({ error: 'title and content are required' });
    }

    const result = await publishPostToWordPress({
      postId: Math.random().toString(36).slice(2),
      title: body.title,
      content: body.content,
      excerpt: body.excerpt,
      status: body.status ?? 'draft',
    });

    return res.status(200).json({ success: true, payload: result });
  } catch (error) {
    next(error);
  }
}
