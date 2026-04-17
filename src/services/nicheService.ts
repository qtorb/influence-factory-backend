import prisma from '../config/prisma.js';

export interface NicheProfile {
  id: string;
  name: string;
  authorityPersona?: string;
  promptBase?: string;
  categories: {
    name: string;
    rules: any;
  }[];
}

/**
 * Cargar el perfil de nicho por defecto (RosmarOps)
 */
export async function getDefaultNicheProfile(): Promise<NicheProfile> {
  // Buscar proyecto por nombre o id hardcodeado temporalmente
  const project = await prisma.project.findFirst({
    where: {
      name: 'RosmarOps', // Cambiar por el nombre real
    },
    include: {
      categories: true,
    },
  });

  if (!project) {
    throw new Error('Default niche profile not found. Please configure a project named "RosmarOps" in the database.');
  }

  return {
    id: project.id,
    name: project.name,
    authorityPersona: project.authorityPersona,
    promptBase: project.promptBase,
    categories: project.categories.map(cat => ({
      name: cat.name,
      rules: cat.rules,
    })),
  };
}

/**
 * Cargar perfil de nicho por ID
 */
export async function getNicheProfileById(projectId: string): Promise<NicheProfile> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      categories: true,
    },
  });

  if (!project) {
    throw new Error(`Niche profile with id ${projectId} not found.`);
  }

  return {
    id: project.id,
    name: project.name,
    authorityPersona: project.authorityPersona,
    promptBase: project.promptBase,
    categories: project.categories.map(cat => ({
      name: cat.name,
      rules: cat.rules,
    })),
  };
}