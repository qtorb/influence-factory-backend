import prisma from '../config/prisma.js';

export async function createDraft(data: {
  tenantId?: string;
  projectId?: string;
  title: string;
  content: string;
  excerpt: string;
  intro?: string;
  body?: string;
  conclusion?: string;
  status?: 'draft' | 'published';
  authoritySignals?: any; // NEW: Almacena metadatos multidimensionales
}) {
  return prisma.post.create({
    data: {
      tenantId: data.tenantId ?? 'admin',
      projectId: data.projectId ?? 'default',
      title: data.title,
      content: data.content,
      excerpt: data.excerpt,
      intro: data.intro,
      body: data.body,
      conclusion: data.conclusion,
      status: data.status ?? 'draft',
      authoritySignals: data.authoritySignals,
    },
  });
}

export async function getDraftsForTenant(tenantId?: string) {
  return prisma.post.findMany({
    where: {
      tenantId: tenantId ?? 'admin',
      status: 'draft',
    },
    orderBy: { updatedAt: 'desc' },
  });
}
