/**
 * Validadores de fuentes y URLs
 * Funcionalidad que reemplaza CORS-Anywhere en el frontend
 */

export interface ValidatedSource {
  url: string;
  status: number;
  contentType: string;
  accessible: boolean;
  classification: 'paper' | 'research_article' | 'official_source' | 'blog' | 'unknown';
  domain: string;
  title?: string;
  error?: string;
}

/**
 * Validar una URL y obtener información sobre la fuente
 */
export async function validateSource(url: string): Promise<ValidatedSource> {
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
    const classification = classifySource(domain, url, contentType);

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
export async function validateSources(urls: string[]): Promise<ValidatedSource[]> {
  // Limitar concurrencia a 5 solicitudes simultáneas
  const results: ValidatedSource[] = [];
  const batchSize = 5;

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(url => validateSource(url)));
    results.push(...batchResults);
  }

  return results;
}

/**
 * Clasificar una fuente basado en dominio y características
 */
function classifySource(domain: string, url: string, contentType: string): ValidatedSource['classification'] {
  // Dominios académicos/research
  const researchDomains = [
    'arxiv.org',
    'doi.org',
    'scholar.google.com',
    'researchgate.net',
    'academia.edu',
    'pubmed.ncbi.nlm.nih.gov',
    'jstor.org',
    'ieee.org',
    'acm.org',
  ];

  // Dominios de autoridad oficial
  const officialDomains = [
    'gov',
    'edu',
    'org',
    '.ac.',
    'wikipedia.org',
    'britannica.com',
  ];

  // Papers indicators en URL
  if (url.toLowerCase().includes('pdf') || url.toLowerCase().includes('paper')) {
    return 'paper';
  }

  // Research domains
  if (researchDomains.some(d => domain.includes(d))) {
    return 'research_article';
  }

  // Official sources
  if (officialDomains.some(d => domain.includes(d))) {
    return 'official_source';
  }

  // Blog/article sites
  if (domain.includes('blog') || domain.includes('medium.com') || domain.includes('substack.com')) {
    return 'blog';
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
