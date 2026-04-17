/**
 * Validadores de fuentes y URLs
 * Funcionalidad que reemplaza CORS-Anywhere en el frontend
 */

import prisma from './config/prisma.js';

export interface ValidatedSource {
  url: string;
  status: number;
  contentType: string;
  accessible: boolean;
  classification: string; // Cambiado de union type a string dinámico
  domain: string;
  title?: string;
  error?: string;
}

/**
 * Validar una URL y obtener información sobre la fuente
 */
export async function validateSource(url: string, projectId: string): Promise<ValidatedSource> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    // Validar que la URL sea válida
    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    // Hacer la solicitud con timeout
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Influence-Factory/1.0 (+https://influence-factory.app)',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const status = response.status;
    const contentType = response.headers.get('content-type') || '';
    const accessible = status >= 200 && status < 400;

    // Clasificar la fuente basado en dominio y Content-Type
    const classification = await classifySource(domain, url, contentType, projectId);

    return {
      url,
      status,
      contentType,
      accessible,
      classification,
      domain,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    return {
      url,
      status: 0,
      contentType: '',
      accessible: false,
      classification: 'unknown',
      domain: extractDomain(url),
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Validar múltiples URLs en paralelo
 */
export async function validateSources(urls: string[], projectId: string): Promise<ValidatedSource[]> {
  // Limitar concurrencia a 5 solicitudes simultáneas
  const results: ValidatedSource[] = [];
  const batchSize = 5;

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(url => validateSource(url, projectId)));
    results.push(...batchResults);
  }

  return results;
}

/**
 * Clasificar una fuente basado en dominio y características, cargando reglas dinámicamente desde DB
 */
async function classifySource(domain: string, url: string, contentType: string, projectId: string): Promise<string> {
  // Cargar categorías del proyecto desde DB
  const categories = await prisma.category.findMany({
    where: { projectId },
  });

  // Verificar cada categoría
  for (const category of categories) {
    const rules = category.rules as {
      domains?: string[];
      keywords?: string[];
      contentTypes?: string[];
    };

    // Verificar domains
    if (rules.domains && rules.domains.some(d => domain.includes(d))) {
      return category.name;
    }

    // Verificar keywords en URL
    if (rules.keywords && rules.keywords.some(k => url.toLowerCase().includes(k.toLowerCase()))) {
      return category.name;
    }

    // Verificar contentTypes
    if (rules.contentTypes && rules.contentTypes.some(ct => contentType.includes(ct))) {
      return category.name;
    }
  }

  // Default
  return 'unknown';
}

/**
 * Extraer dominio de una URL
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Validar si una URL es accesible y apropiada
 */
export function isValidSourceUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    // Excluir localhost y IPs privadas
    const hostname = urlObj.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1') return false;
    if (hostname.startsWith('192.168.') || hostname.startsWith('10.')) return false;
    if (hostname.startsWith('172.')) return false;
    return true;
  } catch {
    return false;
  }
}
