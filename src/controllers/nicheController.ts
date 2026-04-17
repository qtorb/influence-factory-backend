import { Request, Response } from 'express';
import { getNicheProfileById, getDefaultNicheProfile } from '../services/nicheService.js';
import prisma from '../config/prisma.js';

/**
 * GET /api/v1/niches
 * Obtener todos los proyectos (niches) disponibles con sus perfiles de autoridad
 */
export async function getNichesController(req: Request, res: Response): Promise<void> {
  try {
    // Por ahora, obtener todos los proyectos sin filtrar por tenant
    // TODO: Implementar autenticación JWT para obtener tenantId del usuario
    const projects = await prisma.project.findMany({
      include: {
        categories: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Transformar a formato NicheProfile
    const niches = projects.map(project => ({
      id: project.id,
      name: project.name,
      authorityPersona: project.authorityPersona || 'Sin definir',
      promptBase: project.promptBase || 'Sin directiva base',
      categories: project.categories.map(cat => ({
        name: cat.name,
        rules: cat.rules,
      })),
    }));

    res.json({
      success: true,
      count: niches.length,
      niches,
    });
  } catch (error) {
    console.error('Error al obtener niches:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
}

/**
 * GET /api/v1/niches/:id
 * Obtener un niche específico por ID
 */
export async function getNicheByIdController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const niche = await getNicheProfileById(id);

    res.json({
      success: true,
      niche,
    });
  } catch (error) {
    console.error('Error al obtener niche por ID:', error);
    res.status(404).json({
      success: false,
      error: error instanceof Error ? error.message : 'Niche not found',
    });
  }
}
