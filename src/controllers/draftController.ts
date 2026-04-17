import { Request, Response, NextFunction } from 'express';
import { createDraft, getDraftsForTenant } from '../services/draftService.js';

export async function createDraftController(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, content, excerpt, intro, body, conclusion } = req.body;

    if (!title || !content || !excerpt) {
      return res.status(400).json({ error: 'title, content, and excerpt are required' });
    }

    const draft = await createDraft({
      title,
      content,
      excerpt,
      intro,
      body,
      conclusion,
      status: 'draft',
    });

    res.status(201).json({ success: true, draft });
  } catch (error) {
    next(error);
  }
}

export async function getDraftsController(req: Request, res: Response, next: NextFunction) {
  try {
    const drafts = await getDraftsForTenant();
    res.status(200).json({ success: true, drafts });
  } catch (error) {
    next(error);
  }
}
