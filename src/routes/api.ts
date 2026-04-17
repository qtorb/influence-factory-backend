import { Router } from 'express';
import { getStatus } from '../controllers/healthController.js';
import { getTopics } from '../controllers/topicController.js';
import { validateSources } from '../controllers/sourceController.js';
import { generatePostController } from '../controllers/generateController.js';
import { createDraftController, getDraftsController } from '../controllers/draftController.js';
import { publishToWordPress } from '../controllers/wordpressController.js';
import { getNichesController, getNicheByIdController } from '../controllers/nicheController.js';

const router = Router();

// Health check endpoint - no database dependency
router.get('/health', getStatus);
router.get('/status', getStatus);
router.get('/topics', getTopics);
router.get('/niches', getNichesController);
router.get('/niches/:id', getNicheByIdController);
router.post('/validate-sources', validateSources);
router.post('/generate', generatePostController);
router.post('/drafts', createDraftController);
router.get('/drafts', getDraftsController);
router.post('/publish', publishToWordPress);

export default router;
