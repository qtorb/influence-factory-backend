import { Request, Response, NextFunction } from 'express';
import { generatePost } from '../services/generateService.js';
import { getDefaultNicheProfile } from '../services/nicheService.js';

/**
 * Controller para generar contenido multidimensional
 * Retorna un activo atomizado optimizado para humanos y LLMs
 */
export async function generatePostController(req: Request, res: Response, next: NextFunction) {
  console.log('🔥 CONTROLLER: Received generate request for topic:', req.body.topic);
  try {
    const { topic, sources, validatedSources, keywords, style, authorityStrategy, projectId } = req.body;

    // Validación de entrada
    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'topic is required and must be a non-empty string',
      });
    }

    // Resolver projectId
    let finalProjectId = projectId;
    if (!finalProjectId) {
      try {
        const defaultProfile = await getDefaultNicheProfile();
        finalProjectId = defaultProfile.id;
      } catch (error) {
        console.error('Failed to load default niche profile:', error);
        return res.status(500).json({
          success: false,
          error: 'Default niche profile not configured. Please set up a default project in the database.',
        });
      }
    }

    // Generar contenido multidimensional
    const result = await generatePost({
      topic: topic.trim(),
      sources: Array.isArray(sources) ? sources.map(String) : [],
      validatedSources: Array.isArray(validatedSources) ? validatedSources : [],
      keywords: Array.isArray(keywords) ? keywords.map(String) : [],
      style: style ?? 'persuasive',
      authorityStrategy: authorityStrategy ?? 'data-driven',
      projectId: finalProjectId,
    });

    // Responder con activo multidimensional completo
    return res.json({
      success: true,
      message: 'Multidimensional content asset generated successfully',
      draftId: result.draftId,
      asset: result.multidimensionalAsset,
      // Convenience props para el frontend
      article: result.multidimensionalAsset.article,
      socialKit: result.multidimensionalAsset.socialKit,
      metadata: result.multidimensionalAsset.metadataGEO,
    });
  } catch (error) {
    console.error('❌ Generate controller error:', error);

    // Manejo de errores específicos
    if ((error as any).message?.includes('Niche profile')) {
      return res.status(404).json({
        success: false,
        error: (error as any).message,
      });
    }

    if ((error as any).message?.includes('Claude API')) {
      return res.status(503).json({
        success: false,
        error: 'Claude API is temporarily unavailable. Please try again.',
        detail: (error as any).message,
      });
    }

    if ((error as any).message?.includes('Failed to parse')) {
      return res.status(422).json({
        success: false,
        error: 'Generated content could not be parsed. The AI response was malformed.',
        detail: (error as any).message,
      });
    }

    // Error genérico
    return res.status(500).json({
      success: false,
      error: 'Failed to generate content',
      detail: (error as Error).message || String(error),
    });
  }
}
