/**
 * INFLUENCE FACTORY - Control Tower (Dos Puentes)
 * Puente 1: Validación de Fuentes
 * Puente 2: Generación de Contenido (con Citation Anchoring)
 *
 * MEJORAS IMPLEMENTADAS:
 * - Citation Anchoring: Las fuentes de Puente 1 se pasan a Puente 2
 * - RAG Optimization: El contenido generado está optimizado para RAG
 */

import React, { useState } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'https://influence-factory-backend-production.up.railway.app';
const TENANT_ID = 'influence-factory-demo';

interface ValidatedSource {
  url: string;
  classification: string;
  accessible: boolean;
  statusCode?: number;
}

interface GenerationResult {
  success: boolean;
  content?: {
    title: string;
    '@type': string;
    '@context': string;
    citation: string[];
    [key: string]: any;
  };
  metadata?: {
    wordCount: number;
    citationAnchoring: {
      validatedSources: number;
      anchored: number;
    };
    [key: string]: any;
  };
  error?: string;
}

const ControlTowerBridges: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'puente1' | 'puente2'>('puente1');

  // ========================================================================
  // PUENTE 1: Validación de Fuentes
  // ========================================================================
  const [urlsInput, setUrlsInput] = useState('');
  const [validationLoading, setValidationLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [validatedSources, setValidatedSources] = useState<ValidatedSource[]>([]);

  const handleValidateURLs = async () => {
    try {
      setValidationError('');
      setValidationLoading(true);

      const urls = urlsInput
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0);

      if (urls.length === 0) {
        setValidationError('Por favor, ingresa al menos una URL');
        return;
      }

      console.log('🚀 Validando URLs:', urls);

      const response = await fetch(`${API_BASE}/api/v1/validate-source`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: TENANT_ID,
          urls,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Validación completada:', data);

      if (data.success) {
        setValidatedSources(data.sources);
        console.log(`Fuentes validadas: ${data.accessible}/${data.total} accesibles`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      setValidationError(`Error validando URLs: ${errorMsg}`);
      console.error('❌ Error validación:', error);
    } finally {
      setValidationLoading(false);
    }
  };

  // ========================================================================
  // PUENTE 2: Generación de Contenido (con Citation Anchoring)
  // ========================================================================
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [generationLoading, setGenerationLoading] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [generatedContent, setGeneratedContent] = useState<GenerationResult | null>(null);

  const handleGenerateContent = async () => {
    try {
      setGenerationError('');
      setGenerationLoading(true);

      if (!topic.trim()) {
        setGenerationError('Por favor, ingresa un tema');
        return;
      }

      const keywordArray = keywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      console.log('🚀 Generando contenido...');
      console.log('Tema:', topic);
      console.log('Keywords:', keywordArray);
      console.log('Fuentes validadas para anclar:', validatedSources.length);

      // MEJORA: Pasar validatedSources a Puente 2 para citation anchoring
      const response = await fetch(`${API_BASE}/api/v1/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: TENANT_ID,
          topic,
          keywords: keywordArray,
          validatedSources, // MEJORA: Pasar fuentes validadas
          authorityStrategy: 'data-driven',
          style: 'persuasive',
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('📊 GENERACIÓN COMPLETADA - METADATOS JSON-LD');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('Respuesta completa:', data);
      console.log('═══════════════════════════════════════════════════════════');

      if (data.success) {
        console.log('✅ @type:', data.content['@type']);
        console.log('✅ @context:', data.content['@context']);
        console.log('✅ Citation Anchoring - URLs ancladas:', data.content.citation?.length || 0);
        console.log('✅ Metadatos del anclaje:', data.metadata?.citationAnchoring);

        setGeneratedContent(data as GenerationResult);
      } else {
        setGenerationError(`Error: ${data.error}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      setGenerationError(`Error generando contenido: ${errorMsg}`);
      console.error('❌ Error generación:', error);
    } finally {
      setGenerationLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* HEADER */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: 'white',
          padding: '24px',
          borderBottom: '1px solid #334155',
        }}
      >
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>
          ⚡ INFLUENCE FACTORY - Control Tower
        </h1>
        <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '8px' }}>
          Dos Puentes: Validación → Generación (con Citation Anchoring)
        </p>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
        <button
          onClick={() => setActiveTab('puente1')}
          style={{
            flex: 1,
            padding: '16px',
            background: activeTab === 'puente1' ? 'white' : '#f8fafc',
            border: activeTab === 'puente1' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
            borderBottom: activeTab === 'puente1' ? 'none' : '1px solid #e2e8f0',
            cursor: 'pointer',
            fontWeight: activeTab === 'puente1' ? 'bold' : 'normal',
            color: activeTab === 'puente1' ? '#3b82f6' : '#64748b',
          }}
        >
          🌉 Puente 1: Validación de Fuentes
        </button>
        <button
          onClick={() => setActiveTab('puente2')}
          style={{
            flex: 1,
            padding: '16px',
            background: activeTab === 'puente2' ? 'white' : '#f8fafc',
            border: activeTab === 'puente2' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
            borderBottom: activeTab === 'puente2' ? 'none' : '1px solid #e2e8f0',
            cursor: 'pointer',
            fontWeight: activeTab === 'puente2' ? 'bold' : 'normal',
            color: activeTab === 'puente2' ? '#3b82f6' : '#64748b',
          }}
        >
          🚀 Puente 2: Generación (Citation Anchoring)
        </button>
      </div>

      {/* CONTENT */}
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* PUENTE 1 */}
        {activeTab === 'puente1' && (
          <div style={{ background: 'white', borderRadius: '8px', padding: '24px', border: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginTop: 0 }}>
              🌉 Puente 1: Validación de Fuentes
            </h2>
            <p style={{ color: '#64748b', marginBottom: '16px' }}>
              Valida URLs y clasifica automáticamente para el anclaje de citaciones. Las fuentes validadas se
              pasarán a Puente 2.
            </p>

            {/* URLs Input */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>
                URLs a validar (una por línea):
              </label>
              <textarea
                value={urlsInput}
                onChange={(e) => setUrlsInput(e.target.value)}
                placeholder="https://arxiv.org/abs/2301.00001&#10;https://www.sec.gov/rules&#10;https://kubernetes.io/docs/"
                style={{
                  width: '100%',
                  height: '120px',
                  padding: '12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Validate Button */}
            <button
              onClick={handleValidateURLs}
              disabled={validationLoading}
              style={{
                padding: '10px 20px',
                background: validationLoading ? '#cbd5e1' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: validationLoading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              {validationLoading ? '⏳ Validando...' : '✅ Validar Fuentes'}
            </button>

            {/* Error */}
            {validationError && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: '#fee2e2',
                  color: '#dc2626',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              >
                ❌ {validationError}
              </div>
            )}

            {/* Results */}
            {validatedSources.length > 0 && (
              <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginTop: 0 }}>
                  ✅ Fuentes Validadas ({validatedSources.length})
                </h3>
                <div style={{ marginTop: '12px' }}>
                  {validatedSources.map((source, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px',
                        background: source.accessible ? '#f0fdf4' : '#fef2f2',
                        borderLeft: `4px solid ${source.accessible ? '#16a34a' : '#dc2626'}`,
                        marginBottom: '8px',
                        borderRadius: '4px',
                      }}
                    >
                      <div style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}>
                        {source.accessible ? '✅' : '❌'} {source.classification}
                      </div>
                      <div style={{ fontSize: '13px', color: '#475569', wordBreak: 'break-all' }}>
                        {source.url}
                      </div>
                      {source.statusCode && (
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                          HTTP {source.statusCode}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PUENTE 2 */}
        {activeTab === 'puente2' && (
          <div style={{ background: 'white', borderRadius: '8px', padding: '24px', border: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginTop: 0 }}>
              🚀 Puente 2: Generación de Contenido
            </h2>
            <p style={{ color: '#64748b', marginBottom: '16px' }}>
              Genera contenido optimizado para RAG. Las fuentes validadas en Puente 1 se anclan automáticamente.
            </p>

            {validatedSources.length > 0 && (
              <div
                style={{
                  padding: '12px',
                  background: '#dbeafe',
                  border: '1px solid #93c5fd',
                  borderRadius: '4px',
                  marginBottom: '16px',
                  fontSize: '14px',
                  color: '#1e40af',
                }}
              >
                ℹ️ {validatedSources.length} fuentes validadas listas para anclaje de citaciones
              </div>
            )}

            {/* Topic */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>
                Tema:
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ej: SEO Adversarial en Ciberguerra"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Keywords */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>
                Keywords (separados por comas):
              </label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="Ej: SEO, ciberguerra, ranking, ataque"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerateContent}
              disabled={generationLoading}
              style={{
                padding: '10px 20px',
                background: generationLoading ? '#cbd5e1' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: generationLoading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              {generationLoading ? '⏳ Generando (30-60 seg)...' : '✅ Generar Contenido'}
            </button>

            {/* Error */}
            {generationError && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: '#fee2e2',
                  color: '#dc2626',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              >
                ❌ {generationError}
              </div>
            )}

            {/* Generated Content */}
            {generatedContent && generatedContent.success && (
              <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginTop: 0 }}>
                  ✅ Contenido Generado
                </h3>

                {/* Metadata Highlight */}
                <div
                  style={{
                    padding: '16px',
                    background: '#f0fdf4',
                    border: '2px solid #16a34a',
                    borderRadius: '4px',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ fontWeight: 'bold', color: '#15803d', marginBottom: '8px' }}>
                    📊 Metadatos JSON-LD
                  </div>
                  <div style={{ fontSize: '13px', color: '#166534', fontFamily: 'monospace' }}>
                    <div>✅ @type: <strong>{generatedContent.content?.['@type']}</strong></div>
                    <div>✅ @context: {generatedContent.content?.['@context']}</div>
                    <div>
                      ✅ Citation Anchoring: <strong>{generatedContent.content?.citation?.length || 0} URLs ancladas</strong>
                    </div>
                    {generatedContent.metadata?.citationAnchoring && (
                      <div>
                        ✅ Fuentes validadas: {generatedContent.metadata.citationAnchoring.validatedSources} →
                        Ancladas: {generatedContent.metadata.citationAnchoring.anchored}
                      </div>
                    )}
                    <div>Palabras: {generatedContent.metadata?.wordCount}</div>
                  </div>
                </div>

                {/* Title and Meta */}
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '14px', color: '#64748b', marginTop: 0, marginBottom: '4px' }}>
                    Título:
                  </h4>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>
                    {generatedContent.content?.title}
                  </div>
                </div>

                {generatedContent.content?.citation && generatedContent.content.citation.length > 0 && (
                  <div
                    style={{
                      padding: '12px',
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '4px',
                      marginBottom: '16px',
                    }}
                  >
                    <div style={{ fontWeight: 'bold', color: '#1e40af', marginBottom: '8px' }}>
                      🔗 Citaciones Ancladas:
                    </div>
                    {generatedContent.content.citation.map((url, idx) => (
                      <div
                        key={idx}
                        style={{
                          fontSize: '13px',
                          color: '#1e40af',
                          marginBottom: '4px',
                          wordBreak: 'break-all',
                        }}
                      >
                        {idx + 1}. {url}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlTowerBridges;
