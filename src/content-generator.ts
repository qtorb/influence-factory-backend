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

// NEW: Tweet structure para X
export interface XThreadTweet {
  order: number;
  content: string;
}

// NEW: LinkedIn post structure
export interface LinkedInPost {
  content: string;
  bullets: string[];
}

// NEW: Social media kit
export interface SocialKit {
  xThread: XThreadTweet[];
  linkedInPost: LinkedInPost;
}

// NEW: Key takeaway para LLMs
export interface KeyTakeaway {
  title: string;
  description: string;
}

// NEW: Metadata geography
export interface MetadataGEO {
  jsonLD: JSONLDMetadata;
  keyTakeaways: KeyTakeaway[];
}

// NEW: Multidimensional article output
export interface MultidimensionalArticle {
  article: {
    title: string;
    markdownContent: string;
    excerpt: string;
    slug: string;
  };
  socialKit: SocialKit;
  metadataGEO: MetadataGEO;
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
 * Construir el master prompt del sistema para Claude
 * Integra: estrategia de prompting, RAG optimization, authority persona y base prompt
 */
export function buildPostSystemPrompt(
  strategy: string = 'data-driven',
  authorityPersona?: string,
  promptBase?: string
): string {
  const defaultPersona = authorityPersona || 'Expert content strategist with 10+ years of experience in strategic communication and thought leadership';
  const defaultPrompt = promptBase || 'Create content that establishes authority, demonstrates expertise, and drives measurable impact across multiple channels';

  return `You are an expert content creator building multidimensional content for humans and AI indexing systems.

## YOUR PERSONA
${defaultPersona}

## CORE DIRECTIVE
${defaultPrompt}

## TECHNICAL REQUIREMENTS
1. Semantic Consistency: Same semantic fingerprint in JSON-LD, article, and social content
2. Authority Injection: Reference authoritative sources to build credibility
3. Multi-Format Optimization: Content works for humans, LLM indexers, and social platforms
4. RAG-Friendly Structure: H2 main sections with H3 subsections
5. LLM-Extractable Data: JSON-LD enables external LLMs to cite your content
6. Social Virality: X threads and LinkedIn posts for algorithmic distribution
7. Snippet Optimization: Key takeaways for AI-generated snippets

## OUTPUT SPECIFICATION - YOU MUST RESPOND ONLY WITH VALID JSON

Your response MUST be a valid JSON object with this exact structure:
{
  "article": {
    "title": "Article title (max 68 chars)",
    "markdownContent": "650-920 words with ## and ### headers",
    "excerpt": "Meta description (max 155 chars)",
    "slug": "url-friendly-slug"
  },
  "socialKit": {
    "xThread": [
      {"order": 1, "content": "Hook tweet (max 280 chars)"},
      {"order": 2, "content": "Technical breakdown (max 280 chars)"},
      {"order": 3, "content": "Continuation (max 280 chars)"},
      {"order": 4, "content": "Deep dive (max 280 chars)"},
      {"order": 5, "content": "Call to action (max 280 chars)"}
    ],
    "linkedInPost": {
      "content": "Professional opening (500-800 chars)",
      "bullets": ["Point 1", "Point 2", "Point 3", "Point 4"]
    }
  },
  "metadataGEO": {
    "jsonLD": {
      "@context": "https://schema.org/",
      "@type": "TechArticle",
      "headline": "Article headline",
      "description": "Article excerpt",
      "keywords": ["tag1", "tag2", "tag3", "tag4"],
      "citation": [],
      "author": {"@type": "Organization", "name": "Your Organization"}
    },
    "keyTakeaways": [
      {"title": "Key Point 1", "description": "Summary for SearchGPT (max 150 chars)"},
      {"title": "Key Point 2", "description": "Summary for SearchGPT (max 150 chars)"},
      {"title": "Key Point 3", "description": "Summary for SearchGPT (max 150 chars)"}
    ]
  }
}

## SEMANTIC FINGERPRINT RULES
Ensure consistent messaging across:
- Article title/thesis
- JSON-LD headline
- First X thread tweet
- LinkedIn opening
- First key takeaway

## X THREAD STRATEGY (5 tweets)
- Tweet 1: Hook with main thesis + controversial angle
- Tweet 2-4: Technical breakdown with high-retention patterns
- Tweet 5: Call-to-action with engagement request
- Use line breaks for readability

## LINKEDIN STRATEGY
- Tone: Executive, data-driven, authoritative
- Bullets: 4 concrete value points
- Closing: Thought-provoking question or CTA

## CRITICAL COMPLIANCE
- RESPOND WITH ONLY VALID JSON
- NO EXPLANATIONS OR TEXT OUTSIDE JSON
- ALL STRINGS MUST BE COMPLETE (NO PLACEHOLDERS)
- ALL ARRAYS MUST CONTAIN REQUIRED ELEMENTS`;
}

/**
 * NEW: Reparador inteligente de JSON
 * Intenta reparar JSON malformado de respuestas de Claude
 */
export function attemptJSONRepair(response: string): any {
  // Intento 1: JSON directo
  try {
    return JSON.parse(response);
  } catch (e) {
    console.warn('Direct JSON parse failed, attempting repair...');
  }

  // Intento 2: Extraer JSON embebido en markdown
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch (e) {
      console.warn('Markdown JSON parse failed');
    }
  }

