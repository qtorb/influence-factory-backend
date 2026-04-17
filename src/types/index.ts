import { ValidatedSource } from '../content-generator.js';

export interface GenerateRequestBody {
  topic: string;
  sources?: string[];
  validatedSources?: ValidatedSource[];
  keywords?: string[];
  style?: string;
  authorityStrategy?: string;
}

export interface PublishRequestBody {
  title: string;
  content: string;
  excerpt?: string;
  status?: 'draft' | 'publish';
}
