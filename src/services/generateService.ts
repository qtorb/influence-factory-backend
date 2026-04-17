import prisma from '../config/prisma.js';
import { env } from '../config/env.js';
import { createDraft } from './draftService.js';
import { validateSourceUrls } from './sourceValidationService.js';
import { getNicheProfileById } from './nicheService.js';
import {
  buildPostSystemPrompt,
  buildUserPrompt,
  parseMultidimensionalOutput,
  ValidatedSource,
  MultidimensionalArticle,
  ContentGenerationRequest,
} from '../content-generator.js';

export interface GeneratePostParams extends ContentGenerationRequest {
  topic: string;
  projectId: string;
}

export interface GeneratePostResult {
  draftId?: string;
  success: boolean;
  multidimensionalAsset: MultidimensionalArticle;
  error?: string;
}

export async function generatePost(params: GeneratePostParams): Promise<GeneratePostResult> {
  try {
    console.log('🔥 SERVICE: generatePost called with topic:', params.topic);
    
    // Cargar perfil del nicho
    const nicheProfile = await getNicheProfileById(params.projectId);
    console.log('✅ Niche profile loaded:', nicheProfile.name);

    // Validar fuentes
    const validatedSources: ValidatedSource[] = [];
    // TODO: Habilitar validación cuando sea necesario
    // const validatedSources: ValidatedSource[] = params.validatedSources?.length
    //   ? params.validatedSources
    //   : params.sources?.length
    //   ? await validateSourceUrls(params.sources, params.projectId)
    //   : [];

    // Construir prompts con autoridad del nicho
    const systemPrompt = buildPostSystemPrompt(
      params.authorityStrategy ?? 'data-driven',
      nicheProfile.authorityPersona,
      nicheProfile.promptBase
    );
    console.log('🔥 SERVICE: systemPrompt built, length:', systemPrompt.length);

    const userPrompt = buildUserPrompt({
      topic: params.topic,
      keywords: params.keywords,
      style: params.style ?? 'persuasive',
      sources: params.sources,
      validatedSources,
      authorityStrategy: params.authorityStrategy ?? 'data-driven',
    }, validatedSources);

    const promptPayload = `${systemPrompt}\n\n${userPrompt}`;
    console.log('🔍 Calling Claude API with model:', env.claudeModel);
    console.log(`📨 Payload details: prompt length=${promptPayload.length}`);

    // Llamar a Claude API
    const controller = new AbortController();
    const timeoutMs = 30000; // 30 segundos para respuesta multidimensional
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      const url = 'https://api.anthropic.com/v1/messages';
      const body = {
        model: env.claudeModel,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: promptPayload,
          },
        ],
      };

      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.claudeApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeout);
      console.error('❌ Claude API network error:', (error as Error).message);
      throw new Error(`Claude API network error: ${(error as Error).message}`);
    }

    clearTimeout(timeout);
    console.log('📡 Claude API response status:', response.status);

    if (!response.ok) {
      const body = await response.text();
      console.error('❌ Claude API error body:', body);
      throw new Error(`Claude API request failed: ${response.status} ${body}`);
    }

    const claudeData = await response.json();
    const generatedText = claudeData?.content?.[0]?.text ?? claudeData?.completion ?? '';

    if (!generatedText || generatedText.trim().length === 0) {
      console.error('❌ Claude API returned empty response:', JSON.stringify(claudeData));
      throw new Error('Claude API returned an empty response');
    }

    console.log('🔄 Parsing multidimensional output...');
    let multidimensionalAsset: MultidimensionalArticle;
    
    try {
      multidimensionalAsset = parseMultidimensionalOutput(generatedText);
    } catch (parseError) {
      console.error('❌ JSON parsing failed:', parseError);
      throw new Error(`Failed to parse Claude JSON response: ${parseError}`);
    }

    // Inyectar URLs de fuentes validadas en JSON-LD
    multidimensionalAsset.metadataGEO.jsonLD.citation = validatedSources
      .filter(s => s.accessible)
      .map(s => s.url);

    // Crear/actualizar draft con persistencia atómica
    let draftId: string | undefined;
    try {
      const draft = await createDraft({
        tenantId: 'admin',
        projectId: params.projectId,
        title: multidimensionalAsset.article.title,
        content: multidimensionalAsset.article.markdownContent,
        excerpt: multidimensionalAsset.article.excerpt,
        intro: multidimensionalAsset.article.markdownContent.split('##')[1]?.split('##')[0]?.trim() || '',
        body: multidimensionalAsset.article.markdownContent,
        conclusion: multidimensionalAsset.article.markdownContent.split('##').pop()?.trim() || '',
        status: 'draft',
        // Guardar toda la salida multidimensional en authoritySignals
        authoritySignals: {
          socialKit: multidimensionalAsset.socialKit,
          keyTakeaways: multidimensionalAsset.metadataGEO.keyTakeaways,
          jsonLD: multidimensionalAsset.metadataGEO.jsonLD,
          generatedAt: new Date().toISOString(),
          nicheProfile: nicheProfile.name,
        },
      });
      draftId = draft.id;
      console.log('✅ Draft created with ID:', draftId);
    } catch (error) {
      console.warn('⚠️ Draft creation failed, continuing without persistence:', error);
    }

    return {
      draftId,
      success: true,
      multidimensionalAsset,
    };
  } catch (error) {
    console.error('❌ ERROR IN GENERATE SERVICE:', error);
    throw error;
  }
}

