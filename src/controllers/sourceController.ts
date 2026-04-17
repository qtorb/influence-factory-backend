import { Request, Response, NextFunction } from 'express';
import { validateSourceBatch } from '../services/sourceValidationService.js';
import { getDefaultNicheProfile } from '../services/nicheService.js';

export async function validateSources(req: Request, res: Response, next: NextFunction) {
  try {
    const urls = Array.isArray(req.body.urls) ? req.body.urls.map(String) : [];
    let projectId = req.body.projectId;

    if (!projectId) {
      const defaultProfile = await getDefaultNicheProfile();
      projectId = defaultProfile.id;
    }

    if (urls.length === 0) {
      return res.status(400).json({ error: 'urls array is required' });
    }

    const validated = await validateSourceBatch(urls, projectId);
    res.status(200).json({ success: true, sources: validated });
  } catch (error) {
    next(error);
  }
}
