/**
 * Content Generation Module
 * Centraliza la lógica de Claude para generar y parsear contenido
 * Reemplaza las funciones del frontend para proteger IP y API keys
 *
 * MEJORAS IMPLEMENTADAS:
 * - Anclaje de Citaciones: Las fuentes validadas se vinculan automáticamente a metadatos
 * - Optimización RAG: Estructura H2/H3 optimizada para sistemas de recuperación
 */

export interface ValidatedSource {
  url: string;
  classification: string;
  accessible: boolean;
  statusCode?: number;
}

export interface ContentGenerationRequest {
  topic: string;
  sources?: string[];
  validatedSources?: ValidatedSource[];  // NEW: Fuentes ya validadas con metadatos
  authorityStrategy?: string;
  keywords?: string[];
  style?: 'formal' | 'conversational' | 'persuasive';
}

export interface ParsedPost {
  title: string;
  metaDescription: string;
  body: string;
  tags: string[];
  imagePrompt: string;
  sections: {
    intro: string;
    body: string;
    conclusion: string;
  };
}

// NEW: JSON-LD Metadata structure para SEO/LLM indexing
export interface JSONLDMetadata {
  '@context': string;
  '@type': string;
  headline: string;
  description: string;
  keywords: string[];
  citation: string[];  // URLs de fuentes validadas
  author?: {
    '@type': string;
    name: string;
  };
  datePublished?: string;
  dateModified?: string;
  articleBody?: string;
}

export interface GeneratedContent {
  title: string;
  content: string;
  excerpt: string;
  intro: string;
  body: string;
  conclusion: string;
  parsed: ParsedPost;
  tokens_used?: number;
}

/**
 * Construir el prompt del sistema para Claude
 * Encapsula la estrategia de prompting + RAG Optimization
 *
 * RAG OPTIMIZATION: Se fuerza estructura H2/H3 con densidad semántica
 * para que sistemas RAG (Retrieval-Augmented Generation) indexen correctamente
 */
export function buildPostSystemPrompt(strategy: string = 'data-driven'): string {
  return `You are an expert content strategist and SEO specialist creating compelling, data-driven blog posts optimized for AI indexing. Your role is to:

1. **Authority Injection**: Build credibility by referencing authoritative sources and research
2. **Structure Excellence**: Create posts with CLEAR H2 main sections and H3 subsections for RAG compatibility
3. **Semantic Density**: After each H2, include 2-3 sentences with high keyword density for AI scrapers
4. **SEO Optimization**: Naturally incorporate keywords while maintaining readability
5. **RAG-Friendly Format**: Ensure structure can be easily parsed by Retrieval-Augmented Generation systems
6. **Engagement**: Write compelling introductions and conclusions that drive action
7. **Compliance**: Follow all formatting rules precisely

## Output Format Rules:
- Title: Maximum 68 characters, compelling and clear
- Meta Description: Maximum 155 characters, includes call-to-action
- Body: 650-920 words, formatted in Markdown with:
  * EXACTLY 3-4 H2 sections (main topics)
  * Each H2 followed by 2-3 introductory sentences with keywords
  * 1-2 H3 subsections per H2
  * Paragraph density: 100-150 words per section
- Tags: 4-6 lowercase, relevant tags separated by commas
- Image Prompt: One-line English description for ${strategy === 'visual-heavy' ? 'DALL-E' : 'image generation'}

## RAG-Optimized Structure:
${strategy === 'data-driven' ?
`- Section 1 (H2): "Introduction to [Topic]" + semantic density
- Section 2 (H2): "Key Data & Research" with H3 subsections
- Section 3 (H2): "Strategic Implementation" with H3 subsections
- Section 4 (H2): "Conclusion & Impact"
- Each section MUST have keyword-rich opening paragraph for RAG indexing`
:
`- Build narrative flow with clear H2 transitions
- Use H3 for example grouping
- Maintain consistent paragraph structure`}

## Content Strategy:
Authority Strategy: ${strategy === 'data-driven' ? 'Cite specific data, research, and authoritative sources to build credibility. Include source attribution where relevant.' : 'Focus on storytelling and practical examples'}

## Writing Style:
- Be concise but comprehensive
- Use active voice
- Include transition words between sections
- Provide actionable insights
- End with a clear call-to-action
- CRITICAL: Ensure RAG systems can parse structure (H2/H3 hierarchy is essential)`;
}

