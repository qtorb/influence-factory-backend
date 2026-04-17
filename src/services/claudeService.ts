import { env } from '../config/env.js';

export interface ClaudeGenerationParams {
  tenantId: string;
  topic: string;
  sources: string[];
  keywords: string[];
  style: string;
}

export async function generatePostWithClaude(params: ClaudeGenerationParams) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.claudeApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: env.claudeModel,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `Generate a post about ${params.topic} using ${params.sources.length} sources and ${params.keywords.length} keywords in ${params.style} style.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Claude API request failed: ${response.status} ${errorData}`);
  }

  const data = await response.json();
  return {
    tenantId: params.tenantId,
    topic: params.topic,
    raw: data,
  };
}
