/**
 * INFLUENCE FACTORY - Control Tower (Agnóstico Multi-Nicho)
 * Arquitectura:
 * - Selector dinámico de Proyectos/Nichos
 * - Validación de Fuentes (Puente 1)
 * - Generación Multidimensional (Puente 2)
 * - Dashboard de Asset Multidimensional (Tabs: Article, Social, Metadata)
 *
 * MEJORAS IMPLEMENTADAS:
 * - Carga dinámica de nichos desde API
 * - Sistema de tabs para "Kit de Autoridad"
 * - Indicadores visuales de autoridad por nicho
 * - Copiar a portapapeles para cada formato
 * - Persistencia de projectId en estado
 */

import React, { useState, useEffect } from 'react';

const API_BASE = (import.meta.env.VITE_API_URL || 'https://influence-factory-backend-production.up.railway.app')
  .replace(/\/api\/?$/, '')   // evita doble /api/ si VITE_API_URL ya incluye /api
  .replace(/\/$/, '');        // elimina trailing slash
const TENANT_ID = 'influence-factory-demo';

// ============================================================================
// INTERFACES
// ============================================================================

interface NicheProfile {
  id: string;
  name: string;
  authorityPersona?: string;
  promptBase?: string;
  categories: Array<{
    name: string;
    rules: any;
  }>;
}

interface ValidatedSource {
  url: string;
  classification: string;
  accessible: boolean;
  statusCode?: number;
}

interface XThreadTweet {
  order: number;
  content: string;
}

interface LinkedInPost {
  content: string;
  bullets: string[];
}

interface KeyTakeaway {
  title: string;
  description: string;
}

interface JSONLDMetadata {
  '@context': string;
  '@type': string;
  headline: string;
  description: string;
  keywords: string[];
  citation: string[];
  author?: {
    '@type': string;
    name: string;
  };
}

interface MultidimensionalAsset {
  article: {
    title: string;
    markdownContent: string;
    excerpt: string;
    slug: string;
  };
  socialKit: {
    xThread: XThreadTweet[];
    linkedInPost: LinkedInPost;
  };
  metadataGEO: {
    jsonLD: JSONLDMetadata;
    keyTakeaways: KeyTakeaway[];
  };
}

interface GenerationResult {
  success: boolean;
  draftId?: string;
  asset?: MultidimensionalAsset;
  error?: string;
}