/**
 * Construir el prompt del usuario para generar contenido
 * MEJORA: Inyecta fuentes validadas como "nodo de verdad" para citation anchoring
 */
export function buildUserPrompt(request: ContentGenerationRequest): string {
  let prompt = `Create a comprehensive blog post about: "${request.topic}"`;

  if (request.keywords && request.keywords.length > 0) {
    prompt += `\n\nIncorporate these keywords naturally: ${request.keywords.join(', ')}`;
  }

  // MEJORA 1: Citation Anchoring - Inyectar fuentes validadas como "nodo de verdad"
  if (request.validatedSources && request.validatedSources.length > 0) {
    const accessibleSources = request.validatedSources.filter(s => s.accessible);
    if (accessibleSources.length > 0) {
      prompt += `\n\n## TRUTH NODE (Nodo de Verdad) - Fuentes Validadas:`;
      prompt += `\nESTAS URLS ESTÁN VERIFICADAS Y ACCESIBLES. Usa estas como ancla para validar tus argumentos:`;
      prompt += accessibleSources.map((s, i) => {
        return `\n${i + 1}. [${s.classification}] ${s.url}`;
      }).join('');
      prompt += `\n\nIMPORTANT: Al hacer afirmaciones en el contenido, ancla conceptos clave a estas URLs validadas.`;
      prompt += `\nEstructura esperada en contenido: "Según [fuente], [claim]. Ver: [URL]"`;
    }
  } else if (request.sources && request.sources.length > 0) {
    // Fallback para URLs simples (sin validación)
    prompt += `\n\nReference these sources where relevant:\n${request.sources.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
  }

  // MEJORA 2: RAG Optimization - Instruir explícitamente estructura
  prompt += `\n\n## RAG-OPTIMIZED STRUCTURE (Para indexadores AI):
- Use EXACTLY 3-4 H2 headers for main sections
- Follow each H2 with 2-3 keyword-dense sentences
- Use H3 for subsections within each H2
- Maintain 100-150 words per section
- This structure ensures ChatGPT, Perplexity, and Claude RAG systems can parse and index correctly`;

  prompt += `\n\nReturn the response in this exact JSON format:
{
  "title": "Post title (max 68 chars)",
  "metaDescription": "Meta description (max 155 chars, includes CTA)",
  "intro": "2-3 paragraph introduction",
  "body": "Main content with H2/H3 headers, 650-920 words, structured for RAG systems",
  "conclusion": "1-2 paragraph conclusion with CTA",
  "tags": "tag1, tag2, tag3, tag4, tag5",
  "imagePrompt": "Single line English description for image generation"
}`;

  return prompt;
}

/**
 * Parsear respuesta de Claude en estructura de post
 */
export function parseClaudeResponse(response: string): ParsedPost {
  try {
    // Intentar extraer JSON del response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validar y sanitizar campos
    const title = (parsed.title || '').substring(0, 68).trim();
    const metaDescription = (parsed.metaDescription || '').substring(0, 155).trim();
    const body = (parsed.body || '').trim();
    const tags = (parsed.tags || '')
      .split(',')
      .map((t: string) => t.trim().toLowerCase())
      .filter((t: string) => t.length > 0)
      .slice(0, 6);
    const imagePrompt = (parsed.imagePrompt || '').trim();

    // Extraer secciones
    const intro = (parsed.intro || '').trim();
    const conclusion = (parsed.conclusion || '').trim();

    return {
      title,
      metaDescription,
      body,
      tags,
      imagePrompt,
      sections: {
        intro,
        body,
        conclusion,
      },
    };
  } catch (error) {
    throw new Error(`Failed to parse Claude response: ${error}`);
  }
}

/**
 * Validar estructura de post parseado
 */
export function validateParsedPost(post: ParsedPost): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!post.title || post.title.length === 0) {
    errors.push('Title is required');
  } else if (post.title.length > 68) {
    errors.push(`Title too long (${post.title.length}/68 chars)`);
  }

  if (!post.metaDescription || post.metaDescription.length === 0) {
    errors.push('Meta description is required');
  } else if (post.metaDescription.length > 155) {
    errors.push(`Meta description too long (${post.metaDescription.length}/155 chars)`);
  }

  if (!post.body || post.body.length < 500) {
    errors.push('Body too short (minimum 500 characters)');
  } else if (post.body.length < 650) {
    errors.push(`Body is below recommended length (${post.body.length}/650 words minimum)`);
  } else if (post.body.length > 1500) {
    errors.push(`Body too long (${post.body.length}/920 words maximum)`);
  }

  if (!post.tags || post.tags.length === 0) {
    errors.push('At least one tag is required');
  } else if (post.tags.length < 4) {
    errors.push(`Not enough tags (${post.tags.length}/4-6 recommended)`);
  } else if (post.tags.length > 6) {
    errors.push(`Too many tags (${post.tags.length}/6 maximum)`);
  }

  if (!post.imagePrompt || post.imagePrompt.length === 0) {
    errors.push('Image prompt is required');
  } else if (post.imagePrompt.length > 200) {
    errors.push(`Image prompt too long (${post.imagePrompt.length}/200 chars)`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * NEW: Construir metadatos JSON-LD con anclaje de citaciones
 * Esta función crea el "nodo de verdad" que los indexadores AI reconocen
 */
export function buildJSONLDMetadata(
  parsed: ParsedPost,
  topic: string,
  validatedSources: ValidatedSource[],
  tags: string[]
): JSONLDMetadata {
  // Extraer URLs accesibles para citation anchoring
  const citationUrls = validatedSources
    .filter(s => s.accessible)
    .map(s => s.url);

  return {
    '@context': 'https://schema.org/',
    '@type': 'TechArticle',  // CRÍTICO: Los indexadores buscan exactamente esto
    headline: parsed.title,
    description: parsed.metaDescription,
    keywords: tags,
    citation: citationUrls,  // MEJORA 1: URLs validadas ancladas a metadatos
    author: {
      '@type': 'Organization',
      name: 'Influence Factory',
    },
    datePublished: new Date().toISOString(),
    dateModified: new Date().toISOString(),
    articleBody: parsed.body,
  };
}

/**
 * Construir respuesta de generación para el frontend
 * MEJORA: Ahora incluye JSON-LD metadata con citation anchoring
 */
export function buildGenerationResponse(
  parsed: ParsedPost,
  rawContent: string,
  validatedSources?: ValidatedSource[],
  tokensUsed?: number
): { content: GeneratedContent; metadata: JSONLDMetadata } {
  const generatedContent: GeneratedContent = {
    title: parsed.title,
    content: parsed.body,
    excerpt: parsed.metaDescription,
    intro: parsed.sections.intro,
    body: parsed.sections.body,
    conclusion: parsed.sections.conclusion,
    parsed,
    tokens_used: tokensUsed,
  };

  // Construir metadatos JSON-LD con citation anchoring
  const jsonldMetadata = buildJSONLDMetadata(
    parsed,
    parsed.title,
    validatedSources || [],
    parsed.tags
  );

  return {
    content: generatedContent,
    metadata: jsonldMetadata,
  };
}

/**
 * Contar palabras aproximadas en texto
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

/**
 * Formato de palabra para texto
 */
export function getWordCountCategory(wordCount: number): 'short' | 'good' | 'long' {
  if (wordCount < 650) return 'short';
  if (wordCount > 920) return 'long';
  return 'good';
}