  // Intento 3: Extraer primer { ... } válido
  let braceCount = 0;
  let startIdx = -1;
  for (let i = 0; i < response.length; i++) {
    if (response[i] === '{') {
      if (startIdx === -1) startIdx = i;
      braceCount++;
    } else if (response[i] === '}') {
      braceCount--;
      if (braceCount === 0 && startIdx !== -1) {
        const potential = response.substring(startIdx, i + 1);
        try {
          return JSON.parse(potential);
        } catch (e) {
          console.warn('Extracted JSON parse failed');
        }
      }
    }
  }

  throw new Error('Could not repair JSON from response');
}

/**
 * NEW: Parsear y validar salida multidimensional de Claude
 */
export function parseMultidimensionalOutput(response: string): MultidimensionalArticle {
  try {
    const data = attemptJSONRepair(response);

    // Validar estructura básica
    if (!data.article || !data.socialKit || !data.metadataGEO) {
      throw new Error('Missing required top-level keys: article, socialKit, metadataGEO');
    }

    // Validar article
    const article = data.article;
    if (!article.title || !article.markdownContent || !article.excerpt) {
      throw new Error('Article missing required fields: title, markdownContent, excerpt');
    }

    if (article.title.length > 68) {
      article.title = article.title.substring(0, 68);
    }
    if (article.excerpt.length > 155) {
      article.excerpt = article.excerpt.substring(0, 155);
    }
    if (!article.slug) {
      article.slug = article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    // Validar socialKit
    const socialKit = data.socialKit;
    if (!socialKit.xThread || !Array.isArray(socialKit.xThread) || socialKit.xThread.length < 5) {
      throw new Error('xThread must be an array with at least 5 tweets');
    }

    // Limitar tweets a 280 chars
    socialKit.xThread = socialKit.xThread.slice(0, 7).map((t: any, idx: number) => ({
      order: idx + 1,
      content: (t.content || '').substring(0, 280),
    }));

    if (!socialKit.linkedInPost || !socialKit.linkedInPost.content || !Array.isArray(socialKit.linkedInPost.bullets)) {
      throw new Error('linkedInPost must have content and bullets array');
    }

    socialKit.linkedInPost.bullets = socialKit.linkedInPost.bullets.slice(0, 5);

    // Validar metadataGEO
    const metadata = data.metadataGEO;
    if (!metadata.jsonLD || !metadata.keyTakeaways || !Array.isArray(metadata.keyTakeaways)) {
      throw new Error('metadataGEO must have jsonLD and keyTakeaways array');
    }

    metadata.keyTakeaways = metadata.keyTakeaways.slice(0, 5).map((kt: any) => ({
      title: (kt.title || '').substring(0, 100),
      description: (kt.description || '').substring(0, 150),
    }));

    // Validar jsonLD
    const jsonLD = metadata.jsonLD;
    if (!jsonLD['@context'] || !jsonLD['@type'] || !jsonLD.headline) {
      throw new Error('jsonLD missing required fields: @context, @type, headline');
    }

    jsonLD.keywords = (jsonLD.keywords || []).slice(0, 10);
    jsonLD.citation = (jsonLD.citation || []).filter((c: string) => typeof c === 'string');

    return data as MultidimensionalArticle;
  } catch (error) {
    throw new Error(`Failed to parse multidimensional output: ${error}`);
  }
}

/**
 * NEW: Generar slug URL-friendly
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 100);
}

/**
 * NEW: Construir el prompt del usuario para generar contenido multidimensional
 * Inyecta fuentes validadas y solicita salida JSON estructurada
 */
export function buildUserPrompt(request: ContentGenerationRequest, validatedSources?: ValidatedSource[]): string {
  const citationContext = validatedSources && validatedSources.length > 0
    ? `\n\nVALIDATED SOURCES TO CITE:\n${validatedSources.map((s, i) => `${i + 1}. ${s.url} (Classification: ${s.classification})`).join('\n')}`
    : '';

  return `Create a multidimensional content asset for the topic: "${request.topic}"

## Content Requirements:
- Focus Area: ${request.keywords?.join(', ') || 'General expertise'}
- Style: ${request.style || 'persuasive'}
- Strategy: ${request.authorityStrategy || 'data-driven'}
- Target: Thought leaders, C-suite executives, and AI systems${citationContext}

## Deliverables:
1. **Article**: 650-920 words with compelling structure
2. **X Thread**: 5-7 tweets with high engagement patterns
3. **LinkedIn Post**: Executive-level insights with 4 value bullets
4. **JSON-LD Schema**: Technical metadata for search indexing
5. **Key Takeaways**: 3 atomic statements for AI snippet generation

## Success Criteria:
- Same semantic fingerprint across all formats
- Article citations match provided validated sources
- Social content is natively optimized for platform algorithms
- JSON-LD is valid Schema.org TechArticle format
- Key takeaways are distinct from article body

Generate the complete JSON now.`;
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
    errors.push(`Body too long (${post.body.length}/2000 words maximum)`);
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
  } else if (post.imagePrompt.length > 300) {
    errors.push(`Image prompt too long (${post.imagePrompt.length}/300 chars)`);
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
  if (wordCount > 2000) return 'long';
  return 'good';
}
