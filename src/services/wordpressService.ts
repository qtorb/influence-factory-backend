import { env } from '../config/env.js';

export interface WordPressPublishParams {
  postId: string;
  title: string;
  content: string;
  excerpt?: string;
  status: 'draft' | 'publish';
}

export async function publishPostToWordPress(params: WordPressPublishParams) {
  const auth = Buffer.from(`${env.wpUsername}:${env.wpPassword}`).toString('base64');
  const response = await fetch(`${env.wpBaseUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      title: params.title,
      content: params.content,
      excerpt: params.excerpt,
      status: params.status,
      meta: { sourcePostId: params.postId },
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`WordPress API request failed: ${response.status} ${errorData}`);
  }

  const data = await response.json();
  return data;
}