const ControlTowerBridges: React.FC = () => {
  // ========================================================================
  // ESTADO GLOBAL
  // ========================================================================
  const [mainTab, setMainTab] = useState<'setup' | 'generate'>('setup');
  const [assetTab, setAssetTab] = useState<'article' | 'xthread' | 'linkedin' | 'metadata'>('article');

  // ========================================================================
  // ESTADO: SELECTOR DE PROYECTO
  // ========================================================================
  const [niches, setNiches] = useState<NicheProfile[]>([]);
  const [selectedProject, setSelectedProject] = useState<NicheProfile | null>(null);
  const [loadingNiches, setLoadingNiches] = useState(true);
  const [nichesError, setNichesError] = useState('');

  // ========================================================================
  // ESTADO: PUENTE 1 (VALIDACIÓN)
  // ========================================================================
  const [urlsInput, setUrlsInput] = useState('');
  const [validationLoading, setValidationLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [validatedSources, setValidatedSources] = useState<ValidatedSource[]>([]);

  // ========================================================================
  // ESTADO: PUENTE 2 (GENERACIÓN)
  // ========================================================================
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [generationLoading, setGenerationLoading] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [generatedAsset, setGeneratedAsset] = useState<MultidimensionalAsset | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);

  // ========================================================================
  // EFFECT: Cargar nichos al iniciar
  // ========================================================================
  useEffect(() => {
    loadNiches();
  }, []);

  const loadNiches = async () => {
    try {
      setLoadingNiches(true);
      setNichesError('');
      // TODO: Implementar endpoint para cargar nichos
      // Por ahora simulamos cargando el nicho por defecto
      // const response = await fetch(`${API_BASE}/api/v1/niches`);
      // const data = await response.json();
      // setNiches(data.niches);
      // setSelectedProject(data.niches[0]);
      
      // Simulación temporal
      const defaultNiche: NicheProfile = {
        id: 'default-project-id',
        name: 'RosmarOps',
        authorityPersona: 'Experto en operaciones empresariales con 15 años de experiencia',
        promptBase: 'Genera contenido sobre operaciones, escalabilidad y transformación digital',
        categories: [
          { name: 'paper', rules: { keywords: ['pdf', 'paper'] } },
          { name: 'research_article', rules: { domains: ['arxiv.org', 'doi.org'] } },
          { name: 'official_source', rules: { domains: ['gov', 'edu', 'org'] } },
        ],
      };
      setNiches([defaultNiche]);
      setSelectedProject(defaultNiche);
    } catch (error) {
      setNichesError('Error cargando nichos: ' + (error instanceof Error ? error.message : 'Unknown'));
    } finally {
      setLoadingNiches(false);
    }
  };

  // ========================================================================
  // FUNCIONES: PUENTE 1
  // ========================================================================
  const handleValidateURLs = async () => {
    try {
      setValidationError('');
      setValidationLoading(true);

      const urls = urlsInput
        .split('\n')
        .map((url) => url.trim())
        .filter((url) => url.length > 0);

      if (urls.length === 0) {
        setValidationError('Por favor, ingresa al menos una URL');
        return;
      }

      if (!selectedProject) {
        setValidationError('Por favor, selecciona un proyecto');
        return;
      }

      console.log('🚀 Validando URLs:', urls);

      const response = await fetch(`${API_BASE}/api/v1/validate-sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls,
          projectId: selectedProject.id,
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
  // FUNCIONES: PUENTE 2
  // ========================================================================
  const handleGenerateContent = async () => {
    try {
      setGenerationError('');
      setGenerationLoading(true);

      if (!topic.trim()) {
        setGenerationError('Por favor, ingresa un tema');
        return;
      }

      if (!selectedProject) {
        setGenerationError('Por favor, selecciona un proyecto');
        return;
      }

      const keywordArray = keywords
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      console.log('🚀 Generando contenido multidimensional...');
      console.log('Tema:', topic);
      console.log('Proyecto:', selectedProject.name);

      const response = await fetch(`${API_BASE}/api/v1/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          keywords: keywordArray,
          validatedSources,
          authorityStrategy: 'data-driven',
          style: 'persuasive',
          projectId: selectedProject.id, // ← CRÍTICO: Pasar projectId
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: GenerationResult = await response.json();
      console.log('📊 Generación completada:', data);

      if (data.success && data.asset) {
        setGeneratedAsset(data.asset);
        setDraftId(data.draftId || null);
        setAssetTab('article'); // Mostrar primer tab
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

  // ========================================================================
  // UTILIDADES: COPIAR AL PORTAPAPELES
  // ========================================================================
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`✅ ${label} copiado al portapapeles`);
  };

  const hasProjectSelected = Boolean(selectedProject);
  const successfulValidatedSources = validatedSources.filter((source) => source.accessible);
  const hasValidatedSources = successfulValidatedSources.length > 0;

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: '#f4f4f5' }}>
      {/* HEADER */}
      <div
        style={{
          background: 'linear-gradient(135deg, #18181b 0%, #09090b 100%)',
          color: 'white',
          padding: '24px',
          borderBottom: '1px solid #3f3f46',
        }}
      >
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>
          ⚡ INFLUENCE FACTORY - Control Tower
        </h1>
        <p style={{ fontSize: '14px', color: '#a1a1a6', marginTop: '8px' }}>
          Sistema Agnóstico Multi-Nicho • Generación Multidimensional de Autoridad
        </p>
      </div>

      {/* SELECTOR DE PROYECTO - PASO 1 */}
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ background: 'white', borderRadius: '6px', padding: '20px', border: '1px solid #e4e4e7', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginTop: 0, marginBottom: '16px' }}>
            🎯 1. Define tu Perfil de Autoridad
          </h2>
          <p style={{ color: '#71717a', marginTop: 0, marginBottom: '16px', fontSize: '14px' }}>
            Selecciona tu nicho para que la IA adopte tu voz experta y reglas de validación.
          </p>

          {loadingNiches ? (
            <div style={{ color: '#71717a' }}>⏳ Cargando nichos...</div>
          ) : nichesError ? (
            <div style={{ padding: '12px', background: '#fef2f2', color: '#dc2626', borderRadius: '4px' }}>
              ❌ {nichesError}
            </div>
          ) : (
            <div>
              {niches.map((niche) => (
                <button
                  key={niche.id}
                  onClick={() => setSelectedProject(niche)}
                  style={{
                    width: '100%',
                    padding: '16px',
                    marginBottom: '12px',
                    border: selectedProject?.id === niche.id ? '2px solid #18181b' : '1px solid #e4e4e7',
                    background: selectedProject?.id === niche.id ? '#f4f4f5' : 'white',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#18181b', marginBottom: '8px' }}>
                    {selectedProject?.id === niche.id ? '✅' : '○'} {niche.name}
                  </div>
                  <div style={{ fontSize: '13px', color: '#71717a', marginBottom: '4px' }}>
                    {niche.authorityPersona}
                  </div>
                  <div style={{ fontSize: '12px', color: '#a1a1a6' }}>
                    📂 {niche.categories.length} categorías • {niche.categories.map((c) => c.name).join(', ')}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MAIN TABS */}
      <div style={{ borderTop: '1px solid #e4e4e7', background: 'white' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', borderBottom: '1px solid #e4e4e7' }}>
          <button
            onClick={() => setMainTab('setup')}
            style={{
              flex: 1,
              padding: '16px',
              background: mainTab === 'setup' ? '#fafafa' : 'white',
              border: 'none',
              borderBottom: mainTab === 'setup' ? '2px solid #18181b' : '1px solid #e4e4e7',
              cursor: 'pointer',
              fontWeight: mainTab === 'setup' ? 'bold' : 'normal',
              color: mainTab === 'setup' ? '#18181b' : '#71717a',
              fontSize: '14px',
            }}
          >
            📚 Paso 2: Fuentes
          </button>
          <button
            onClick={() => setMainTab('generate')}
            disabled={!hasProjectSelected}
            title={!hasProjectSelected ? 'Selecciona tu perfil de autoridad primero' : ''}
            style={{
              flex: 1,
              padding: '16px',
              background: mainTab === 'generate' ? '#fafafa' : 'white',
              border: 'none',
              borderBottom: mainTab === 'generate' ? '2px solid #18181b' : '1px solid #e4e4e7',
              cursor: !hasProjectSelected ? 'not-allowed' : 'pointer',
              fontWeight: mainTab === 'generate' ? 'bold' : 'normal',
              color: !hasProjectSelected ? '#a1a1aa' : mainTab === 'generate' ? '#18181b' : '#71717a',
              fontSize: '14px',
              opacity: !hasProjectSelected ? 0.55 : 1,
            }}
          >
            🚀 Paso 3: Activos
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* PUENTE 1: VALIDACIÓN */}
        {mainTab === 'setup' && (
          <div
            style={{
              background: 'white',
              borderRadius: '6px',
              padding: '24px',
              border: '1px solid #e4e4e7',
              opacity: hasProjectSelected ? 1 : 0.55,
              filter: hasProjectSelected ? 'none' : 'grayscale(0.7)',
              transition: 'all 0.2s ease',
            }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginTop: 0 }}>
              📚 2. Aporta Conocimiento (Fuentes)
            </h2>
            <p style={{ color: '#71717a', marginBottom: '16px' }}>
              Pega URLs de referencia. Analizaremos si cumplen con los estándares de tu nicho.
            </p>

            {!hasProjectSelected && (
              <div style={{ marginBottom: '16px', padding: '10px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '4px', color: '#92400e', fontSize: '13px' }}>
                Selecciona tu perfil en el Paso 1 para desbloquear la validación de fuentes.
              </div>
            )}

            <textarea
              value={urlsInput}
              onChange={(e) => setUrlsInput(e.target.value)}
              placeholder="https://arxiv.org/abs/2301.00001&#10;https://www.sec.gov/rules"
              style={{
                width: '100%',
                height: '100px',
                padding: '12px',
                border: '1px solid #e4e4e7',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '13px',
                boxSizing: 'border-box',
                marginBottom: '16px',
              }}
            />

            <button
              onClick={handleValidateURLs}
              disabled={validationLoading || !hasProjectSelected}
              style={{
                padding: '10px 20px',
                background: validationLoading || !hasProjectSelected ? '#d4d4d8' : '#18181b',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: validationLoading || !hasProjectSelected ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              {validationLoading ? '⏳ Validando...' : '✅ Validar URLs'}
            </button>

            {validationError && (
              <div style={{ marginTop: '16px', padding: '12px', background: '#fef2f2', color: '#dc2626', borderRadius: '4px', fontSize: '14px' }}>
                ❌ {validationError}
              </div>
            )}

            {validatedSources.length > 0 && (
              <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>✅ Fuentes Validadas ({validatedSources.length})</h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {validatedSources.map((source, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px',
                        background: source.accessible ? '#f0fdf4' : '#fef2f2',
                        borderLeft: `3px solid ${source.accessible ? '#22c55e' : '#ef4444'}`,
                        borderRadius: '4px',
                      }}
                    >
                      <div style={{ fontWeight: 'bold', color: '#18181b', marginBottom: '4px' }}>
                        {source.accessible ? '✅' : '❌'} {source.classification}
                      </div>
                      <div style={{ fontSize: '13px', color: '#71717a', wordBreak: 'break-all' }}>
                        {source.url}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PUENTE 2: GENERACIÓN */}
        {mainTab === 'generate' && (
          <div style={{ opacity: hasProjectSelected ? 1 : 0.55, filter: hasProjectSelected ? 'none' : 'grayscale(0.7)', transition: 'all 0.2s ease' }}>
            {/* FORM */}
            {!generatedAsset && (
              <div style={{ background: 'white', borderRadius: '6px', padding: '24px', border: '1px solid #e4e4e7' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginTop: 0 }}>
                  🚀 3. Crea tus Activos de Influencia
                </h2>
                <p style={{ color: '#71717a', marginTop: 0, marginBottom: '16px' }}>
                  Genera un kit multidimensional optimizado para humanos y algoritmos.
                </p>

                {!hasProjectSelected && (
                  <div style={{ marginBottom: '16px', padding: '10px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '4px', color: '#92400e', fontSize: '13px' }}>
                    Define primero tu perfil de autoridad en el Paso 1 para activar esta etapa.
                  </div>
                )}

                {selectedProject && (
                  <div style={{ padding: '12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '4px', marginBottom: '16px', fontSize: '14px', color: '#166534' }}>
                    👤 <strong>Persona de Autoridad:</strong> {selectedProject.authorityPersona}
                    <br />
                    💡 <strong>Directiva:</strong> {selectedProject.promptBase}
                  </div>
                )}

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>
                    Tema:
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Ej: Escalando operaciones en SaaS"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #e4e4e7',
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>
                    Keywords (separados por comas):
                  </label>
                  <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="Ej: escalabilidad, operaciones, SaaS"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #e4e4e7',
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <button
                  onClick={handleGenerateContent}
                  disabled={generationLoading || !hasProjectSelected || !hasValidatedSources}
                  title={!hasValidatedSources ? 'Valida tus fuentes primero para activar la fábrica' : ''}
                  style={{
                    padding: '12px 24px',
                    background:
                      generationLoading || !hasProjectSelected || !hasValidatedSources
                        ? '#d4d4d8'
                        : 'linear-gradient(135deg, #0f766e 0%, #1d4ed8 55%, #7c3aed 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: generationLoading || !hasProjectSelected || !hasValidatedSources ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    boxShadow: generationLoading || !hasProjectSelected || !hasValidatedSources ? 'none' : '0 10px 22px rgba(37, 99, 235, 0.28)',
                    width: '100%',
                  }}
                >
                  {generationLoading ? '⏳ Generando (30-60 seg)...' : '🏭 Generar Asset Multidimensional'}
                </button>

                {!hasValidatedSources && (
                  <div style={{ marginTop: '10px', color: '#71717a', fontSize: '13px' }}>
                    Valida tus fuentes primero para activar la fábrica.
                  </div>
                )}

                {hasValidatedSources && (
                  <div style={{ marginTop: '10px', color: '#166534', fontSize: '13px', fontWeight: 'bold' }}>
                    ✅ {successfulValidatedSources.length} fuente(s) validada(s) con éxito.
                  </div>
                )}

                {generationError && (
                  <div style={{ marginTop: '16px', padding: '12px', background: '#fef2f2', color: '#dc2626', borderRadius: '4px', fontSize: '14px' }}>
                    ❌ {generationError}
                  </div>
                )}
              </div>
            )}

            {/* ASSET TABS */}
            {generatedAsset && (
              <div style={{ marginTop: '24px' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid #e4e4e7', marginBottom: '24px', background: 'white', borderRadius: '6px 6px 0 0' }}>
                  {['article', 'xthread', 'linkedin', 'metadata'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setAssetTab(tab as typeof assetTab)}
                      style={{
                        flex: 1,
                        padding: '16px 12px',
                        background: assetTab === tab ? '#f5f7ff' : 'white',
                        border: 'none',
                        borderBottom: assetTab === tab ? '2px solid #1d4ed8' : '1px solid #e4e4e7',
                        cursor: 'pointer',
                        fontWeight: assetTab === tab ? 'bold' : 'normal',
                        color: assetTab === tab ? '#1e3a8a' : '#52525b',
                        fontSize: '14px',
                        letterSpacing: '0.2px',
                      }}
                    >
                      {tab === 'article' && '📄 Artículo'}
                      {tab === 'xthread' && '𝕏 X'}
                      {tab === 'linkedin' && '💼 LinkedIn'}
                      {tab === 'metadata' && '📊 SEO'}
                    </button>
                  ))}
                </div>

                <div style={{ background: 'white', borderRadius: '0 0 6px 6px', padding: '24px', border: '1px solid #e4e4e7', borderTop: 'none' }}>
                  {/* TAB: ARTÍCULO */}
                  {assetTab === 'article' && (
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginTop: 0 }}>
                        {generatedAsset.article.title}
                      </h3>
                      <p style={{ fontSize: '14px', color: '#71717a', marginBottom: '24px' }}>
                        {generatedAsset.article.excerpt}
                      </p>
                      <pre
                        style={{
                          background: '#f4f4f5',
                          padding: '16px',
                          borderRadius: '4px',
                          overflow: 'auto',
                          maxHeight: '600px',
                          fontSize: '13px',
                          lineHeight: '1.6',
                          fontFamily: 'monospace',
                          color: '#18181b',
                        }}
                      >
                        {generatedAsset.article.markdownContent}
                      </pre>
                      <button
                        onClick={() => copyToClipboard(generatedAsset.article.markdownContent, 'Artículo')}
                        style={{
                          marginTop: '16px',
                          padding: '11px 16px',
                          background: '#1d4ed8',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '13px',
                        }}
                      >
                        📋 Copiar al portapapeles
                      </button>
                    </div>
                  )}

                  {/* TAB: X THREAD */}
                  {assetTab === 'xthread' && (
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginTop: 0 }}>Hilo de X (Twitter)</h3>
                      <p style={{ fontSize: '14px', color: '#71717a', marginBottom: '16px' }}>
                        {generatedAsset.socialKit.xThread.length} tweets listos para copiar
                      </p>
                      <div style={{ display: 'grid', gap: '12px' }}>
                        {generatedAsset.socialKit.xThread.map((tweet, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: '16px',
                              background: '#f4f4f5',
                              borderRadius: '4px',
                              borderLeft: '3px solid #18181b',
                            }}
                          >
                            <div style={{ fontSize: '12px', color: '#71717a', marginBottom: '8px', fontWeight: 'bold' }}>
                              Tweet {tweet.order} / {generatedAsset.socialKit.xThread.length} ({tweet.content.length}/280 chars)
                            </div>
                            <div style={{ fontSize: '14px', color: '#18181b', lineHeight: '1.6' }}>
                              {tweet.content}
                            </div>
                            <button
                              onClick={() => copyToClipboard(tweet.content, `Tweet ${tweet.order}`)}
                              style={{
                                marginTop: '10px',
                                padding: '7px 12px',
                                background: '#1d4ed8',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 'bold',
                              }}
                            >
                              📋 Copiar al portapapeles
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => copyToClipboard(generatedAsset.socialKit.xThread.map((t) => t.content).join('\n\n'), 'Hilo completo')}
                        style={{
                          marginTop: '16px',
                          padding: '11px 16px',
                          background: '#1d4ed8',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          width: '100%',
                          fontSize: '13px',
                        }}
                      >
                        📋 Copiar al portapapeles
                      </button>
                    </div>
                  )}

                  {/* TAB: LINKEDIN */}
                  {assetTab === 'linkedin' && (
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginTop: 0 }}>Post de LinkedIn</h3>
                      <div style={{ padding: '16px', background: '#f4f4f5', borderRadius: '4px', marginBottom: '16px', minHeight: '200px', fontFamily: 'system-ui' }}>
                        <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#18181b', whiteSpace: 'pre-wrap' }}>
                          {generatedAsset.socialKit.linkedInPost.content}
                        </div>
                        {generatedAsset.socialKit.linkedInPost.bullets.length > 0 && (
                          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e4e4e7' }}>
                            {generatedAsset.socialKit.linkedInPost.bullets.map((bullet, idx) => (
                              <div key={idx} style={{ marginBottom: '8px', fontSize: '13px', color: '#18181b' }}>
                                • {bullet}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => copyToClipboard(
                          `${generatedAsset.socialKit.linkedInPost.content}\n\n${generatedAsset.socialKit.linkedInPost.bullets.map((b) => `• ${b}`).join('\n')}`,
                          'Post de LinkedIn'
                        )}
                        style={{
                          padding: '11px 16px',
                          background: '#1d4ed8',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          width: '100%',
                          fontSize: '13px',
                        }}
                      >
                        📋 Copiar al portapapeles
                      </button>
                    </div>
                  )}

                  {/* TAB: METADATA */}
                  {assetTab === 'metadata' && (
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginTop: 0 }}>📊 JSON-LD & Key Takeaways</h3>

                      <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#18181b' }}>Schema.org (JSON-LD)</h4>
                        <pre
                          style={{
                            background: '#f4f4f5',
                            padding: '16px',
                            borderRadius: '4px',
                            overflow: 'auto',
                            maxHeight: '300px',
                            fontSize: '12px',
                            lineHeight: '1.4',
                            fontFamily: 'monospace',
                            color: '#18181b',
                          }}
                        >
                          {JSON.stringify(generatedAsset.metadataGEO.jsonLD, null, 2)}
                        </pre>
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(generatedAsset.metadataGEO.jsonLD), 'JSON-LD')}
                          style={{
                            marginTop: '10px',
                            padding: '9px 12px',
                            background: '#1d4ed8',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold',
                          }}
                        >
                          📋 Copiar al portapapeles
                        </button>
                      </div>

                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#18181b', marginBottom: '12px' }}>
                          Key Takeaways (para LLMs)
                        </h4>
                        <div style={{ display: 'grid', gap: '12px' }}>
                          {generatedAsset.metadataGEO.keyTakeaways.map((kt, idx) => (
                            <div key={idx} style={{ padding: '12px', background: '#f4f4f5', borderRadius: '4px', borderLeft: '3px solid #22c55e' }}>
                              <div style={{ fontWeight: 'bold', color: '#18181b', marginBottom: '4px' }}>
                                {idx + 1}. {kt.title}
                              </div>
                              <div style={{ fontSize: '13px', color: '#71717a' }}>
                                {kt.description}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlTowerBridges;
