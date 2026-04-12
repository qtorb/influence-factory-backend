/**
 * Content Generation Module
 * Centraliza la lógica de Claude para generar y parsear contenido
 * Reemplaza las funciones del frontend para proteger IP y API keys
 */

export interface ContentGenerationRequest {
  topic: string;
  sources?: string[];
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
 * Encapsula la estrategia de prompting
 */
export function buildPostSystemPrompt(strategy: string = 'data-driven'): string {
  return `You are an expert content strategist and SEO specialist creating compelling, data-driven blog posts. Your role is to:

1. **Authority Injection**: Build credibility by referencing authoritative sources and research
2. **Structure Excellence**: Create posts with clear hierarchies (H2/H3 headers) and logical flow
3. **SEO Optimization**: Naturally incorporate keywords while maintaining readability
4. **Engagement**: Write compelling introductions and conclusions that drive action
5. **Compliance**: Follow all formatting rules precisely

## Output Format Rules:
- Title: Maximum 68 characters, compelling and clear
- Meta Description: Maximum 155 characters, includes call-to-action
- Body: 650-920 words, formatted in Markdown with H2/H3 headers
- Tags: 4-6 lowercase, relevant tags separated by commas
- Image Prompt: One-line English description for ${strategy === 'visual-heavy' ? 'DALL-E' : 'image generation'}

## Content Strategy:
Authority Strategy: ${strategy === 'data-driven' ? 'Cite specific data, research, and authoritative sources to build credibility' : 'Focus on storytelling and practical examples'}

## Writing Style:
- Be concise but comprehensive
- Use active voice
- Include transition words between sections
- Provide actionable insights
- End with a clear call-to-action`;
}

/**
 * Construir el prompt del usuario para generar contenido
 */
export function buildUserPrompt(request: ContentGenerationRequest): string {
  let prompt = `Create a comprehensive blog post about: "${request.topic}"`;

  if (request.keywords && request.keywords.length > 0) {
    prompt += `\n\nIncorporate these keywords naturally: ${request.keywords.join(', ')}`;
  }

  if (request.sources && request.sources.length > 0) {
    prompt += `\n\nReference these sources where relevant:\n${request.sources.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
  }

  prompt += `\n\nReturn the response in this exact JSON format:
{
  "title": "Post title (max 68 chars)",
  "metaDescription": "Meta description (max 155 chars, includes CTA)",
  "intro": "2-3 paragraph introduction",
  "body": "Main content with H2/H3 headers, 650-920 words",
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
 * Construir respuesta de generación para el frontend
 */
export function buildGenerationResponse(
  parsed: ParsedPost,
  rawContent: string,
  tokensUsed?: number
): GeneratedContent {
  return {
    title: parsed.title,
    content: parsed.body,
    excerpt: parsed.metaDescription,
    intro: parsed.sections.intro,
    body: parsed.sections.body,
    conclusion: parsed.sections.conclusion,
    parsed,
    tokens_used: tokensUsed,
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
